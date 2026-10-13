const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)));
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
  const M = `<math ${NS}><mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced></math>`;
  const setup = async () => {
    await p.evaluate((m) => editor.setMathML(m), M);
    await p.waitForTimeout(500);
    const bx = await p.locator('#editorContainer').boundingBox();
    await p.mouse.click(bx.x + 600, bx.y + 330);
    await p.waitForTimeout(200);
    await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft');
    await p.locator('#editorContainer .wrs_header button').nth(9).click();
    await p.waitForTimeout(400);
  };
  for (const sep of [',', '.', ';', ':', ' ']) {
    await setup();
    await p.locator('#editorContainer select[title="setSeparator"]').selectOption(sep);
    await p.waitForTimeout(400);
  }
  await setup();
  const info = await p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_toolbar button')].filter((e) => e.title === 'Baseline').map((e) => { const r = e.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return [r.x, r.y, r.width, r.height, top && (top.tagName + '.' + top.className), e.className, e.disabled]; }));
  console.log(JSON.stringify(info));
  try { await p.locator('#editorContainer button[title="Baseline"]:visible').first().click({ timeout: 5000 }); console.log('click ok'); } catch (e) { console.log('ERR', String(e).slice(0, 1200)); }
  await b.close();
})();
