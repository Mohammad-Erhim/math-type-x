const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load', timeout: 120000 }); await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
  await p.evaluate((m) => editor.setMathML(m), `<math ${NS}><mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced></math>`);
  await p.waitForTimeout(500);
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.waitForTimeout(3000);
  await p.mouse.click(bx.x + 600, bx.y + 330);
  await p.waitForTimeout(300);
  for (let i = 0; i < Number(process.env.LEFT || 2); i++) await p.keyboard.press('ArrowLeft');
  await p.locator('#editorContainer .wrs_header button').nth(9).click();
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => {
    const out = [];
    for (const t of ['Baseline', 'Middle', 'Middle-baseline', 'Align with axis']) {
      const e = document.querySelector(`#editorContainer button[title="${t}"]`);
      if (!e) { out.push([t, 'missing']); continue; }
      const r = e.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      out.push([t, [r.x | 0, r.y | 0, r.width | 0, r.height | 0], top === e || e.contains(top) ? 'ok' : (top && (top.tagName + '.' + String(top.className).slice(0, 40)))]);
    }
    return out;
  });
  console.log(JSON.stringify(info));
  await p.screenshot({ path: '' + (process.env.OUTP || '/tmp/ctx_matrix.png') + '', clip: { x: bx.x, y: bx.y, width: 725, height: 200 } });
  await b.close();
})();
