// for a MathML: Home + n × ArrowRight then type Z, for n = 0..N → MathML (URL env: reference or ours)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
  const N = Number(process.env.N || 6);
  const key = process.env.KEY || 'ArrowRight';
  for (let n = 0; n <= N; n++) {
    await p.evaluate((m) => editor.setMathML(m), `<math ${NS}>${process.argv[2]}</math>`);
    await p.waitForTimeout(500);
    const bx = await p.locator('#editorContainer').boundingBox();
    await p.mouse.click(bx.x + 600, bx.y + 330);
    await p.waitForTimeout(150);
    await p.keyboard.press(key === 'ArrowRight' ? 'Home' : 'End');
    for (let i = 0; i < n; i++) { await p.keyboard.press(key); await p.waitForTimeout(40); }
    await p.keyboard.type('Z');
    await p.waitForTimeout(300);
    console.log(n, (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]+"/, ''));
  }
  await b.close();
})();
