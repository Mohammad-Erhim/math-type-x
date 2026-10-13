// Same keyboard session in the Arabic editor of the reference and of our build: MathML, caret and selection geometry.
// LANGUAGE=ar [URL=…] node tools/probe_rtl_edit.js out.json
const fs = require('fs');
const { open } = require('./lib');
const steps = [
  ['type', 'س+ص'], ['mml'], ['key', 'ArrowLeft'], ['key', 'ArrowLeft'], ['mml'],
  ['key', 'Shift+ArrowLeft'], ['mml'], ['key', 'Shift+ArrowLeft'], ['key', 'ArrowRight'], ['key', 'ArrowRight'],
  ['key', 'End'], ['key', 'Home'], ['type', '/'], ['type', '٣'], ['key', 'ArrowRight'], ['type', '٤'], ['mml'],
  ['key', 'ArrowDown'], ['key', 'ArrowUp'], ['key', 'Control+a'], ['mml'], ['key', 'Delete'], ['mml'],
  ['type', 'س'], ['key', 'Control+ArrowUp'], ['type', '٢'], ['key', 'ArrowRight'], ['key', 'ArrowRight'], ['type', '+'], ['type', '١'], ['mml'],
  ['key', 'ArrowLeft'], ['key', 'ArrowLeft'], ['key', 'ArrowLeft'], ['key', 'Backspace'], ['mml'],
];
(async () => {
  process.env.LANGUAGE = process.env.LANGUAGE || 'ar';
  const { b, p } = await open({ dsf: 1 });
  await p.evaluate(() => editor.setMathML('<math dir="rtl" xmlns="http://www.w3.org/1998/Math/MathML"/>'));
  await p.waitForTimeout(500);
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.mouse.click(bx.x + 400, bx.y + 300);
  await p.waitForTimeout(500);
  const out = [];
  const geom = () => p.evaluate(() => {
    const d = document.querySelector('#editorContainer .wrs_formulaDisplay');
    const db = d.getBoundingClientRect();
    const q = (s) => [...d.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left - db.left), Math.round(r.top - db.top), Math.round(r.width), Math.round(r.height)]; }).filter((r) => r[2] > 0);
    return { caret: q('.wrs_caret'), sel: q('.wrs_selection'), under: q('.wrs_underlineCaret') };
  });
  for (const s of steps) {
    if (s[0] === 'type') { for (const ch of [...s[1]]) { await p.keyboard.type(ch, { delay: 30 }); await p.waitForTimeout(80); } }
    else if (s[0] === 'key') await p.keyboard.press(s[1]);
    await p.waitForTimeout(350);
    const mml = (await p.evaluate(() => editor.getMathML())).replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '');
    out.push({ step: s.join(' '), mml: s[0] === 'mml' || s[0] === 'key' || s[0] === 'type' ? mml : undefined, geom: await geom() });
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
  await b.close();
})();
