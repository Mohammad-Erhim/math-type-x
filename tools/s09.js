const { scenario } = require('./sc');
scenario('s09_matrix_picker', async (H) => {
  const { p } = H;
  const cells = '.wrs_matrixButtonPanel div.wrs_matrixButton';
  const inputs = '.wrs_matrixButtonPanel .wrs_inputCell input';
  const open = async (title) => { await H.reset(); await H.focusEdit(); await H.tab(4); await H.click(title); await H.sleep(500); };
  const panelState = async () => p.evaluate(() => ({ rows: document.querySelectorAll('.wrs_matrixButtonPanel tr').length, inputVals: [...document.querySelectorAll('.wrs_matrixButtonPanel .wrs_inputCell input')].map(i => i.value + '|' + i.type), hl: [...document.querySelectorAll('.wrs_matrixButtonPanel div.wrs_matrixButton')].map(d => d.className).filter(c => /sel|hover|active|high/.test(c)).length, visible: !!document.querySelector('.wrs_matrixButtonPanel') && document.querySelector('.wrs_matrixButtonPanel').getBoundingClientRect().width > 0 }));
  const cell = (r, c) => p.locator(cells).nth((r - 1) * 6 + (c - 1));
  for (const title of ['Table', 'Matrix with vertical bars', 'Matrix with square brackets', 'Matrix with parenthesis']) {
    const t = title;
    await H.step(`[${t}] click opens size picker (no insertion yet)`, async () => { await open(t); }, { clip: 'full', extra: panelState });
    await H.step(`[${t}] hover cell row 1 col 1`, async () => { await cell(1, 1).hover(); await H.sleep(250); }, { clip: 'full', extra: panelState });
    await H.step(`[${t}] hover cell row 3 col 4`, async () => { await cell(3, 4).hover(); await H.sleep(250); }, { clip: 'full', extra: panelState });
    await H.step(`[${t}] hover cell row 6 col 6`, async () => { await cell(6, 6).hover(); await H.sleep(250); }, { clip: 'full', extra: panelState });
    await H.step(`[${t}] click cell row 2 col 3`, async () => { await cell(2, 3).click(); await H.sleep(500); }, { clip: 'full' });
    await H.step(`[${t}] click cell row 1 col 1`, async () => { await open(t); await cell(1, 1).click(); await H.sleep(500); }, { clip: 'full' });
    await H.step(`[${t}] click cell row 6 col 6`, async () => { await open(t); await cell(6, 6).click(); await H.sleep(500); }, { clip: 'full' });
    await H.step(`[${t}] Rows=3, Columns=4 then Enter`, async () => { await open(t); await p.locator(inputs).nth(0).fill('3'); await p.locator(inputs).nth(1).fill('4'); await p.locator(inputs).nth(1).press('Enter'); await H.sleep(500); }, { clip: 'full' });
  }
  const t = 'Matrix with parenthesis';
  const tryDims = async (r, c, d) => H.step(`[${t}] Rows="${r}" Columns="${c}" + Enter ${d || ''}`, async () => { await open(t); await p.locator(inputs).nth(0).fill(String(r)); await p.locator(inputs).nth(1).fill(String(c)); await p.locator(inputs).nth(1).press('Enter'); await H.sleep(600); }, { clip: 'full', extra: panelState });
  await tryDims(1, 1); await tryDims(0, 0, '(zero)'); await tryDims(-1, -1, '(negative)'); await tryDims('abc', 'xyz', '(non-numeric)'); await tryDims('', '', '(empty)'); await tryDims(2.5, 3.5, '(decimal)');
  await tryDims(7, 7); await tryDims(10, 10); await tryDims(20, 20, '(large)'); await tryDims(50, 50, '(very large)'); await tryDims(100, 3, '(100 rows)'); await tryDims(2, '', '(columns empty)');
  await H.step(`[${t}] spinner: focus Rows, ArrowUp x3`, async () => { await open(t); const i = p.locator(inputs).nth(0); await i.focus(); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); }, { clip: 'full', extra: panelState });
  await H.step(`[${t}] spinner: ArrowDown x5 from empty`, async () => { await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); }, { clip: 'full', extra: panelState });
  await H.step(`[${t}] Enter in Rows field only`, async () => { await open(t); const i = p.locator(inputs).nth(0); await i.fill('2'); await i.press('Enter'); await H.sleep(500); }, { clip: 'full' });
  await H.step(`[${t}] Escape closes picker without inserting`, async () => { await open(t); await p.keyboard.press('Escape'); await H.sleep(400); }, { clip: 'full', extra: panelState });
  await H.step(`[${t}] click outside (editing area) closes picker`, async () => { await open(t); await H.focusEdit(); await H.sleep(400); }, { clip: 'full', extra: panelState });
  await H.step(`[${t}] click the same button again (toggle)`, async () => { await open(t); await H.click(t); await H.sleep(300); }, { clip: 'full', extra: panelState });
  await H.step(`[${t}] with "x" selected: click cell 2x2 (selection goes into matrix?)`, async () => { await H.reset(); await H.focusEdit(); await p.keyboard.type('x'); await p.keyboard.press('Shift+ArrowLeft'); await H.tab(4); await H.click(t); await cell(2, 2).click(); await H.sleep(500); }, { clip: 'full' });
  await H.step(`[${t}] with "x" typed (caret after): insert 2x2`, async () => { await open(t); await H.focusEdit(); await H.reset(); await H.focusEdit(); await p.keyboard.type('x'); await H.tab(4); await H.click(t); await cell(2, 2).click(); await H.sleep(500); }, { clip: 'full' });
  await H.step(`[${t}] type in each matrix cell with Tab/arrows: 1 2 / 3 4`, async () => { await H.reset(); await H.focusEdit(); await H.tab(4); await H.click(t); await cell(2, 2).click(); await H.sleep(400); await p.keyboard.type('1'); await p.keyboard.press('ArrowRight'); await p.keyboard.type('2'); await p.keyboard.press('ArrowDown'); await p.keyboard.type('4'); await p.keyboard.press('ArrowLeft'); await p.keyboard.type('3'); }, { clip: 'full' });
  await H.step('Keyboard: Tab key inside matrix moves to next cell?', async () => { await H.reset(); await H.focusEdit(); await H.tab(4); await H.click(t); await cell(2, 2).click(); await H.sleep(400); await p.keyboard.type('1'); await p.keyboard.press('Tab'); await p.keyboard.type('2'); }, { clip: 'full' });
  await H.step('Keyboard: Enter inside matrix cell', async () => { await H.reset(); await H.focusEdit(); await H.tab(4); await H.click(t); await cell(2, 2).click(); await H.sleep(400); await p.keyboard.type('1'); await p.keyboard.press('Enter'); await p.keyboard.type('2'); }, { clip: 'full' });
}, {});
