const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
  const mml = process.argv[2] || `<math ${NS}><mfenced open="{" close=""><mtable columnalign="left"><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr></mtable></mfenced></math>`;
  await p.evaluate((m) => editor.setMathML(m), mml);
  await p.waitForTimeout(600);
  const bx = await p.locator('#editorContainer').boundingBox();
  for (const [dx, dy] of [[600, 330], [300, 300], [60, 200]]) {
    await p.evaluate((m) => editor.setMathML(m), mml);
    await p.waitForTimeout(400);
    await p.mouse.click(bx.x + dx, bx.y + dy);
    await p.waitForTimeout(300);
    await p.locator('#editorContainer .wrs_header button').nth(9).click();
    await p.waitForTimeout(300);
    const t = await p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_toolbar button, #editorContainer .wrs_toolbar select')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.wrs_header'); }).map((e) => e.title || e.getAttribute('aria-label')).slice(0, 8));
    console.log(dx, dy, JSON.stringify(t));
  }
  await b.close();
})();
