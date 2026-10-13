// Advance widths (em fractions) of the Arabic blocks in the platform sans-serif, measured in a browser:
// node tools/gen/ar_widths.js -> src/data/ar-widths.json   (fallback of the runtime measurement, see src/layout/metrics.ts)
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage();
  await p.setContent('<canvas id=c></canvas>');
  const w = await p.evaluate(() => {
    const cv = document.getElementById('c').getContext('2d');
    cv.font = "100px Arial,'Liberation Sans',Helvetica,sans-serif";
    const out = {};
    const add = (a, z) => {
      for (let c = a; c <= z; c++) {
        const ch = String.fromCodePoint(c);
        if (!/[\p{L}\p{M}\p{Nd}\p{P}]/u.test(ch)) continue;
        out[c.toString(16)] = Math.round(cv.measureText(ch).width) / 100;
      }
    };
    add(0x600, 0x6ff); add(0x750, 0x77f); add(0x8a0, 0x8ff);
    return out;
  });
  fs.writeFileSync('src/data/ar-widths.json', JSON.stringify(w));
  console.log(Object.keys(w).length, 'characters');
  await b.close();
})();
