const { scenario } = require('./sc');
scenario('s11_handwriting', async (H) => {
  const { p, ctx } = H;
  const bx = await H.box();
  const cv = async () => p.locator('#editorContainer canvas.wrs_canvas').boundingBox();
  const stroke = async (pts, o = {}) => { const c = await cv(); const [x0, y0] = pts[0]; await p.mouse.move(c.x + x0, c.y + y0); await p.mouse.down(); for (const [x, y] of pts.slice(1)) { await p.mouse.move(c.x + x, c.y + y, { steps: o.steps || 6 }); } await p.mouse.up(); await H.sleep(o.wait || 150); };
  const state = async () => p.evaluate(() => ({ btns: [...document.querySelectorAll('.wrs_hand .wrs_toolbar .wrs_button')].map(b => (b.title) + ':' + (b.classList.contains('wrs_disabled') ? 'disabled' : 'enabled')), canvasEmpty: !!document.querySelector('.wrs_canvasContainer.wrs_empty'), handOpen: editor.isHandOpen ? editor.isHandOpen() : null, preview: (document.querySelector('.wrs_hand .wrs_preview, .wrs_hand [class*=preview]') || {}).className || null }));
  await H.step('Handwriting closed: initial', null, { clip: 'full' });
  await p.mouse.move(bx.x + bx.width - 15, bx.y + 250);
  await H.step('Hover over the handwriting strip (right edge)', null, { clip: 'full', noMathml: true });
  await p.mouse.click(bx.x + bx.width - 15, bx.y + 250); await H.sleep(1500);
  await H.step('Handwriting mode opened (empty canvas, hint animation)', null, { clip: 'full', extra: state });
  // write x : two strokes
  await stroke([[100, 150], [140, 210]]); await stroke([[140, 150], [100, 210]], { wait: 1200 });
  await H.step('Wrote "x" with two strokes', null, { clip: 'full', extra: state });
  await stroke([[190, 180], [250, 180]]); await stroke([[220, 150], [220, 210]], { wait: 1000 });
  await H.step('Wrote "+" (two strokes)', null, { clip: 'full', extra: state });
  await stroke([[300, 150], [320, 140], [320, 215]], { wait: 1500 });
  await H.step('Wrote "1"', null, { clip: 'full', extra: state });
  await H.step('Click Undo (hand toolbar)', async () => { await p.locator('.wrs_hand .wrs_button[title="Undo"]').click(); await H.sleep(1200); }, { clip: 'full', extra: state });
  await H.step('Click Redo', async () => { await p.locator('.wrs_hand .wrs_button[title="Redo"]').click(); await H.sleep(1200); }, { clip: 'full', extra: state });
  await H.step('Scribble over the "+" to erase it (zig-zag)', async () => { await stroke([[170, 140], [270, 170], [170, 190], [270, 215], [170, 225]], { wait: 1800 }); }, { clip: 'full', extra: state });
  await H.step('Wait; strokes red then erased', null, { clip: 'full', extra: state, wait: 1500 });
  await H.step('Click Clear', async () => { await p.locator('.wrs_hand .wrs_button[title="Clear"]').click(); await H.sleep(1000); }, { clip: 'full', extra: state });
  // fraction: a over b with bar
  await stroke([[120, 100], [150, 90], [180, 100]], { wait: 100 }); await stroke([[100, 150], [210, 150]], { wait: 100 }); await stroke([[120, 190], [120, 230], [170, 230], [170, 190], [120, 190]], { wait: 1500 });
  await H.step('Wrote something fraction-like (^ over bar over box)', null, { clip: 'full', extra: state });
  await H.step('Click Help button in hand toolbar', async () => { const [pg] = await Promise.all([ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null), p.locator('.wrs_hand .wrs_button[title="Help"]').click()]); H.helpPage = pg ? pg.url() : null; if (pg) await pg.close(); await H.sleep(500); }, { clip: 'full', extra: async () => ({ helpPage: H.helpPage }) });
  await H.step('Switch to keyboard (Use keyboard toggle at bottom)', async () => { await p.locator('.wrs_hand input[title="Use keyboard"], input[title="Use keyboard"]').first().click({ force: true }); await H.sleep(1500); }, { clip: 'full', extra: state });
  await H.step('Back in classic editor: recognized formula inserted into the editing area', null, { clip: 'full' });
  await H.step('Reopen handwriting via strip: expression regenerated as simulated strokes', async () => { await p.mouse.click(bx.x + bx.width - 15, bx.y + 250); await H.sleep(2500); }, { clip: 'full', extra: state });
  await H.step('Resize: Escape key in handwriting', async () => { await p.keyboard.press('Escape'); await H.sleep(500); }, { clip: 'full', extra: state });
}, {});
