const { scenario } = require('./sc');
const { contexts } = require('./lib_ctx');
const only = process.argv[2];
const byKey = Object.fromEntries(contexts.map(c => [c.key, c]));
const list = [
  { id: 'matrix', c: 'matrix', left: 2 }, { id: 'table', c: 'table', left: 0 }, { id: 'piecewise', c: 'piecewise', left: 2 },
  { id: 'aligned', c: 'aligned', left: 1 }, { id: 'fence_in', c: 'fence', left: 3 }, { id: 'operator', c: 'operator', left: 1 },
  { id: 'multiline', c: 'multiline', left: 1 }, { id: 'stack', c: 'stack', left: 0 }, { id: 'mspace', c: 'mspace', left: 1 },
  { id: 'sum', c: 'sum', left: 0 }, { id: 'symbol_sel', c: 'symbol', left: 0, shiftLeft: 1 }, { id: 'numsep_sel', c: 'numsep', left: 0, shiftLeft: 2 },
].filter(x => !only || x.id === only);
scenario('s10b_ctx_' + (only || 'all'), async (H) => {
  const { p } = H;
  const visible = async () => p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_toolbar button, #editorContainer .wrs_toolbar select, #editorContainer .wrs_toolbar input')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.wrs_header') && !/Math input|handwritten/.test(e.title || e.getAttribute('aria-label') || ''); }).map((e, i) => ({ i, tag: e.tagName, title: e.title || e.getAttribute('aria-label'), cls: e.className.toString(), val: e.value, opts: e.options ? [...e.options].map(o => o.value) : null })));
  const setup = async (it) => {
    const c = byKey[it.c];
    await H.reset(c.mml); await H.focusEdit();
    for (let i = 0; i < (it.left || 0); i++) await p.keyboard.press('ArrowLeft');
    for (let i = 0; i < (it.shiftLeft || 0); i++) await p.keyboard.press('Shift+ArrowLeft');
    await H.tab(9); await H.sleep(350);
  };
  const handle = async (i) => (await p.evaluateHandle((i) => [...document.querySelectorAll('#editorContainer .wrs_toolbar button, #editorContainer .wrs_toolbar select, #editorContainer .wrs_toolbar input')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.wrs_header') && !/Math input|handwritten/.test(e.title || e.getAttribute('aria-label') || ''); })[i], i)).asElement();
  for (const it of list) {
    await setup(it);
    const ctrls = await visible();
    await H.step(`CONTEXT ${it.id}: controls shown in the Contextual tab (${ctrls.length})`, null, { clip: 'full', extra: async () => ctrls });
    for (const ctl of ctrls) {
      const label = `${it.id} / ${ctl.title} (${ctl.tag.toLowerCase()}${/toggle/.test(ctl.cls) ? ', toggle' : ''}${/wrs_length/.test(ctl.cls) ? ', length' : ''})`;
      if (ctl.tag === 'SELECT') {
        for (const o of ctl.opts.slice(0, 20)) {
          await H.step(`${label} -> option "${o}"`, async () => { await setup(it); const h = await handle(ctl.i); await h.selectOption(o); await H.sleep(500); }, { clip: 'full' });
        }
      } else if (/wrs_length/.test(ctl.cls)) {
        await H.step(`${label} -> click`, async () => { await setup(it); const h = await handle(ctl.i); await h.click(); await H.sleep(500); }, { clip: 'full', extra: async () => p.evaluate(() => [...document.querySelectorAll('#editorContainer input')].filter(i => i.getBoundingClientRect().width > 0 && !/Math input|handwritten/.test(i.title)).map(i => i.className + '|' + i.title + '|' + i.value)) });
        for (const v of ['2px', '0.5em', '5']) {
          await H.step(`${label} -> type "${v}" + Enter`, async () => { await setup(it); const h = await handle(ctl.i); await h.click(); await H.sleep(300); await p.keyboard.type(v); await p.keyboard.press('Enter'); await H.sleep(500); }, { clip: 'full' });
        }
      } else {
        await H.step(`${label} -> click`, async () => { await setup(it); const h = await handle(ctl.i); await h.click(); await H.sleep(500); }, { clip: 'full', extra: async () => (await visible()).filter(x => /toggle/.test(x.cls)).map(x => x.title) });
      }
    }
  }
}, {});
