// ink bounding box and ink amount of many formulas on the canvas (URL env: reference or ours)
// usage: CASES=file.json OUT=file.json node tools/ink_batch.js     cases: [{id, mml}]
const fs = require('fs');
const { chromium } = require('playwright');
let PNG = null;
try { PNG = require('pngjs').PNG; } catch (e) { /* decoded with the canvas of the page instead */ }
(async () => {
  const cases = JSON.parse(fs.readFileSync(process.env.CASES, 'utf8'));
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
  await p.goto(process.env.URL || 'https://www.wiris.com/en/mathtype/', { waitUntil: 'load', timeout: 150000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important} .wrs_caret,.wrs_underlineCaret,.wrs_inverseCaret{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const bx = await p.locator('#editorContainer').boundingBox();
  const out = {};
  const WAIT = +(process.env.WAIT || 700);
  for (const c of cases) {
    try {
      await p.evaluate((m) => editor.setMathML(m), c.mml.includes('xmlns') ? c.mml : c.mml.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"'));
      await p.waitForTimeout(WAIT);
      const png = await p.screenshot({ clip: { x: bx.x + 4, y: bx.y + 95, width: 620, height: 200 } });
      // decode through the page: draw into a canvas and read the pixels
      const data = await p.evaluate(async (b64) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        const cv = document.createElement('canvas');
        cv.width = img.width; cv.height = img.height;
        const cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0);
        const d = cx.getImageData(0, 0, cv.width, cv.height).data;
        let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
        for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
          const i = (y * cv.width + x) * 4;
          if (d[i] + d[i + 1] + d[i + 2] < 330) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        return [x0, y0, x1, y1, n];
      }, png.toString('base64'));
      out[c.id] = data;
    } catch (e) { out[c.id] = String(e).slice(0, 80); }
  }
  fs.writeFileSync(process.env.OUT, JSON.stringify(out));
  await b.close();
})();
