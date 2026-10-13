// default values shown by the length fields (one fresh page per control)
const { scenario } = require('./sc');
const { contexts } = require('./lib_ctx');
const byKey = Object.fromEntries(contexts.map(c => [c.key, c]));
const list = [
  { id: 'matrix', c: 'matrix', left: 5, ctl: ['Column spacing at right', 'Horizontal frame spacing', 'Row spacing below', 'Vertical frame spacing'] },
  { id: 'operator', c: 'operator', left: 1, ctl: ['Left spacing', 'Right spacing'] },
  { id: 'mspace', c: 'mspace', left: 1, ctl: ['Space width', 'Space height', 'Space depth'] },
  { id: 'fence_in', c: 'fence', left: 3, ctl: ['Left spacing', 'Right spacing'] },
];
scenario('s23b_defaults', async (H) => {
  const { p } = H;
  const setup = async (it) => { await H.reset(byKey[it.c].mml); await H.focusEdit(); for (let i = 0; i < it.left; i++) await p.keyboard.press('ArrowLeft'); await H.tab(9); await H.sleep(350); };
  for (const it of list) for (const ctl of it.ctl) {
    let got = null;
    await H.step(`[${it.id}] "${ctl}": open → current value`, async () => {
      await setup(it); await H.click(ctl); await H.sleep(500);
      got = await p.evaluate(() => { const i = document.querySelector('#editorContainer input[title="Value"]'); return i ? { value: i.value, focused: document.activeElement === i } : null; });
      await p.keyboard.press('Escape'); await H.sleep(300);
    }, { clip: 'full', extra: async () => got });
  }
}, {});
