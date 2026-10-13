const { scenario } = require('./sc');
scenario('probe_touch', async (H) => {
  const { p } = H;
  const bx = await H.box();
  const at = (x, y) => [bx.x + x, bx.y + y];
  const ts = p.touchscreen;
  const info = async (t) => console.log(t, JSON.stringify(await p.evaluate(() => ({ m: editor.getMathML().replace(/ xmlns="[^"]+"/, ''), sel: [...document.querySelectorAll('.wrs_selectionLayer *, .wrs_selection')].length, act: document.activeElement && (document.activeElement.className || document.activeElement.tagName) }))));
  await H.step('x', null, {});
  await ts.tap(...at(300, 200)); await H.sleep(600);
  await p.keyboard.type('abc'); await info('typed');
  await ts.tap(...at(36, 118)); await H.sleep(600); await info('tap36');
  await ts.tap(...at(25, 118)); await ts.tap(...at(25, 118)); await H.sleep(600); await info('dbl25');
  await p.keyboard.press('Shift+ArrowLeft'); await p.keyboard.press('Shift+ArrowLeft'); await H.sleep(500); await info('shift2');
  const how = process.env.HOW || 'tap';
  const b = await H.btn('Fraction (Ctrl+/)').boundingBox();
  if (how === 'tap') await ts.tap(b.x + b.width / 2, b.y + b.height / 2); else await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await H.sleep(500); await info('fraction ' + how);
}, { hasTouch: true });
