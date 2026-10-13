const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  await p.evaluate((m) => editor.setMathML(m), '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mi>a</mi><mn>1</mn></mrow><mi>b</mi></mfrac></math>');
  await p.waitForTimeout(800);
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.screenshot({ path: process.env.OUTP, clip: { x: bx.x, y: bx.y + 80, width: 200, height: 120 } });
  const r = await p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_formulaDisplay *')].slice(0, 12).map((e) => [e.tagName, e.className, Math.round(e.getBoundingClientRect().x), Math.round(e.getBoundingClientRect().y), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]));
  console.log(bx.y, JSON.stringify(r));
  await b.close();
})();
