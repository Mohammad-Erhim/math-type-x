const { scenario } = require('./sc');
const M = require('./mml');
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
scenario('s27_numsep', async (H) => {
  const { p } = H;
  const sig = async () => p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_toolbar button, #editorContainer .wrs_toolbar select, #editorContainer .wrs_toolbar input')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.wrs_header') && !/Math input|handwritten/.test(e.title || e.getAttribute('aria-label') || ''); }).map(e => e.title || e.getAttribute('aria-label')));
  const setups = [['1.5 caret at end', []], ['1.5: Shift+Left x1 (select 5)', ['Shift+ArrowLeft']], ['1.5: Shift+Left x2 (select .5)', ['Shift+ArrowLeft', 'Shift+ArrowLeft']], ['1.5: Ctrl+A', ['Control+a']], ['1.5: ArrowLeft x1 (between . and 5)', ['ArrowLeft']], ['1.5: ArrowLeft x2', ['ArrowLeft', 'ArrowLeft']], ['1.5: Left x2 + Shift+Right (select .)', ['ArrowLeft', 'ArrowLeft', 'Shift+ArrowRight']]];
  for (const mml of [`<math ${NS}><mn>1</mn><mo>.</mo><mn>5</mn></math>`, `<math ${NS}><mn>1</mn><mo>,</mo><mn>000</mn></math>`, `<math ${NS}><mn>1.5</mn></math>`]) {
    for (const [d, keys] of setups) {
      let s;
      await H.step(`${mml.replace(/ xmlns="[^"]+"/, '').replace(/<\/?math>/g, '')} — ${d}`, async () => { await H.reset(mml); await H.focusEdit(); for (const k of keys) await p.keyboard.press(k); await H.tab(9); await H.sleep(400); s = await sig(); }, { clip: 'full', noMathml: true, extra: async () => s });
    }
  }
}, {});
