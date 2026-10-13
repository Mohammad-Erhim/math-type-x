// geometry + styles of every control of the contextual tab (several contexts)
const { scenario } = require('./sc');
const { contexts } = require('./lib_ctx');
const byKey = Object.fromEntries(contexts.map(c => [c.key, c]));
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const extra = {
  numA: `<math ${NS}><mn>1</mn><mo>.</mo><mn>5</mn></math>`,
  numB: `<math ${NS}><mn>1</mn><mo>,</mo><mn>000</mn></math>`,
};
const list = [{ c: 'matrix', k: 2 }, { c: 'matrix', k: 1 }, { c: 'piecewise', k: 2 }, { c: 'piecewise', k: 1 }, { c: 'table', k: 0 }, { c: 'aligned', k: 0 }, { c: 'aligned', k: 1 }, { c: 'fence', k: 3 }, { c: 'fence', k: 1 }, { c: 'operator', k: 1 }, { c: 'mspace', k: 1 }, { c: 'sum', k: 0 }, { c: 'sum', k: 2 }, { c: 'stack', k: 0 }, { c: 'stack', k: 3 }, { c: 'longdiv', k: 1 }, { c: 'longdiv', k: 0 }, { c: 'longdiv', k: 3 }, { c: 'multiline', k: 0 }, { c: 'multiline', k: 1 }, { c: 'symbol', k: 0, sl: 1 }, { m: 'numA', k: 0, sl: 1 }, { m: 'numA', k: 0, all: 1 }, { m: 'numB', k: 1 }, { m: 'numA', k: 1 }];
scenario('s30_ctx_dump', async (H) => {
  const { p } = H;
  for (const it of list) {
    let dump = null;
    await H.step(`${it.c || it.m} k=${it.k}${it.sl ? ' sel' + it.sl : ''}${it.all ? ' all' : ''}`, async () => {
      await H.reset(); await H.focusEdit(); await H.tab(0); await H.sleep(300);
      await H.reset(it.m ? extra[it.m] : byKey[it.c].mml); await H.focusEdit();
      if (it.all) await p.keyboard.press('Control+a');
      for (let i = 0; i < it.k; i++) await p.keyboard.press('ArrowLeft');
      for (let i = 0; i < (it.sl || 0); i++) await p.keyboard.press('Shift+ArrowLeft');
      await H.tab(9); await H.sleep(600);
      dump = await p.evaluate(() => {
        const cont = document.querySelector('#editorContainer');
        const cb = cont.getBoundingClientRect();
        const out = [];
        const panel = cont.querySelector('.wrs_panelContainer .wrs_multipleRowPanel.wrs_selected') || cont.querySelector('.wrs_panelContainer');
        const walk = (el, depth) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          out.push({ d: depth, tag: el.tagName, cls: String(el.className).slice(0, 100), title: el.title || el.getAttribute('aria-label') || '', rect: [r.x - cb.x, r.y - cb.y, r.width, r.height].map((v) => Math.round(v * 100) / 100), bg: cs.backgroundImage.slice(0, 160), bgpos: cs.backgroundPosition, bgsize: cs.backgroundSize, bgcolor: cs.backgroundColor, border: cs.border, radius: cs.borderRadius, opacity: cs.opacity, text: (el.tagName === 'SELECT' ? el.value : (el.children.length ? '' : el.textContent || '')).slice(0, 24), opts: el.tagName === 'SELECT' ? [...el.options].map((o) => [o.value, o.text]) : undefined, disabled: el.disabled || el.getAttribute('aria-disabled'), src: el.tagName === 'IMG' ? el.src.slice(-100) : undefined, style: el.getAttribute('style') });
          for (const ch of el.children) walk(ch, depth + 1);
        };
        walk(panel, 0);
        return out;
      });
    }, { clip: 'full', noMathml: true, extra: async () => dump });
  }
}, {});
