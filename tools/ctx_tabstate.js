// which tab is selected / enabled while the caret enters and leaves contextual places
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8099/?output=0&layout=classic';
const REF = URL.includes('wiris.com');
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: REF ? { width: 1920, height: 1080 } : { width: 760, height: 450 } })).newPage();
  await p.goto(URL, { waitUntil: 'load', timeout: 90000 });
  if (REF) await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(2000);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const bx = await p.locator('#editorContainer').boundingBox();
  const state = () => p.evaluate(() => {
    const hs = [...document.querySelectorAll('#editorContainer .wrs_header button')];
    return hs.map((h, i) => (h.className.match(/wrs_selected|wrs_disabled/g) || []).map((c) => c.replace('wrs_', '')[0] + i).join('')).filter(Boolean).join(' ');
  });
  await p.evaluate((m) => editor.setMathML(m), `<math ${NS}><mi>a</mi><mo>+</mo><mi>b</mi></math>`);
  await p.waitForTimeout(800);
  await p.mouse.click(bx.x + 600, bx.y + 330);
  await p.keyboard.press('Home');
  const log = [];
  log.push('start (Home): ' + await state());
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
  log.push('after a (op spacing available): ' + await state());
  await p.evaluate(() => (typeof editor.selectTab === 'function' ? editor.selectTab(9) : document.querySelectorAll('#editorContainer .wrs_header button')[9].click()));
  await p.waitForTimeout(300);
  log.push('selected contextual tab: ' + await state());
  await p.mouse.click(bx.x + 600, bx.y + 330); await p.keyboard.press('Home'); await p.waitForTimeout(300);
  log.push('caret to Home (no context): ' + await state());
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
  log.push('caret back at the op: ' + await state());
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
  log.push('caret at the end: ' + await state());
  console.log(log.join('\n'));
  await b.close();
})();
