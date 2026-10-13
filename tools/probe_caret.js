// caret rectangle after a key sequence (URL env = reference or ours); positions relative to #editorContainer
const { chromium } = require('playwright');
(async () => {
  const url = process.env.URL || 'http://localhost:8099/?output=0';
  const mml = process.argv[2];
  const seq = (process.argv[3] || '').split(',').filter(Boolean);
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 60000 });
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  await p.evaluate((m) => editor.setMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${m}</math>`), mml);
  await p.waitForTimeout(800);
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.mouse.click(bx.x + 600, bx.y + 330);
  await p.waitForTimeout(300);
  const read = async (label) => {
    const r = await p.evaluate(() => {
      const c = document.querySelector('#editorContainer').getBoundingClientRect();
      const out = [];
      document.querySelectorAll('#editorContainer .wrs_caret, #editorContainer .wrs_underlineCaret').forEach((e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        out.push([e.className.replace(/wrs_dark|wrs_light/g, '').trim(), Math.round((r.left - c.left) * 10) / 10, Math.round((r.top - c.top) * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10, cs.display, cs.visibility]);
      });
      return out;
    });
    console.log(label, JSON.stringify(r.filter((x) => x[5] !== 'none' && x[3] + x[4] > 0)));
  };
  await read('start');
  for (const k of seq) {
    const [key, n] = k.split('x');
    for (let i = 0; i < Number(n || 1); i++) await p.keyboard.press(key);
    await p.waitForTimeout(200);
    await read(k);
  }
  await b.close();
})();
