// DOM of the formula display of the reference for RTL formulas (leaves with fonts and positions)
const fs = require('fs');
const { open } = require('./lib');
const forms = JSON.parse(process.env.FORMS || '[]');
(async () => {
  process.env.LANGUAGE = process.env.LANGUAGE || 'ar';
  const { b, p } = await open({ dsf: 1 });
  const res = [];
  for (const f of forms) {
    await p.evaluate((m) => editor.setMathML(m), f);
    await p.waitForTimeout(500);
    await p.mouse.click(1, 1);
    res.push(await p.evaluate(() => {
      const c = document.querySelector('#editorContainer .wrs_formulaDisplay');
      const cb = c.getBoundingClientRect();
      const out = [];
      c.querySelectorAll('*').forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;
        const cs = getComputedStyle(e);
        const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
        out.push({ tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 60), text: own, x: +(r.left - cb.left).toFixed(1), y: +(r.top - cb.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), ff: own ? cs.fontFamily.slice(0, 50) : '', fs: own ? cs.fontSize : '', tr: cs.transform !== 'none' ? cs.transform : '', dir: cs.direction === 'rtl' ? 'rtl' : '' });
      });
      return out;
    }));
  }
  fs.writeFileSync(process.env.OUT || 'rtl_dom.json', JSON.stringify(res, null, 1));
  await b.close();
})();
