// Which characters does the reference mirror in right-to-left formulas?  -> evidence/ref_rtl_mirror.json
const fs = require('fs');
const { open } = require('./lib');
(async () => {
  process.env.LANGUAGE = process.env.LANGUAGE || 'ar';
  const { b, p } = await open({ dsf: 1 });
  const cps = [];
  for (let c = 0x20; c <= 0x2fff; c++) { const ch = String.fromCodePoint(c); if (/\p{Bidi_M}/u.test(ch)) cps.push(c); }
  for (const c of [0x2264, 0x2265, 0x221a, 0x222b, 0x2211, 0x220f, 0x2192, 0x2190, 0x21d2, 0x21d0, 0x2200, 0x2203, 0x00ac, 0x2282, 0x2283, 0x2208, 0x220b, 0x223c, 0x2248]) if (!cps.includes(c)) cps.push(c);
  const out = {};
  const B = 40;
  for (let i = 0; i < cps.length; i += B) {
    const part = cps.slice(i, i + B);
    const esc = (c) => (c === 0x26 ? '&amp;' : c === 0x3c ? '&lt;' : c === 0x3e ? '&gt;' : String.fromCodePoint(c));
    const mml = `<math dir="rtl" xmlns="http://www.w3.org/1998/Math/MathML">${part.map((c) => `<mo>${esc(c)}</mo><mi>a</mi>`).join('')}</math>`;
    await p.evaluate((m) => editor.setMathML(m), mml);
    await p.waitForTimeout(700);
    const leaves = await p.evaluate(() => {
      const c = document.querySelector('#editorContainer .wrs_formulaDisplay');
      const r = [];
      c.querySelectorAll('span').forEach((e) => {
        if (e.children.length) return;
        const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
        const rc = e.getBoundingClientRect();
        if (!t || rc.width <= 0 || rc.top < 0) return;
        const cs = getComputedStyle(e);
        r.push([t, cs.fontFamily.slice(0, 24), +rc.left.toFixed(1), +rc.width.toFixed(1)]);
      });
      return r;
    });
    // leaves alternate: op, a, op, a …  (in visual order from the right: sort by x descending)
    leaves.sort((x, y) => y[2] - x[2]);
    const ops = leaves.filter((l) => l[0] !== 'a');
    part.forEach((c, k) => { out[c.toString(16)] = ops[k] ? [ops[k][0], ops[k][1]] : null; });
    console.log(i, leaves.length, ops.length, part.length);
  }
  fs.writeFileSync('evidence/ref_rtl_mirror.json', JSON.stringify(out));
  await b.close();
})();
