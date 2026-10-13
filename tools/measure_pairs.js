const fs = require('fs');
const { open } = require('./lib');
const T = [
  ['mi', '', 'a'], ['mn', '', '1'], ['mo', '', '+'], ['mo', '', '='], ['mo', '', ','], ['mo', '', '('], ['mo', '', ')'], ['mo', '', '!'], ['mo', '', '×'], ['mo', '', '→'], ['mo', '', '≤'], ['mo', '', '-'], ['mo', '', '/'], ['mo', '', '.'], ['mi', '', 'α'], ['mo', '', ' '],
];
const esc = (s) => [...s].map((c) => { const cp = c.codePointAt(0); return cp > 126 ? '&#x' + cp.toString(16).toUpperCase() + ';' : c === '<' ? '&lt;' : c; }).join('');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const pairs = [];
  T.forEach((a) => T.forEach((c) => pairs.push([a, c])));
  const mml = '<math xmlns="http://www.w3.org/1998/Math/MathML">' + pairs.map(([a, c]) => `<${a[0]}>${esc(a[2])}</${a[0]}><${c[0]}>${esc(c[2])}</${c[0]}><mi>z</mi>`).join('') + '</math>';
  await p.evaluate((m) => editor.setMathML(m), mml);
  await p.waitForTimeout(1500);
  const spans = await p.evaluate(() => {
    const fd = document.querySelector('#editorContainer .wrs_formulaDisplay');
    const res = [];
    fd.querySelectorAll('span').forEach((e) => {
      if (e.children.length || !e.textContent || e.closest('.wrs_fontContainer, .wrs_metrics, .wrs_ariaLiveRegion')) return;
      const r = e.getBoundingClientRect();
      res.push({ t: e.textContent, x: r.x, w: r.width, left: e.style.left });
    });
    return res;
  });
  const out = {};
  let idx = 0;
  for (const [a, c] of pairs) {
    const s1 = spans[idx], s2 = spans[idx + 1], s3 = spans[idx + 2];
    if (!s1 || !s2 || !s3) break;
    out[`${a[0]}:${a[2]}|${c[0]}:${c[2]}`] = { l1: s1.left, l2: s2.left, w1: s1.w, w2: s2.w, gap: parseFloat(s2.left) - parseFloat(s1.left) - Math.round(s1.w) };
    idx += 3;
  }
  fs.writeFileSync('../evidence/measure_pairs.json', JSON.stringify(out));
  console.log(Object.keys(out).length, 'spans', spans.length);
  await b.close();
})();
