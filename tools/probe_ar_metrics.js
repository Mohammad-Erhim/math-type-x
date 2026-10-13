// Width of Arabic characters as laid out by the reference (language ar) vs the browser's own measurement.
const fs = require('fs');
const { open } = require('./lib');
(async () => {
  process.env.LANGUAGE = process.env.LANGUAGE || 'ar';
  const { b, p } = await open({ dsf: 1 });
  const chars = [...'سصعكلمنهويابتثجحخدذرزشضطظغفقءآأإؤئةى٠١٢٣٤٥٦٧٨٩٫٪،؛؟abxyz0123+=']; 
  const out = {};
  for (const ch of chars) {
    const tag = /[0-9٠-٩]/.test(ch) ? 'mn' : /[+=]/.test(ch) ? 'mo' : 'mi';
    await p.evaluate(([t, c]) => editor.setMathML(`<math dir="rtl" xmlns="http://www.w3.org/1998/Math/MathML"><${t}>${c}</${t}></math>`), [tag, ch]);
    await p.waitForTimeout(250);
    out[ch] = await p.evaluate((c) => {
      const f = document.querySelector('#editorContainer .wrs_formulaDisplay') || document.querySelector('#editorContainer');
      const leaves = [];
      f.querySelectorAll('span,text').forEach((e) => {
        if (e.children.length) return;
        if ((e.textContent || '').trim() !== c) return;
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        leaves.push({ w: r.width, h: r.height, font: cs.font, ff: cs.fontFamily, fs: cs.fontSize, fst: cs.fontStyle });
      });
      const l = leaves[0];
      let m = null;
      if (l) { const cv = document.createElement('canvas').getContext('2d'); cv.font = l.fst + ' ' + l.fs + ' ' + l.ff; m = cv.measureText(c).width; }
      return { l, m };
    }, ch);
  }
  fs.writeFileSync('evidence/ref_ar_metrics.json', JSON.stringify(out, null, 1));
  const first = Object.entries(out).slice(0, 12).map(([c, v]) => c + ' ' + (v.l ? v.l.w.toFixed(2) : '-') + ' / ' + (v.m ? v.m.toFixed(2) : '-') + ' ' + (v.l ? v.l.ff.slice(0, 40) : ''));
  console.log(first.join('\n'));
  await b.close();
})();
