const { scenario } = require('./sc');
scenario('s18_touch', async (H) => {
  const { p } = H;
  const bx = await H.box();
  const at = (x, y) => [bx.x + x, bx.y + y];
  const ts = p.touchscreen;
  await H.step('Touch device emulation: initial', null, { clip: 'full' });
  await H.step('Tap in editing area', async () => { await ts.tap(...at(300, 200)); await H.sleep(600); }, { clip: 'full' });
  await H.step('Type "abc" with keyboard while touch-enabled', async () => { await p.keyboard.type('abc'); }, { clip: 'full' });
  await H.step('Tap between b and c', async () => { await ts.tap(...at(36, 118)); await H.sleep(600); }, { clip: 'full' });
  await H.step('Long press / double tap on character', async () => { await ts.tap(...at(25, 118)); await ts.tap(...at(25, 118)); await H.sleep(600); }, { clip: 'full' });
  await H.step('Select with Shift+Arrows: caret precision controllers visible?', async () => { await p.keyboard.press('Shift+ArrowLeft'); await p.keyboard.press('Shift+ArrowLeft'); await H.sleep(500); }, { clip: 'full', extra: async () => p.evaluate(() => [...document.querySelectorAll('.wrs_caretPrecisionController')].map(e => e.className + ' ' + JSON.stringify(e.getBoundingClientRect()))) });
  await H.step('Tap toolbar Fraction', async () => { const b = await H.btn('Fraction (Ctrl+/)').boundingBox(); await ts.tap(b.x + b.width / 2, b.y + b.height / 2); await H.sleep(500); }, { clip: 'full' });
  await H.step('Tap handwriting strip', async () => { await ts.tap(...at(bx.width - 15, 250)); await H.sleep(1500); }, { clip: 'full' });
  await H.step('Touch-draw a stroke on the handwriting canvas via touch events', async () => { const c = await p.locator('#editorContainer canvas.wrs_canvas').boundingBox(); const cdp = await p.context().newCDPSession(p); const pts = []; for (let i = 0; i <= 10; i++) pts.push({ x: c.x + 100 + i * 8, y: c.y + 100 + i * 8 }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] }); for (const q of pts.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [q] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await H.sleep(1500); }, { clip: 'full', noMathml: true });
}, { hasTouch: true });
