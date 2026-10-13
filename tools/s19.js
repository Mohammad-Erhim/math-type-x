const { scenario } = require('./sc');
scenario('s19_more_popup', async (H) => {
  const { p } = H;
  const st = async () => p.evaluate(() => { const a = document.activeElement; const pressed = [...document.querySelectorAll('#editorContainer button.wrs_expandButton.wrs_pressed')].length; const vis = [...document.querySelectorAll('#editorContainer button.wrs_button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length; return { active: a ? (a.title || a.getAttribute('aria-label') || a.className) : null, expandersPressed: pressed, visibleButtons: vis }; });
  const exp = () => p.locator('#editorContainer button.wrs_expandButton:visible');
  await H.focusEdit();
  await H.tab(1);
  await H.step('Symbols tab; click first expand arrow (▸) next to operators', async () => { await exp().nth(0).click(); await H.sleep(400); }, { clip: 'full', extra: st });
  await H.step('Pop-up open: first item is focused/highlighted — press ArrowDown', async () => { await p.keyboard.press('ArrowDown'); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('ArrowDown again', async () => { await p.keyboard.press('ArrowDown'); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('ArrowUp', async () => { await p.keyboard.press('ArrowUp'); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Enter on highlighted item (inserts and closes)', async () => { await p.keyboard.press('Enter'); await H.sleep(400); }, { clip: 'full', extra: st });
  await H.step('Reopen pop-up, press Escape', async () => { await exp().nth(0).click(); await H.sleep(300); await p.keyboard.press('Escape'); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Reopen pop-up, click outside on editing area', async () => { await exp().nth(0).click(); await H.sleep(300); await H.focusEdit(); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Open pop-up 1 then click expand arrow 2 (switch)', async () => { await exp().nth(0).click(); await H.sleep(300); await exp().nth(1).click(); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Open pop-up then click another tab', async () => { await H.tab(0); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Open pop-up, then click same arrow again (toggle)', async () => { await H.tab(1); await exp().nth(0).click(); await H.sleep(300); await exp().nth(0).click(); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Keyboard: focus an item in grid then Space opens group?', async () => { await H.focusEdit(); await p.keyboard.press('Alt+2'); await H.sleep(300); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Press ArrowDown/Space to open the group popup', async () => { await p.keyboard.press('ArrowDown'); await H.sleep(300); await p.keyboard.press('ArrowDown'); await H.sleep(300); await p.keyboard.press('ArrowDown'); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Space on focused item', async () => { await p.keyboard.press('Space'); await H.sleep(400); }, { clip: 'full', extra: st });
  await H.step('Keyboard: from "Ring operator" press ArrowRight (reach the ▸ “More” control?)', async () => { await H.focusEdit(); await p.keyboard.press('Alt+2'); await H.sleep(300); for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown']) { await p.keyboard.press(k); await H.sleep(150); } await p.keyboard.press('ArrowRight'); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Keyboard: ArrowRight again', async () => { await p.keyboard.press('ArrowRight'); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Keyboard: ArrowDown on the More control (opens group)', async () => { await p.keyboard.press('ArrowDown'); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Keyboard: Space on the More control', async () => { await p.keyboard.press('Escape'); await H.sleep(200); await p.keyboard.press('Space'); await H.sleep(300); }, { clip: 'full', extra: st });
  await H.step('Keyboard: Enter on the More control', async () => { await p.keyboard.press('Escape'); await H.sleep(200); await p.keyboard.press('Enter'); await H.sleep(300); }, { clip: 'full', extra: st });
  // Greek expansion (large popups)
  await H.step('Greek tab: open the first "More" (double-struck letters) popup', async () => { await H.tab(3); await exp().nth(0).click(); await H.sleep(500); }, { clip: 'full', extra: st });
  await H.step('Greek tab: popup scroll? hover an item', async () => { await p.locator('#editorContainer button.wrs_button:visible').nth(40).hover(); await H.sleep(300); }, { clip: 'full', extra: st });
}, {});
