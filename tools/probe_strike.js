const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  const M = process.env.MML || '<math xmlns="http://www.w3.org/1998/Math/MathML"><mstack charalign="center" charspacing="15px" stackalign="right"><mn>12</mn><mn>34</mn><msrow/><msline/><mscarries location="se"/><msrow><mn>5</mn><none/><mn>6</mn></msrow><msrow><mo>+</mo><maction actiontype="argument"><mrow/></maction><none/></msrow><msline/><msrow/></mstack></math>';
  for (const n of (process.env.LEFTS || '1').split(',').map(Number)) {
    for (const sel of [1, 0]) {
      await p.evaluate((m) => editor.setMathML(m), M);
      await p.waitForTimeout(500);
      await p.locator('#editorContainer').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
      const bx = await p.locator('#editorContainer').boundingBox();
      await p.mouse.click(bx.x + 600, bx.y + 330);
      await p.waitForTimeout(250);
      for (let i = 0; i < n; i++) await p.keyboard.press('ArrowLeft');
      if (sel) await p.keyboard.press('Shift+ArrowLeft');
      await p.locator('#editorContainer .wrs_header button').nth(9).click();
      await p.waitForTimeout(400);
      const t = process.env.CTRL || 'Up diagonal strike';
      const btn = p.locator(`#editorContainer button[title="${t}"]:visible`).first();
      if (!(await btn.count())) { console.log(n, sel, 'NO BUTTON'); continue; }
      await btn.click({ force: true });
      await p.waitForTimeout(400);
      console.log('lefts', n, 'shift', sel, (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]+"/, ''));
    }
  }
  await b.close();
})();
