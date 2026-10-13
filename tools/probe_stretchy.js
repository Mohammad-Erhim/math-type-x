// toggles the Stretchy control of an operator several times and prints the MathML (URL env: reference or ours)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'https://www.wiris.com/en/mathtype/', { waitUntil: 'load', timeout: 150000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  for (const [name, ch] of [['arrow', '&#x2192;'], ['bar', '|'], ['paren', '(']]) {
    await p.evaluate((m) => editor.setMathML(m), `<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi><mo>${ch}</mo><mi>b</mi></math>`);
    await p.waitForTimeout(1000);
    await p.locator('#editorContainer .wrs_header button').nth(9).click();
    const bx = await p.locator('#editorContainer').boundingBox();
    await p.mouse.click(bx.x + 600, bx.y + 330);
    await p.keyboard.press('Home'); await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(500);
    const seq = [];
    for (let i = 0; i < 4; i++) {
      await p.locator('#editorContainer .wrs_toolbar button[title="Stretchy"]:visible').first().click();
      await p.waitForTimeout(600);
      seq.push((await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]*"/, ''));
    }
    // undo / redo of the change and type after it
    console.log(name, JSON.stringify(seq, null, 1));
  }
  await b.close();
})();
