// screenshot of the editor canvas for one MathML (URL env: reference or ours), plus the MathML after a round trip
// usage: URL=... node tools/shot_mml.js out.png '<mi>x</mi>' [keys...]
const { chromium } = require('playwright');
(async () => {
  const [out, mml, ...keys] = process.argv.slice(2);
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
  await p.goto(process.env.URL || 'https://www.wiris.com/en/mathtype/', { waitUntil: 'load', timeout: 150000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  await p.evaluate((m) => editor.setMathML(m), `<math xmlns="http://www.w3.org/1998/Math/MathML">${mml}</math>`);
  await p.waitForTimeout(1200);
  if (process.env.TAB) await p.locator('#editorContainer .wrs_header button').nth(+process.env.TAB).click();
  const bx = await p.locator('#editorContainer').boundingBox();
  if (keys.length) {
    await p.mouse.click(bx.x + 600, bx.y + 330);
    for (const k of keys) { await p.keyboard.press(k); await p.waitForTimeout(150); }
    await p.waitForTimeout(500);
  }
  console.log((await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]*"/, ''));
  await p.screenshot({ path: out, clip: { x: bx.x, y: bx.y - 30, width: Math.min(bx.width, 725), height: 260 } });
  await b.close();
})();
