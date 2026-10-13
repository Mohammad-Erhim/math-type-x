const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  const box = async () => p.locator('#editorContainer').boundingBox();
  let bx = await box();
  await p.mouse.click(bx.x + 300, bx.y + 150);
  await p.keyboard.press('Control+/');
  await p.keyboard.type('a'); await p.keyboard.press('ArrowDown'); await p.keyboard.type('b');
  await p.waitForTimeout(500);
  bx = await box();
  await p.mouse.click(bx.x + 18, bx.y + 118); await p.keyboard.type('1'); await p.waitForTimeout(300);
  console.log('after num', await p.evaluate(() => editor.getMathML()));
  bx = await box();
  const ys = (process.env.YS || '150').split(',').map(Number);
  for (const y of ys) {
    await p.mouse.click(bx.x + 18, bx.y + y); await p.keyboard.type('2'); await p.waitForTimeout(300);
    console.log(y, (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]+"/, ''));
    await p.keyboard.press('Backspace');
  }
  await b.close();
})();
