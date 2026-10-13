// Token kind (mi / mo / mn / mtext …) the reference gives to typed characters of the Arabic blocks.
// node tools/probe_ar_classify.js  -> evidence/ref_ar_classify.json  { "<codepoint hex>": "mi|mo|mn…[+attrs]" }
const fs = require('fs');
const { open } = require('./lib');
const ranges = [[0x600, 0x6ff], [0x750, 0x77f], [0x8a0, 0x8ff], [0xfb50, 0xfdff], [0xfe70, 0xfeff], [0x1ee00, 0x1eeff]];
const cps = [];
for (const [a, b] of ranges) for (let c = a; c <= b; c++) {
  const ch = String.fromCodePoint(c);
  if (/[\p{L}\p{M}\p{P}\p{S}\p{N}\p{Cf}]/u.test(ch)) cps.push(c);
}
(async () => {
  const { b, p } = await open({ dsf: 1 });
  await p.evaluate(() => {
    const c = document.getElementById('editorContainer'); c.innerHTML = '';
    const ed = com.wiris.jsEditor.JsEditor.newInstance({ language: 'ar' }); ed.insertInto(c); window.editor = ed;
  });
  await p.waitForTimeout(2500);
  const box = await p.locator('#editorContainer').boundingBox();
  const out = fs.existsSync('evidence/ref_ar_classify.json') ? JSON.parse(fs.readFileSync('evidence/ref_ar_classify.json', 'utf8')) : {};
  const todo = cps.filter((c) => !(c.toString(16) in out));
  console.log('chars', cps.length, 'todo', todo.length);
  const dec = (s) => s.replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  const B = 24;
  for (let i = 0; i < todo.length; i += B) {
    const batch = todo.slice(i, i + B);
    let toks = null;
    for (let attempt = 0; attempt < 3 && !toks; attempt++) {
      await p.evaluate(() => window.editor.setMathML('<math dir="rtl" xmlns="http://www.w3.org/1998/Math/MathML"/>'));
      await p.waitForTimeout(250);
      await p.mouse.click(box.x + 360, box.y + 300);
      await p.waitForTimeout(450);
      await p.keyboard.type('x', { delay: 30 });
      for (const c of batch) { await p.keyboard.type(String.fromCodePoint(c), { delay: 20 }); await p.waitForTimeout(35); }
      await p.waitForTimeout(300);
      const m = await p.evaluate(() => window.editor.getMathML());
      const re = /<(mi|mo|mn|mtext|mspace)((?:\s[^>]*)?)>([^<]*)<\/\1>/g;
      const t = []; let r;
      while ((r = re.exec(m))) t.push({ tag: r[1], attrs: r[2].trim(), text: dec(r[3]) });
      // 'x' first, then one token per char (digits of one run merge into one mn)
      const flat = t.slice(1);
      if (t[0] && t[0].text === 'x' && flat.map((e) => e.text).join('') === batch.map((c) => String.fromCodePoint(c)).join('')) toks = flat;
      else console.log('retry batch', i, (flat.map((e) => e.text).join('')).length, batch.length);
    }
    if (!toks) continue;
    // assign tokens to chars (a token holding several chars = merged run: assign the same kind to each)
    let k = 0;
    for (const t of toks) {
      for (const ch of [...t.text]) { out[ch.codePointAt(0).toString(16)] = t.tag + (t.attrs ? ' ' + t.attrs : '') + ([...t.text].length > 1 ? ' *' : ''); k++; }
    }
    fs.writeFileSync('evidence/ref_ar_classify.json', JSON.stringify(out));
  }
  console.log('done', Object.keys(out).length);
  await b.close();
})();
