// prints the DOM boxes of the reference formula display for MathML snippets given as arguments (or a default set)
const { open } = require('./lib');
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const sets = process.argv.slice(2).length ? process.argv.slice(2) : [
  '<mover><mi>x</mi><mo>&#xAF;</mo></mover>',
  '<mover><mi>v</mi><mo>&#x2192;</mo></mover>',
  '<mi>c</mi><mo>-</mo><mi>d</mi>',
  '<msubsup><mo>&#x222B;</mo><mn>0</mn><mn>1</mn></msubsup><mi>x</mi>',
  '<mfenced><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd></mtr><mtr><mtd><mn>3</mn></mtd><mtd><mn>4</mn></mtd></mtr></mtable></mfenced>',
];
(async () => {
  const { b, p } = await open({ dsf: 1 });
  for (const f of sets) {
    await p.evaluate((m) => editor.setMathML(m), `<math ${NS}>${f}</math>`);
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const d = document.querySelector('.wrs_formulaDisplay');
      const dr = d.getBoundingClientRect();
      const c = d.querySelector('.wrs_container');
      const out = [];
      if (!c) return out;
      for (const e of c.querySelectorAll('*')) {
        const r = e.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const cs = getComputedStyle(e);
        const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
        out.push([e.tagName.toLowerCase(), String(e.className).replace(/wrs_/g, ''), +(r.x - dr.x).toFixed(1), +(r.y - dr.y).toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1), own, cs.fontSize, cs.fontFamily.split(',')[0], cs.backgroundImage !== 'none' ? 'bg' : '', e.getAttribute('style') || '']);
      }
      return out;
    });
    console.log('== ' + f.slice(0, 80));
    r.forEach((x) => console.log(JSON.stringify(x)));
  }
  await b.close();
})();
