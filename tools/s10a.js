const { scenario } = require('./sc');
const { contexts } = require('./lib_ctx');
scenario('s10a_ctx_probe', async (H) => {
  const { p } = H;
  const sig = async () => p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_toolbar button, #editorContainer .wrs_toolbar select, #editorContainer .wrs_toolbar input')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.wrs_header') && !/Math input|handwritten/.test(e.title || e.getAttribute('aria-label') || ''); }).map(e => (e.title || e.getAttribute('aria-label') || e.tagName)));
  const out = {};
  for (const c of contexts) {
    out[c.key] = {};
    for (let k = 0; k <= 3; k++) {
      await H.reset(c.mml); await H.focusEdit();
      for (let i = 0; i < k; i++) await p.keyboard.press('ArrowLeft');
      await H.tab(9); await H.sleep(400);
      const s = await sig();
      out[c.key][k] = s;
      console.log(c.key, 'left x' + k, '=>', s.length, s.slice(0, 5).join(' | ')); await H.step(`${c.name}: caret ArrowLeft x${k} from end, Contextual tab open`, null, { clip: 'full', noMathml: true, extra: async () => s });
    }
  }
  require('fs').writeFileSync('sc/s10a.json', JSON.stringify(out, null, 1));
}, {});
