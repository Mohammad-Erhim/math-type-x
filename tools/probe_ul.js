const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 3 })).newPage();
  await p.goto(process.env.URL, { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  await p.evaluate((m) => editor.setMathML(m), '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mfrac><mi>a</mi><mi>b</mi></mfrac><mi>y</mi></math>');
  await p.waitForTimeout(800);
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.mouse.click(bx.x + 600, bx.y + 330);
  await p.keyboard.press('Home'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(300);
  const st = await p.evaluate(() => [...document.querySelectorAll('.wrs_underlineCaret, .wrs_inverseCaret, .wrs_caret')].map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return [e.className, cs.borderBottom, cs.borderTop, cs.borderLeft, cs.opacity, cs.display, cs.backgroundColor, r.width, r.height]; }));
  console.log(JSON.stringify(st));
  await p.screenshot({ path: process.env.OUTP, clip: { x: bx.x, y: bx.y + 90, width: 120, height: 100 } });
  await b.close();
})();
