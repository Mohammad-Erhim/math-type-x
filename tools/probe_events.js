const { scenario } = require('./sc');
scenario('probe_events', async (H) => {
  const { p } = H;
  const bx = await H.box();
  const at = (x, y) => [bx.x + x, bx.y + y];
  const ts = p.touchscreen;
  await H.step('x', null, {});
  await ts.tap(...at(300, 200)); await H.sleep(600);
  await p.keyboard.type('abc');
  await p.evaluate(() => { window.__ev = []; for (const t of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu']) document.addEventListener(t, (e) => window.__ev.push(t + ':' + (e.detail ?? '') + ':' + (e.target.className || e.target.tagName)), true); });
  await ts.tap(...at(36, 118)); await H.sleep(400);
  console.log('tap1', JSON.stringify(await p.evaluate(() => window.__ev.splice(0))));
  await ts.tap(...at(25, 118)); await ts.tap(...at(25, 118)); await H.sleep(600);
  console.log('dbl', JSON.stringify(await p.evaluate(() => window.__ev.splice(0))));
}, { hasTouch: true });
