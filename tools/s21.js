const { scenario } = require('./sc');
const M = require('./mml');
scenario('s21_caret_probe', async (H) => {
  const { p } = H;
  const composite = async () => { await H.reset(); await H.focusEdit(); await p.keyboard.type('x+1'); await H.click('Fraction (Ctrl+/)'); await p.keyboard.type('a'); await p.keyboard.press('ArrowDown'); await p.keyboard.type('b'); await p.keyboard.press('ArrowRight'); await p.keyboard.type('=2'); await H.sleep(300); };
  // a probe: type Z, read compact MathML, then undo
  const probe = async () => { await p.keyboard.type('Z'); const m = await H.mml(); await p.keyboard.press('Control+z'); await H.sleep(250); return M.compact(M.parse(m)); };
  const seqs = [
    ['(initial caret after typing =2)', []],
    ['ArrowLeft', ['ArrowLeft']], ['ArrowLeft ×2', ['ArrowLeft', 'ArrowLeft']], ['ArrowLeft ×3', ['ArrowLeft', 'ArrowLeft', 'ArrowLeft']],
    ['ArrowLeft ×4', Array(4).fill('ArrowLeft')], ['ArrowLeft ×5', Array(5).fill('ArrowLeft')], ['ArrowLeft ×6', Array(6).fill('ArrowLeft')], ['ArrowLeft ×7', Array(7).fill('ArrowLeft')], ['ArrowLeft ×8', Array(8).fill('ArrowLeft')],
    ['Home', ['Home']], ['Home then ArrowRight ×1', ['Home', 'ArrowRight']], ['Home then ArrowRight ×3', ['Home', 'ArrowRight', 'ArrowRight', 'ArrowRight']], ['Home then ArrowRight ×4', ['Home', ...Array(4).fill('ArrowRight')]], ['Home then ArrowRight ×5', ['Home', ...Array(5).fill('ArrowRight')]],
    ['ArrowLeft ×3 then ArrowUp', [...Array(3).fill('ArrowLeft'), 'ArrowUp']], ['ArrowLeft ×3 then ArrowDown', [...Array(3).fill('ArrowLeft'), 'ArrowDown']],
    ['ArrowLeft ×3, ArrowUp, ArrowDown', [...Array(3).fill('ArrowLeft'), 'ArrowUp', 'ArrowDown']],
    ['ArrowLeft ×3, ArrowUp, Home', [...Array(3).fill('ArrowLeft'), 'ArrowUp', 'Home']], ['ArrowLeft ×3, ArrowUp, End', [...Array(3).fill('ArrowLeft'), 'ArrowUp', 'End']],
    ['ArrowLeft ×3, ArrowUp, ArrowRight', [...Array(3).fill('ArrowLeft'), 'ArrowUp', 'ArrowRight']],
    ['ArrowLeft ×3, ArrowDown, ArrowRight (leave fraction)', [...Array(3).fill('ArrowLeft'), 'ArrowDown', 'ArrowRight']],
    ['ArrowLeft ×3, ArrowDown, ArrowLeft', [...Array(3).fill('ArrowLeft'), 'ArrowDown', 'ArrowLeft']],
    ['Ctrl+ArrowLeft', ['Control+ArrowLeft']], ['Ctrl+ArrowLeft ×2', ['Control+ArrowLeft', 'Control+ArrowLeft']], ['Ctrl+Home', ['Control+Home']], ['Ctrl+End after Home', ['Home', 'Control+End']],
  ];
  for (const [label, keys] of seqs) {
    let res;
    await H.step(`Caret probe: ${label}`, async () => { await composite(); for (const k of keys) await p.keyboard.press(k); res = await probe(); }, { clip: 'edit', extra: async () => ({ typedZ_result: res }), noMathml: true });
  }
}, {});
