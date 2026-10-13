const { scenario } = require('./sc');
scenario('s25_digit_modes', async (H) => {
  const { p } = H;
  const E = { clip: 'full' };
  const fresh = async () => { await H.reset(); await H.focusEdit(); };
  await H.step('Greek tab: click “Arabic-Indic numerals” on an empty editor, then type 123', async () => { await fresh(); await H.tab(3); await H.click('Arabic-Indic numerals'); await p.keyboard.type('123'); }, E);
  await H.step('Document reset via API (not UI) then type 456: does the digit style persist?', async () => { await fresh(); await H.tab(3); await p.keyboard.type('456'); }, E);
  await H.step('Click “Eastern Arabic-Indic numerals”, type 789', async () => { await H.click('Eastern Arabic-Indic numerals'); await p.keyboard.type('789'); }, E);
  await H.step('Click “Arabic-Indic numerals” again (toggle?), type 123', async () => { await H.click('Arabic-Indic numerals'); await p.keyboard.type('123'); }, E);
  await H.step('Click the same button once more, type 123', async () => { await H.click('Arabic-Indic numerals'); await p.keyboard.type('123'); }, E);
  await H.step('Existing western digits "123" selected, then click “Arabic-Indic numerals” (does it convert?)', async () => { await fresh(); await H.tab(3); await p.keyboard.type('123'); await p.keyboard.press('Control+a'); await H.click('Arabic-Indic numerals'); }, E);
  await H.step('Type 4 after that', async () => { await H.focusEdit(); await p.keyboard.type('4'); }, E);
  await H.step('Hydrogen (chemical element) then type 2', async () => { await fresh(); await H.tab(3); await H.click('Hydrogen'); await p.keyboard.type('2'); }, E);
  await H.step('Typing 0123456789 on the plain keyboard in the same session', async () => { await fresh(); await p.keyboard.type('0123456789'); }, E);
}, {});
