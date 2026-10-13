const { scenario } = require('./sc');
scenario('s02_tabs_kbd', async (H) => {
  const { p } = H;
  const state = async () => p.evaluate(() => {
    const sel = [...document.querySelectorAll('#editorContainer .wrs_header button')].map((b, i) => b.classList.contains('wrs_selected') || b.getAttribute('aria-selected') === 'true' ? i : -1).filter(i => i >= 0);
    const a = document.activeElement;
    return { selectedTabs: sel, active: a ? `${a.tagName}|${a.className}|${a.title || a.getAttribute('aria-label') || ''}|role=${a.getAttribute('role')}` : null };
  });
  await H.focusEdit();
  for (let i = 1; i <= 10; i++) {
    const k = i === 10 ? '0' : String(i);
    await H.step(`Press Alt+${k} with caret in the editing area`, async () => { await p.keyboard.press('Alt+' + k); }, { extra: state, noMathml: true });
  }
  await H.step('Alt+ArrowRight from last (Contextual) tab', async () => { await p.keyboard.press('Alt+ArrowRight'); }, { extra: state, noMathml: true });
  await H.step('Press Alt+1 then Alt+ArrowLeft from first tab', async () => { await p.keyboard.press('Alt+1'); await p.keyboard.press('Alt+ArrowLeft'); }, { extra: state, noMathml: true });
  await H.step('Alt+ArrowRight x3 from General', async () => { await p.keyboard.press('Alt+1'); for (let i = 0; i < 3; i++) await p.keyboard.press('Alt+ArrowRight'); }, { extra: state, noMathml: true });
  // click each tab
  for (let i = 0; i < 10; i++) await H.step(`Click toolbar tab #${i + 1}`, async () => { await H.tab(i); }, { extra: state, noMathml: true });
  // keyboard inside toolbar
  await H.step('Focus toolbar tab list: click General tab, then press ArrowRight', async () => { await H.tab(0); await p.keyboard.press('ArrowRight'); }, { extra: state, noMathml: true });
  await H.step('ArrowRight again', async () => { await p.keyboard.press('ArrowRight'); }, { extra: state, noMathml: true });
  await H.step('Tab (moves into symbol grid?)', async () => { await p.keyboard.press('Tab'); }, { extra: state, noMathml: true });
  await H.step('ArrowRight in grid', async () => { await p.keyboard.press('ArrowRight'); }, { extra: state, noMathml: true });
  await H.step('ArrowDown in grid', async () => { await p.keyboard.press('ArrowDown'); }, { extra: state, noMathml: true });
  await H.step('Enter on focused symbol (should insert it)', async () => { await p.keyboard.press('Enter'); }, { extra: state });
  await H.step('Alt+2 then ArrowDown/Enter on an expandable group', async () => { await H.focusEdit(); await p.keyboard.press('Alt+2'); }, { extra: state, noMathml: true });
  await H.step('Escape', async () => { await p.keyboard.press('Escape'); }, { extra: state, noMathml: true });
}, {});
