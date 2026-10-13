const { scenario } = require('./sc');
const { contexts } = require('./lib_ctx');
const byKey = Object.fromEntries(contexts.map(c => [c.key, c]));
const list = [
  { id: 'matrix', c: 'matrix', left: 5, ctl: ['Column spacing at right', 'Horizontal frame spacing', 'Row spacing below', 'Vertical frame spacing'] },
  { id: 'operator', c: 'operator', left: 1, ctl: ['Left spacing', 'Right spacing'] },
  { id: 'mspace', c: 'mspace', left: 1, ctl: ['Space width', 'Space height', 'Space depth'] },
  { id: 'fence_in', c: 'fence', left: 3, ctl: ['Left spacing', 'Right spacing'] },
];
const values = ['2px', '0.5em', '1ex', '5', '2 px', 'abc', '-2px', ''];
scenario('s23_length_fields', async (H) => {
  const { p } = H;
  const setup = async (it) => { await H.reset(byKey[it.c].mml); await H.focusEdit(); for (let i = 0; i < it.left; i++) await p.keyboard.press('ArrowLeft'); await H.tab(9); await H.sleep(350); };
  for (const it of list) {
    for (const ctl of it.ctl) {
      await H.step(`[${it.id}] "${ctl}": click → opens a small “Value” input (shows current value)`, async () => { await setup(it); await H.click(ctl); await H.sleep(300); }, { clip: 'full', extra: async () => p.evaluate(() => { const i = document.querySelector('#editorContainer input[title="Value"]'); return i ? { value: i.value, focused: document.activeElement === i } : null; }) });
      for (const v of values) {
        await H.step(`[${it.id}] "${ctl}": Ctrl+A, type "${v}", Enter`, async () => { await setup(it); await H.click(ctl); await p.locator('#editorContainer input[title="Value"]').waitFor({ timeout: 5000 }); await H.sleep(400); const inp = p.locator('#editorContainer input[title="Value"]'); await inp.fill(v); await H.sleep(150); await inp.press('Enter'); await H.sleep(500); }, { clip: 'full' });
      }
    }
  }
}, {});
