// UX flows of the contextual tab on OUR build: panel state after undo / redo, Escape, outside click, reopening a length field
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8099/?output=0&layout=classic';
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 760, height: 450 } })).newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  await p.waitForTimeout(600);
  const bx = await p.locator('#editorContainer').boundingBox();
  const mml = async () => (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]*"/, '');
  const state = () => p.evaluate(() => {
    const out = {};
    for (const e of document.querySelectorAll('#editorContainer .wrs_toolbar button[title], #editorContainer .wrs_toolbar select[title]')) {
      const r = e.getBoundingClientRect();
      if (!r.width || e.closest('.wrs_header')) continue;
      out[e.title] = e.tagName === 'SELECT' ? e.value : /wrs_toggled|wrs_pressed/.test(e.className) ? 'ON' : 'off';
    }
    return out;
  });
  const diff = (a, c) => Object.keys({ ...a, ...c }).filter((k) => a[k] !== c[k]).map((k) => `${k}: ${a[k]} → ${c[k]}`);
  const open = async (m, steps) => {
    await p.evaluate((x) => editor.setMathML(x), `<math ${NS}>${m}</math>`);
    await p.waitForTimeout(300);
    await p.evaluate(() => editor.selectTab(9));
    await p.mouse.click(bx.x + 400, bx.y + 250);
    await p.keyboard.press('Home');
    for (let i = 0; i < steps; i++) await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(250);
  };
  const log = (...a) => console.log(...a);

  // 1. toggle state after Undo / Redo
  await open('<mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable>', 2);
  const s0 = await state();
  await p.locator('#editorContainer .wrs_toolbar button[title="Insert frame"]:visible').first().click();
  await p.waitForTimeout(300);
  const s1 = await state();
  log('1a frame inserted: toolbar changes', diff(s0, s1));
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(300);
  const s2 = await state();
  log('1b after Undo: MathML', (await mml()).includes('frame'), 'toolbar differs from before the change:', diff(s0, s2));
  await p.keyboard.press('Control+y');
  await p.waitForTimeout(300);
  const s3 = await state();
  log('1c after Redo: MathML has frame', (await mml()).includes('frame'), 'toolbar differs from after the change:', diff(s1, s3));

  // 2. length field: reopen shows the value, Escape closes, outside click closes
  await open('<mi>a</mi><mo>+</mo><mi>b</mi>', 1);
  await p.locator('#editorContainer .wrs_toolbar button[title="Left spacing"]:visible').first().click();
  await p.waitForTimeout(200);
  await p.locator('.wrs_lengthButtonPanel input').fill('1.5em');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  log('2a spacing written:', await mml(), '| panel open:', await p.locator('.wrs_lengthButtonPanel:visible').count());
  await p.locator('#editorContainer .wrs_toolbar button[title="Left spacing"]:visible').first().click();
  await p.waitForTimeout(200);
  log('2b reopened value:', await p.locator('.wrs_lengthButtonPanel input').inputValue());
  await p.keyboard.press('Escape');
  await p.waitForTimeout(150);
  log('2c Escape: panel open', await p.locator('.wrs_lengthButtonPanel:visible').count(), 'focus', await p.evaluate(() => document.activeElement.tagName + '.' + document.activeElement.className.slice(0, 20)));
  await p.locator('#editorContainer .wrs_toolbar button[title="Left spacing"]:visible').first().click();
  await p.waitForTimeout(150);
  await p.mouse.click(bx.x + 300, bx.y + 300);
  await p.waitForTimeout(200);
  log('2d click in the editor: panel open', await p.locator('.wrs_lengthButtonPanel:visible').count());
  await open('<mi>a</mi><mo>+</mo><mi>b</mi>', 1);
  // clicking the same button again toggles?
  await p.locator('#editorContainer .wrs_toolbar button[title="Left spacing"]:visible').first().click();
  await p.waitForTimeout(150);
  await p.locator('#editorContainer .wrs_toolbar button[title="Left spacing"]:visible').first().click();
  await p.waitForTimeout(150);
  log('2e second click on the same button: panel open', await p.locator('.wrs_lengthButtonPanel:visible').count());
  await p.keyboard.press('Escape');

  // 3. moving the caret away while the length panel is open (Tab / Shift+Tab) and the panel with another control
  await p.locator('#editorContainer .wrs_toolbar button[title="Right spacing"]:visible').first().click();
  await p.waitForTimeout(150);
  await p.locator('#editorContainer .wrs_toolbar button[title="Left spacing"]:visible').first().click();
  await p.waitForTimeout(150);
  log('3  switching controls: panels open', await p.locator('.wrs_lengthButtonPanel:visible').count(), 'title', await p.locator('.wrs_lengthButtonPanel:visible td').first().textContent());
  await p.keyboard.press('Escape');

  // 4. bracket select by keyboard
  await open('<mfenced><mi>x</mi></mfenced>', 1);
  const sel = p.locator('#editorContainer select[title="setOpenBracket"]:visible').first();
  await sel.focus();
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(250);
  log('4  select by arrow key:', await mml(), '| value', await sel.inputValue());

  // 5. contextual tab after typing: the controls follow the caret
  await open('', 0);
  await p.keyboard.type('a+b', { delay: 40 });
  await p.waitForTimeout(250);
  const names = async () => Object.keys(await state()).join(', ');
  log('5a caret at the end of a+b:', await names());
  await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(250);
  log('5b one left (between + and b):', await names());
  await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(250);
  log('5c between a and +:', await names());
  await b.close();
})();
