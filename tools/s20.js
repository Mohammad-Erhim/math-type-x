const { scenario } = require('./sc');
const M = require('./mml');
scenario('s20_matrix_nav', async (H) => {
  const { p } = H;
  const cells = '.wrs_matrixButtonPanel div.wrs_matrixButton';
  const E = { clip: 'edit' };
  const fresh = async () => { await H.reset(); await H.focusEdit(); await H.tab(4); await H.click('Matrix with parenthesis'); await p.locator(cells).nth(7).click(); await H.sleep(500); await H.focusEdit(); };
  await H.step('Insert 2×2 parenthesis matrix with the picker; focus lost, so click in the editing area (caret goes after the matrix)', async () => { await fresh(); }, E);
  for (let n = 1; n <= 7; n++) {
    await H.step(`ArrowLeft ×${n} from the end, then type "${String.fromCharCode(96 + n)}" → shows where the caret is`, async () => { await fresh(); for (let i = 0; i < n; i++) await p.keyboard.press('ArrowLeft'); await p.keyboard.type(String.fromCharCode(96 + n)); }, E);
  }
  const inCell = async () => { await fresh(); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); };
  const probes = [['ArrowLeft', 'move to previous cell / out of cell'], ['ArrowRight', 'move to next cell / out'], ['ArrowUp', 'row above'], ['ArrowDown', 'row below'], ['Home', 'start of context'], ['End', 'end of context'], ['Enter', 'new line inside cell?'], ['Tab', 'leaves editor'], ['Backspace', 'delete in empty cell'], ['Delete', 'forward delete in empty cell']];
  for (const [k, d] of probes) {
    await H.step(`Caret in last cell (ArrowLeft ×2 from end): key ${k} (${d}), then type "z"`, async () => { await inCell(); await p.keyboard.type('y'); await p.keyboard.press(k); await p.keyboard.type('z'); }, E);
  }
  await H.step('Mouse: click directly on first cell of the matrix and type "9"', async () => { await fresh(); const b = await H.box(); await p.mouse.click(b.x + 36, b.y + 118); await p.keyboard.type('9'); }, E);
  await H.step('Mouse: click on second cell of the first row and type "8"', async () => { await fresh(); const b = await H.box(); await p.mouse.click(b.x + 70, b.y + 118); await p.keyboard.type('8'); }, E);
  await H.step('Fill 2×2 (typing a, →, b, ↓, d, ←, c) starting in first cell', async () => { await fresh(); const b = await H.box(); await p.mouse.click(b.x + 36, b.y + 118); for (const t of ['a', 'ArrowRight', 'b', 'ArrowDown', 'd', 'ArrowLeft', 'c']) { if (t.length === 1) await p.keyboard.type(t); else await p.keyboard.press(t); } }, E);
  await H.step('Smart delete: caret right after the matrix, Backspace (first press)', async () => { await fresh(); await p.keyboard.press('Backspace'); }, E);
  await H.step('Backspace again (second press)', async () => { await p.keyboard.press('Backspace'); }, E);
  await H.step('Ctrl+A then Delete clears matrix', async () => { await fresh(); await p.keyboard.press('Control+a'); await p.keyboard.press('Delete'); }, E);
}, {});
