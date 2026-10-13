const { scenario } = require('./sc');
scenario('s13_mouse_scroll', async (H) => {
  const { p } = H;
  const bx = await H.box();
  const E = { clip: 'edit' };
  const at = (x, y) => [bx.x + x, bx.y + y];
  const fresh = async (s) => { await H.reset(); await H.focusEdit(); if (s) await p.keyboard.type(s); await H.sleep(250); };
  await H.step('Type "abcdef"', async () => { await fresh('abcdef'); }, E);
  await H.step('Click between "c" and "d" (x≈ 41px in editing area), type X', async () => { await p.mouse.click(...at(52, 120)); await p.keyboard.type('X'); }, E);
  await H.step('Click far to the right on same line, type Y (caret at end)', async () => { await p.mouse.click(...at(500, 120)); await p.keyboard.type('Y'); }, E);
  await H.step('Click far below (empty area), type Z', async () => { await p.mouse.click(...at(300, 380)); await p.keyboard.type('Z'); }, E);
  await H.step('Click far left of first char (x=3), type W', async () => { await p.mouse.click(...at(5, 120)); await p.keyboard.type('W'); }, E);
  await H.step('Double-click on a character', async () => { await p.mouse.dblclick(...at(40, 120)); }, E);
  await H.step('Triple-click on content', async () => { await p.mouse.click(...at(40, 120), { clickCount: 3 }); }, E);
  await H.step('Drag-select from first to last char', async () => { await p.mouse.move(...at(8, 120)); await p.mouse.down(); await p.mouse.move(...at(120, 120), { steps: 8 }); await p.mouse.up(); }, E);
  await H.step('Shift+click extends selection', async () => { await p.mouse.click(...at(8, 120)); await p.keyboard.down('Shift'); await p.mouse.click(...at(70, 120)); await p.keyboard.up('Shift'); }, E);
  await H.step('Right-click on content (context menu?)', async () => { await p.mouse.click(...at(40, 120), { button: 'right' }); await H.sleep(500); }, { clip: 'full' });
  await H.step('Press Escape after right-click', async () => { await p.keyboard.press('Escape'); await H.sleep(300); }, { clip: 'full' });
  // fraction clicking
  await H.step('Fraction: build a/b, click numerator then type 1', async () => { await fresh(); await H.click('Fraction (Ctrl+/)'); await p.keyboard.type('a'); await p.keyboard.press('ArrowDown'); await p.keyboard.type('b'); await p.mouse.click(...at(18, 118)); await p.keyboard.type('1'); }, E);
  await H.step('Fraction: click denominator then type 2', async () => { await p.mouse.click(...at(18, 150)); await p.keyboard.type('2'); }, E);
  // hover caret precision controllers (touch handles)
  await H.step('Selection with caret precision controllers (touch handles)', async () => { await fresh('abc'); await p.keyboard.press('Shift+ArrowLeft'); await p.keyboard.press('Shift+ArrowLeft'); }, { clip: 'full' });
  // long content: horizontal
  await H.step('Long expression: 60 characters on one line', async () => { await fresh('1+2+3+4+5+6+7+8+9+10+11+12+13+14+15+16+17+18+19+20+21+22+23+24+25+26+27+28+29+30'); }, { clip: 'full' });
  await H.step('Very long expression: 200 characters', async () => { await p.keyboard.type('x'.repeat(120)); }, { clip: 'full' });
  await H.step('Scroll position info (formula display scrollWidth/Height)', null, { clip: 'full', noMathml: true, extra: async () => p.evaluate(() => { const f = document.querySelector('.wrs_formulaDisplay'); const w = document.querySelector('.wrs_formulaDisplayWrapper'); return { f: f && [f.scrollWidth, f.clientWidth, f.scrollHeight, f.clientHeight], w: w && [w.scrollWidth, w.clientWidth, w.scrollHeight, w.clientHeight], overflowX: w && getComputedStyle(w).overflowX, overflowY: w && getComputedStyle(w).overflowY }; }) });
  // many lines
  await H.step('20 lines via Enter', async () => { await fresh(); for (let i = 1; i <= 20; i++) { await p.keyboard.type(String(i)); await p.keyboard.press('Enter'); } }, { clip: 'full' });
  await H.step('Mouse wheel scroll down in editing area', async () => { await p.mouse.move(...at(300, 250)); await p.mouse.wheel(0, 400); await H.sleep(400); }, { clip: 'full', noMathml: true });
  await H.step('Tall structure: nested fractions 4 levels', async () => { await fresh(); for (let i = 0; i < 4; i++) { await H.click('Fraction (Ctrl+/)'); } await p.keyboard.type('1'); }, { clip: 'full' });
  await H.step('Large font size 72px with 5 characters', async () => { await fresh(); await p.locator('#editorContainer select[title="Font size"]').selectOption('72px'); await H.sleep(400); await p.keyboard.type('abcde'); }, { clip: 'full' });
}, {});
