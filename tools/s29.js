// contextual tab screenshots (layout of the control groups) for several contexts
const { scenario } = require('./sc');
const { contexts } = require('./lib_ctx');
const byKey = Object.fromEntries(contexts.map(c => [c.key, c]));
const list = [{ c: 'matrix', k: 2 }, { c: 'matrix', k: 1 }, { c: 'table', k: 0 }, { c: 'aligned', k: 1 }, { c: 'fence', k: 3 }, { c: 'operator', k: 1 }, { c: 'mspace', k: 1 }, { c: 'sum', k: 0 }, { c: 'stack', k: 3 }, { c: 'longdiv', k: 1 }, { c: 'multiline', k: 1 }];
scenario('s29_ctx_layout', async (H) => {
  const { p } = H;
  for (const it of list) {
    await H.step(`${it.c} ArrowLeft x${it.k}`, async () => {
      await H.reset(byKey[it.c].mml); await H.focusEdit();
      for (let i = 0; i < it.k; i++) await p.keyboard.press('ArrowLeft');
      await H.tab(9); await H.sleep(500);
    }, { clip: 'full', noMathml: true });
  }
}, {});
