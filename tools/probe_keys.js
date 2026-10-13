// runs key programs on the editor (URL env: reference or ours) and prints the MathML after each
const { chromium } = require('playwright');
(async () => {
  const progs = JSON.parse(process.argv[2]);
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 60000 });
  for (const prog of progs) {
    await p.evaluate(() => editor.setMathML('<math xmlns="http://www.w3.org/1998/Math/MathML"/>'));
    await p.waitForTimeout(500);
    const bx = await p.locator('#editorContainer').boundingBox();
    await p.mouse.click(bx.x + 600, bx.y + 330);
    await p.waitForTimeout(200);
    for (const st of prog) {
      if (st.btn) await p.locator(`#editorContainer button[title="${st.btn}"]:visible`).first().click({ force: true });
      else if (st.type !== undefined) await p.keyboard.type(st.type);
      else if (st.key) await p.keyboard.press(st.key);
      else if (st.tab !== undefined) await p.locator('#editorContainer .wrs_header button').nth(st.tab).click();
      await p.waitForTimeout(250);
    }
    await p.waitForTimeout(400);
    console.log(JSON.stringify(prog).slice(0, 110), '=>', (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]+"/, ''));
  }
  await b.close();
})();
