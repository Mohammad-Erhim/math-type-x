const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })).newPage();
  await p.goto(process.env.URL, { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.mouse.click(bx.x + 300, bx.y + 250);
  for (const k of (process.env.KEYS || '').split('|')) { if (k.startsWith('T:')) await p.keyboard.type(k.slice(2), { delay: 40 }); else await p.keyboard.press(k); await p.waitForTimeout(120); }
  await p.waitForTimeout(500);
  const bb = await p.locator('#editorContainer').boundingBox();
  await p.screenshot({ path: process.env.OUTP, clip: { x: bb.x, y: bb.y + 95, width: 200, height: 110 } });
  await b.close();
})();
