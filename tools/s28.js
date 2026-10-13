const { scenario } = require('./sc');
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
scenario('s28_numsep_merge', async (H) => {
  const { p } = H;
  const T = 'Merge/unmerge separators in <mn>';
  const cases = [
    ['<mn>1</mn><mo>.</mo><mn>5</mn> with all selected (Ctrl+A)', `<math ${NS}><mn>1</mn><mo>.</mo><mn>5</mn></math>`, ['Control+a']],
    ['<mn>1</mn><mo>,</mo><mn>000</mn> caret before “000” (ArrowLeft ×1)', `<math ${NS}><mn>1</mn><mo>,</mo><mn>000</mn></math>`, ['ArrowLeft']],
    ['<mn>1</mn><mo>,</mo><mn>000</mn> all selected', `<math ${NS}><mn>1</mn><mo>,</mo><mn>000</mn></math>`, ['Control+a']],
    ['<mn>1.5</mn> caret inside (ArrowLeft ×1)', `<math ${NS}><mn>1.5</mn></math>`, ['ArrowLeft']],
    ['<mn>1,000.25</mn> caret inside', `<math ${NS}><mn>1,000.25</mn></math>`, ['ArrowLeft']],
  ];
  for (const [d, mml, keys] of cases) {
    await H.step(`${d}: click “${T}”`, async () => { await H.reset(mml); await H.focusEdit(); for (const k of keys) await p.keyboard.press(k); await H.tab(9); await H.sleep(400); await p.locator(`#editorContainer button[title="${T}"]:visible`).first().click(); await H.sleep(500); }, { clip: 'full' });
    await H.step(`  → click again (toggle back)`, async () => { await p.locator(`#editorContainer button[title="${T}"]:visible`).first().click(); await H.sleep(500); }, { clip: 'full' });
  }
}, {});
