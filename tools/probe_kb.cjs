// soft keyboard behaviour on a phone-size touch screen: state of the Keys key, focus, caret on the opening tap
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/', { waitUntil: 'load' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
  await p.waitForTimeout(700);
  await p.evaluate(() => editor.setMathML('<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi><mo>+</mo><mi>b</mi><mo>+</mo><mi>c</mi></math>'));
  await p.waitForTimeout(400);
  const box = await p.locator('.wrs_canvasContainer, .wrs_formulaDisplay').first().boundingBox();
  const st = async (label) => console.log(label.padEnd(34), JSON.stringify(await p.evaluate(() => {
    const a = document.activeElement; const k = document.querySelector('.wrs_navKeyboard');
    return { focus: a.tagName + (a.classList.contains('wrs_focusElement') ? '(formula)' : '.' + String(a.className).slice(0, 18)), mode: document.querySelector('.wrs_focusElement').inputMode, keysKey: k.getAttribute('aria-pressed') };
  })));
  const mml = () => p.evaluate(() => editor.getMathML().replace(/ xmlns="[^"]*"/, ''));
  await st('start');
  // 1. first tap: opens the keyboard and keeps the caret (end of the formula)
  await p.touchscreen.tap(box.x + 20, box.y + 18);
  await p.waitForTimeout(400);
  await st('after tap in the formula');
  await p.keyboard.type('1');
  console.log('   typed 1 ->', await mml());
  // 2. tab and control taps keep the keyboard
  await p.locator('#editorContainer .wrs_header button[role=tab]').nth(2).tap();
  await p.waitForTimeout(300);
  await st('after a tab tap');
  await p.locator('#editorContainer .wrs_panelContainer button.wrs_button:visible').first().tap();
  await p.waitForTimeout(300);
  await st('after a control tap');
  await p.locator('#editorContainer .wrs_header button[role=tab]').nth(2).tap(); // second tap folds the panel
  await p.waitForTimeout(300);
  console.log('   folded panel: cues visible =', await p.evaluate(() => [...document.querySelectorAll('.wrs_scrollCue')].map((c) => getComputedStyle(c).display)));
  await st('after folding the panel');
  await p.locator('#editorContainer .wrs_header button[role=tab]').nth(2).tap();
  await p.waitForTimeout(200);
  // 3. a tap inside the formula moves the caret now
  await p.touchscreen.tap(box.x + 20, box.y + 18);
  await p.waitForTimeout(300);
  await p.keyboard.type('2');
  console.log('   tap moves caret ->', await mml());
  // 4. Keys key closes, the next tap opens without moving the caret
  await p.locator('.wrs_navKeyboard').tap();
  await p.waitForTimeout(300);
  await st('after Keys key (close)');
  await p.touchscreen.tap(box.x + 60, box.y + 18);
  await p.waitForTimeout(400);
  await st('opening tap');
  await p.keyboard.type('3');
  console.log('   opening tap kept the caret ->', await mml());
  // 5. the system closes the keyboard (emulated: the window gets low and high again)
  await p.setViewportSize({ width: 390, height: 520 });
  await p.waitForTimeout(900);
  await st('keyboard shown (window low)');
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(1200);
  await st('system closed the keyboard');
  await b.close();
})();
