const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  for (const [x, y] of [[600, 330], [300, 300], [100, 200], [60, 118]]) {
    await p.evaluate((m) => editor.setMathML(m), process.env.MML);
    await p.waitForTimeout(600);
    const bx = await p.locator('#editorContainer').boundingBox();
    await p.mouse.click(bx.x + x, bx.y + y);
    await p.keyboard.type('Z');
    await p.waitForTimeout(300);
    console.log(x, y, (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]+"/, '').slice(0, 900));
  }
  await b.close();
})();
