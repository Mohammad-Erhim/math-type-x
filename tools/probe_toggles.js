const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  await p.evaluate((m) => editor.setMathML(m), process.env.MML);
  await p.waitForTimeout(800);
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.mouse.click(bx.x + 600, bx.y + 330);
  for (let i = 0; i < Number(process.env.LEFT || 0); i++) await p.keyboard.press('ArrowLeft');
  await p.locator('#editorContainer .wrs_header button').nth(9).click();
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_toolbar button')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.wrs_header'); }).map((e) => (/toggled/.test(e.className) ? '[T] ' : '') + e.title));
  console.log(r.join(' | '));
  await b.close();
})();
