const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.mouse.click(bx.x + 300, bx.y + 250);
  await p.keyboard.type('12+x');
  const out = [];
  for (let i = 0; i < 14; i++) {
    out.push(await p.evaluate(() => ['.wrs_caret', '.wrs_underlineCaret'].map((s) => { const e = document.querySelector('#editorContainer ' + s); const cs = getComputedStyle(e); return e.className.replace('wrs_underlineCaret','UL').replace('wrs_caret','C') + ':' + cs.visibility + '/' + cs.borderLeftColor + '/' + cs.borderBottomColor + '/' + cs.opacity; }).join(' ')));
    await p.waitForTimeout(150);
  }
  console.log(out.join('\n'));
  await b.close();
})();
