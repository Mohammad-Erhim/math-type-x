// selection highlight after 1..n Shift+ArrowRight from a caret position (URL env: reference or ours): contact sheet
// usage: node tools/shot_selseq.js outdir '<mml>' start n
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [out, mml, start, n] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
  await p.goto(process.env.URL || 'https://www.wiris.com/en/mathtype/', { waitUntil: 'load', timeout: 150000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  await p.evaluate((m) => editor.setMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${m}</math>`), mml);
  await p.waitForTimeout(1200);
  await p.locator('#editorContainer .wrs_header button').nth(9).click();
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.mouse.click(bx.x + 600, bx.y + 330);
  await p.keyboard.press('Home');
  for (let i = 0; i < +start; i++) await p.keyboard.press('ArrowRight');
  for (let i = 0; i <= +n; i++) {
    if (i) { await p.keyboard.press('Shift+ArrowRight'); await p.waitForTimeout(200); }
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${out}/${i}.png`, clip: { x: bx.x, y: bx.y - 30, width: 360, height: 235 } });
  }
  await b.close();
})();
