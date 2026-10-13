const { scenario } = require('/home/ubuntu/Desktop/projects/math-type-x/tools/sc');
scenario('cph', async (H) => {
  const { p } = H;
  const bx = await H.box();
  const ts = p.touchscreen;
  await H.step('x', null, {});
  await ts.tap(bx.x + 300, bx.y + 200); await H.sleep(600);
  await p.keyboard.type('abc');
  const list = async (t) => console.log(t, JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.wrs_caretPrecisionController')].map((e) => e.className + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)))));
  await list('typed');
  await p.keyboard.press('Shift+ArrowLeft'); await p.keyboard.press('Shift+ArrowLeft'); await H.sleep(400);
  await list('selected');
}, { hasTouch: true });
