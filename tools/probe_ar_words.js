// Which typed Arabic words does the reference merge into one <mi> (function names)? -> evidence/ref_ar_words.json
const fs = require('fs');
const { open } = require('./lib');
const words = (process.env.WORDS || '').split(',').filter(Boolean);
(async () => {
  const { b, p } = await open({ dsf: 1 });
  await p.evaluate(() => {
    const c = document.getElementById('editorContainer'); c.innerHTML = '';
    const ed = com.wiris.jsEditor.JsEditor.newInstance({ language: 'ar' }); ed.insertInto(c); window.editor = ed;
  });
  await p.waitForTimeout(2500);
  const box = await p.locator('#editorContainer').boundingBox();
  const out = {};
  for (const w of words) {
    let res = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      await p.evaluate(() => window.editor.setMathML('<math xmlns="http://www.w3.org/1998/Math/MathML"/>'));
      await p.waitForTimeout(300);
      await p.mouse.click(box.x + 360, box.y + 300);
      await p.waitForTimeout(450);
      for (const ch of [...w]) { await p.keyboard.type(ch, { delay: 25 }); await p.waitForTimeout(50); }
      await p.waitForTimeout(350);
      res = await p.evaluate(() => window.editor.getMathML());
      const n = (res.match(/&#x[0-9A-F]+;/gi) || []).length + (res.match(/[a-z]/g) || []).length;
      if (n >= [...w].length) break;
    }
    out[w] = res.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '');
  }
  fs.writeFileSync(process.env.OUTFILE || 'evidence/ref_ar_words.json', JSON.stringify(out, null, 1));
  await b.close();
})();
