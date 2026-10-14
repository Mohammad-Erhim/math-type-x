const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const [name, o] of [['desk', { viewport: { width: 1280, height: 900 } }], ['phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]]) {
    const ctx = await b.newContext(o); const p = await ctx.newPage();
    await p.goto('http://localhost:8099/', { waitUntil: 'load' });
    await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
    await p.waitForTimeout(1000);
    await p.evaluate(() => editor.setMathML('<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi><mo>+</mo><mi>b</mi></math>'));
    await p.waitForTimeout(500);
    await p.screenshot({ path: `/home/ubuntu/Desktop/projects/math-type-x/.cache/clip_${name}.png`, fullPage: true });
  }
  await b.close();
})();
