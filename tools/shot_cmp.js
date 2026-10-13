// formula crops of the editor canvas, reference vs ours: node tools/shot_cmp.js outdir '<mml>' […]  → outdir/N_ref.png, N_ours.png (see tools/shot_cmp.py)
const { chromium } = require('playwright');
(async () => {
  const [out, ...mmls] = process.argv.slice(2);
  const shots = [];
  for (const url of ['https://www.wiris.com/en/mathtype/', 'http://localhost:8099/?output=0']) {
    const b = await chromium.launch({ channel: 'chrome' });
    const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })).newPage();
    await p.goto(url, { waitUntil: 'load', timeout: 150000 });
    await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
    await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
    await p.waitForTimeout(2500);
    await p.locator('#editorContainer').scrollIntoViewIfNeeded();
    const list = [];
    for (const m of mmls) {
      await p.evaluate((x) => editor.setMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${x}</math>`), m);
      await p.waitForTimeout(1200);
      await p.mouse.click(5, 400);
      await p.waitForTimeout(300);
      const bx = await p.locator('#editorContainer').boundingBox();
      list.push(await p.screenshot({ clip: { x: bx.x, y: bx.y + 95, width: 160, height: 90 } }));
    }
    shots.push(list);
    await b.close();
  }
  const fs = require('fs');
  fs.mkdirSync(out, { recursive: true });
  shots.forEach((l, k) => l.forEach((b, i) => fs.writeFileSync(`${out}/${i}_${k ? 'ours' : 'ref'}.png`, b)));
})();
