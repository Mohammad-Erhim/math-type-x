// long press in the formula on a phone: selection, keyboard state, the menu (Cut / Copy / Paste / Select all)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8099' });
  const p = await ctx.newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
  await p.waitForTimeout(800);
  await p.evaluate(() => editor.setMathML('<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi><mo>+</mo><mi>b</mi><mo>+</mo><mi>c</mi></math>'));
  await p.waitForTimeout(400);
  const st = async (label) => console.log(label.padEnd(30), JSON.stringify(await p.evaluate(() => {
    const a = document.activeElement; const k = document.querySelector('.wrs_navKeyboard');
    const f = document.querySelector('.wrs_focusElement');
    return { focus: a.tagName + (a.classList.contains('wrs_focusElement') ? '(formula)' : '.' + String(a.className).slice(0, 18)), inputMode: f.inputMode, keysKey: k && k.getAttribute('aria-pressed'), menu: !!document.querySelector('.wrs_ctxMenu'), sel: editor.getSelectedMathML ? undefined : undefined };
  })));
  const box = await p.locator('.wrs_formulaDisplay, .wrs_canvasContainer').first().boundingBox();
  const cdp = await ctx.newCDPSession(p);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await st('start');
  await p.touchscreen.tap(box.x + 20, box.y + 18); // opens the keyboard
  await p.waitForTimeout(500);
  await st('after a tap (keyboard on)');
  await touch('touchStart', box.x + 20, box.y + 18);
  await p.waitForTimeout(700);
  await st('during the long press');
  await touch('touchEnd');
  await p.waitForTimeout(500);
  await st('after the long press');
  const items = await p.evaluate(() => [...document.querySelectorAll('.wrs_ctxItem')].map((e) => e.textContent + (e.disabled ? '(off)' : '')));
  console.log('menu items:', JSON.stringify(items));
  await p.screenshot({ path: '.cache/longpress.png' });
  // Copy from the menu then Paste from the menu
  await p.evaluate(() => navigator.clipboard.writeText('<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>z</mi></math>'));
  await p.locator('.wrs_ctxItem', { hasText: 'Paste' }).tap();
  await p.waitForTimeout(600);
  console.log('after menu Paste:', await p.evaluate(() => editor.getMathML().replace(/ xmlns="[^"]*"/, '')));
  await st('after menu Paste');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
