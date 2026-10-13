const { scenario } = require('./sc');
scenario('s08_keyboard_edit', async (H) => {
  const { p } = H;
  const E = { clip: 'edit' };
  const key = async (k, d, o) => H.step(`Key ${k}${d ? ' - ' + d : ''}`, async () => { await p.keyboard.press(k); }, o || E);
  const fresh = async (s) => { await H.reset(); await H.focusEdit(); if (s) await p.keyboard.type(s); await H.sleep(200); };
  // composite: x+1 / (a over b) = 2
  const composite = async () => { await fresh('x+1'); await H.click('Fraction (Ctrl+/)'); await p.keyboard.type('a'); await p.keyboard.press('ArrowDown'); await p.keyboard.type('b'); await p.keyboard.press('ArrowRight'); await p.keyboard.type('=2'); await H.sleep(250); };
  await H.step('Build composite "x+1 a/b =2"', composite, E);
  await key('ArrowLeft', 'move left over "2"');
  await key('ArrowLeft', 'move left over "="');
  await key('ArrowLeft', 'move left: enters/leaves the fraction (denominator)');
  await key('ArrowUp', 'denominator -> numerator');
  await key('ArrowDown', 'numerator -> denominator');
  await key('Home', 'start of editing context (inside denominator)');
  await key('End', 'end of editing context');
  await key('Shift+ArrowLeft', 'extend selection left');
  await key('Shift+ArrowLeft', 'extend selection left again');
  await key('Shift+ArrowRight', 'shrink selection');
  await key('Shift+Home', 'select to start');
  await key('Shift+End', 'select to end');
  await key('Control+a', 'select all');
  await key('Delete', 'delete selection');
  // smart deleting
  await H.step('Smart delete setup: composite, caret right after the fraction', async () => { await composite(); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); }, E);
  await key('Backspace', 'first press at fraction boundary (should highlight)');
  await key('Backspace', 'second press (confirm delete)');
  await H.step('Smart delete from inside denominator: caret at start of empty slot, Backspace', async () => { await fresh('x'); await H.click('Fraction (Ctrl+/)'); await p.keyboard.press('Backspace'); }, E);
  await key('Backspace', 'again');
  await H.step('Delete key at fraction boundary (forward delete)', async () => { await fresh('x'); await H.click('Fraction (Ctrl+/)'); await p.keyboard.type('a'); await p.keyboard.press('ArrowDown'); await p.keyboard.type('b'); await p.keyboard.press('Home'); await p.keyboard.press('Delete'); }, E);
  await H.step('Backspace on a single char "abc"', async () => { await fresh('abc'); await p.keyboard.press('Backspace'); }, E);
  await H.step('Backspace on empty editor', async () => { await fresh(''); await p.keyboard.press('Backspace'); }, E);
  await H.step('Delete on empty editor', async () => { await fresh(''); await p.keyboard.press('Delete'); }, E);
  // Enter / Tab / Space / Escape
  await H.step('Enter in editor after "ab"', async () => { await fresh('ab'); await p.keyboard.press('Enter'); await p.keyboard.type('cd'); }, { clip: 'full' });
  await H.step('Enter twice', async () => { await p.keyboard.press('Enter'); await p.keyboard.type('ef'); }, { clip: 'full' });
  await H.step('ArrowUp / ArrowDown between lines', async () => { await p.keyboard.press('ArrowUp'); await p.keyboard.type('1'); }, { clip: 'full' });
  await H.step('Space key typed twice', async () => { await fresh('a'); await p.keyboard.press('Space'); await p.keyboard.press('Space'); await p.keyboard.type('b'); }, E);
  await H.step('Tab key in editor', async () => { await fresh('a'); await p.keyboard.press('Tab'); await p.keyboard.type('b'); }, E);
  await H.step('Escape key in editor', async () => { await fresh('a'); await p.keyboard.press('Escape'); await p.keyboard.type('b'); }, E);
  // shortcuts for templates
  await H.step('Ctrl+/ creates fraction', async () => { await fresh('x'); await p.keyboard.press('Control+/'); await p.keyboard.type('1'); }, E);
  await H.step('Ctrl+ArrowUp creates superscript', async () => { await fresh('x'); await p.keyboard.press('Control+ArrowUp'); await p.keyboard.type('2'); }, E);
  await H.step('Ctrl+ArrowDown creates subscript', async () => { await fresh('x'); await p.keyboard.press('Control+ArrowDown'); await p.keyboard.type('i'); }, E);
  await H.step('Ctrl+Up then Ctrl+Down (sub and super)', async () => { await fresh('x'); await p.keyboard.press('Control+ArrowUp'); await p.keyboard.type('2'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Control+ArrowDown'); await p.keyboard.type('i'); }, E);
  for (const [k, d] of [['Control+0',''],['Control+9','parentheses?'],['Control+Shift+9',''],['Control+[','brackets?'],['Control+{',''],['Control+r','root?'],['Control+Shift+L','LaTeX window (not in web playground?)'],['Control+Shift+X','MathML window'],['Control+Enter','confirm'],['Control+Shift+ArrowRight','nudge selected element'],['Control+Shift+ArrowUp','nudge up'],['Alt+Enter',''],['F1','help'],['F2','']]) {
    await H.step(`Shortcut ${k} ${d}`, async () => { await fresh('x'); await p.keyboard.press(k); await H.sleep(300); }, { clip: 'full' });
  }
  // selection by structure
  await H.step('Select fraction by Shift+Left across it, then type "9" (replace)', async () => { await composite(); await p.keyboard.press('Shift+ArrowLeft'); await p.keyboard.press('Shift+ArrowLeft'); await p.keyboard.press('Shift+ArrowLeft'); await p.keyboard.type('9'); }, E);
  await H.step('Typing over a selection replaces it', async () => { await fresh('abc'); await p.keyboard.press('Shift+ArrowLeft'); await p.keyboard.press('Shift+ArrowLeft'); await p.keyboard.type('Z'); }, E);
  await H.step('Selecting and pressing a toolbar template wraps selection (sqrt)', async () => { await fresh('abc'); await p.keyboard.press('Control+a'); await H.click('Square root'); }, E);
  await H.step('Ctrl+A in nested slot selects only that slot', async () => { await composite(); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('Control+a'); }, E);
}, {});
