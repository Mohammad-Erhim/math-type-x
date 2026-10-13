const { scenario } = require('./sc');
scenario('s01_layout', async (H) => {
  const { p } = H;
  await H.step('Initial state of the playground (page scrolled so the widget is in view)', null, { clip: 'full' });
  await H.step('Full viewport (1920x1080) with the playground in context', null, { clip: { x: 0, y: 0, width: 1920, height: 1080 }, noMathml: true });
  const geom = await p.evaluate(() => {
    const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: r.x, y: r.y, w: r.width, h: r.height, bg: cs.backgroundColor, font: cs.fontFamily }; };
    return { editor: q('#editorContainer .wrs_editor'), toolbar: q('.wrs_toolbar'), header: q('.wrs_header'), formula: q('.wrs_formulaDisplay'), hand: q('.wrs_handWrapper'), all: [...document.querySelectorAll('#editorContainer > * , #editorContainer .wrs_editor > *')].map(e => e.tagName + '.' + e.className) };
  });
  console.log(JSON.stringify(geom));
  require('fs').writeFileSync('sc/s01_geom.json', JSON.stringify(geom, null, 1));
  // hover states
  const b0 = await H.box();
  await H.step('Hover over General tab button', async () => { await p.locator('#editorContainer .wrs_header button').nth(2).hover(); }, { noMathml: true });
  await H.step('Hover over Fraction button', async () => { await H.btn('Fraction (Ctrl+/)').hover(); await H.sleep(900); }, { noMathml: true });
  await H.step('Mouse down (pressed state) on Fraction button, not released', async () => { await H.btn('Fraction (Ctrl+/)').hover(); await p.mouse.down(); }, { noMathml: true });
  await p.mouse.up(); await H.reset();
  await H.step('Hover over disabled Copy button', async () => { await H.btn('Press Ctrl+C to copy the selection').hover({ force: true }); await H.sleep(700); }, { noMathml: true });
  await H.step('Hover over Font family select', async () => { await p.locator('#editorContainer select').first().hover(); }, { noMathml: true });
  await H.step('Hover over help (?) link', async () => { await p.locator('#editorContainer a.wrs_linkButton').hover(); await H.sleep(700); }, { noMathml: true });
  await H.step('Hover over handwriting toggle strip', async () => { await p.mouse.move(b0.x + b0.width - 15, b0.y + 250); await H.sleep(500); }, { noMathml: true });
  // keyboard focus
  await H.focusEdit();
  await H.step('Keyboard: Shift+Tab from edit area (focus moves toward toolbar)', async () => { await p.keyboard.press('Shift+Tab'); }, { noMathml: true });
  await H.step('Keyboard: Shift+Tab again', async () => { await p.keyboard.press('Shift+Tab'); }, { noMathml: true });
  await H.step('Keyboard: Tab', async () => { await p.keyboard.press('Tab'); }, { noMathml: true });
  await H.step('Keyboard: Tab', async () => { await p.keyboard.press('Tab'); }, { noMathml: true });
  await H.step('Keyboard: Tab', async () => { await p.keyboard.press('Tab'); }, { noMathml: true });
  const focus = await p.evaluate(() => { const a = document.activeElement; return a ? a.tagName + '|' + a.className + '|' + a.title : null; });
  console.log('active', focus);
}, {});
