// UX probe: after using a contextual control the caret must stay where it was and typing must continue there.
//   URL=… node tools/ctx_focus.js
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8099/?output=0&layout=classic';
const REF = URL.includes('wiris.com');
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const T = [
  { name: 'sel open bracket', mml: '<mfenced><mi>a</mi></mfenced>', steps: 1, sel: ['setOpenBracket', '['] },
  { name: 'button valign middle', mml: '<mfrac><mi>a</mi><mi>b</mi></mfrac>', steps: 0, btn: 'Middle' },
  { name: 'matrix insert row below', mml: '<mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced>', steps: 2, btn: 'Insert row below' },
  { name: 'matrix remove row', mml: '<mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced>', steps: 2, btn: 'Remove row' },
  { name: 'op left spacing 1em', mml: '<mi>a</mi><mo>+</mo><mi>b</mi>', steps: 1, len: ['Left spacing', '1em'] },
  { name: 'stretchy', mml: '<mover><mo>&#x2192;</mo><mi>f</mi></mover>', steps: 1, btn: 'Stretchy' },
];
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: REF ? { width: 1920, height: 1080 } : { width: 760, height: 450 } })).newPage();
  await p.goto(URL, { waitUntil: 'load', timeout: 90000 });
  if (REF) await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(2000);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const bx = await p.locator('#editorContainer').boundingBox();
  const selTab = () => p.evaluate(() => (typeof editor.selectTab === 'function' ? editor.selectTab(9) : document.querySelectorAll('#editorContainer .wrs_header button')[9].click()));
  for (const t of T) {
    await p.keyboard.press('Escape').catch(() => {});
    await p.evaluate((m) => editor.setMathML(m), `<math ${NS}>${t.mml}</math>`);
    await p.waitForTimeout(800);
    await selTab();
    await p.mouse.click(bx.x + 600, bx.y + 330);
    await p.keyboard.press('Home');
    for (let i = 0; i < t.steps; i++) await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(400);
    const m0 = (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]*"/, '');
    try {
      if (t.sel) await p.locator(`#editorContainer select[title="${t.sel[0]}"]:visible`).first().selectOption(t.sel[1]);
      else if (t.btn) await p.locator(`#editorContainer .wrs_toolbar button[title="${t.btn}"]:visible`).first().click();
      else if (t.len) {
        await p.locator(`#editorContainer .wrs_toolbar button[title="${t.len[0]}"]:visible`).first().click();
        await p.waitForTimeout(200);
        await p.locator('.wrs_lengthButtonPanel:visible input').first().fill(t.len[1]);
        await p.keyboard.press('Enter');
      }
      await p.waitForTimeout(500);
      const m1 = (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]*"/, '');
      const active = await p.evaluate(() => { const a = document.activeElement; return a ? a.tagName + '.' + (a.className || '').toString().slice(0, 30) : null; });
      await p.keyboard.type('q', { delay: 30 });
      await p.waitForTimeout(400);
      const m2 = (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]*"/, '');
      console.log(`${t.name}\n  focus: ${active}\n  before: ${m0}\n  after:  ${m1}\n  typed q: ${m2}\n`);
    } catch (e) { console.log(t.name, 'ERR', String(e).slice(0, 100)); }
  }
  await b.close();
})();
