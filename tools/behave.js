const M = require('./mml');
const { parse, compact, kidsEl, textOf, findPath, wherePath, NAMES } = M;
const PICKER = new Set(['Table', 'Matrix with vertical bars', 'Matrix with square brackets', 'Matrix with parenthesis']);
const SEVENS = new Set(['7', '\u0667', '\u06F7']);
function leafPath(tree, ch) { return findPath(tree, n => (n.name === 'mi' || n.name === 'mn' || n.name === 'mo') && (ch === '7' ? SEVENS.has(textOf(n)) : textOf(n) === ch)); }
function behaviorText(rec) {
  if (rec.skipped) return ['Handled in dedicated sections (clipboard / undo-redo / formatting / dialogs).'];
  if (!rec.cases || !rec.cases.A) return ['No data captured: ' + (rec.error || 'unknown error')];
  const out = [];
  const A = parse(rec.cases.A.mathml), A2 = parse(rec.cases.A2 && rec.cases.A2.mathml), B = parse(rec.cases.B && rec.cases.B.mathml), C = parse(rec.cases.C && rec.cases.C.mathml);
  const ca = compact(A), cb = compact(B), cc = compact(C);
  if (PICKER.has(rec.title)) { return ['Opens the table/matrix size picker instead of inserting immediately (see section “Matrix and table size picker”). Clicking inside the editing area or pressing Escape closes it without inserting.']; }
  const emptyA = kidsEl(A).length === 0;
  if (emptyA) out.push('On an empty editor the click inserts nothing visible' + (kidsEl(A2).length ? ', but typed text afterwards appears: ' + compact(A2) : '') + '.');
  else out.push('Empty editor → inserts ' + ca + '.');
  if (A2 && !emptyA) {
    const p7 = leafPath(A2, '7');
    if (p7) {
      const w = wherePath(p7);
      const rootChild = p7.length === 2; // math > mn
      if (w) out.push('The caret is placed ' + (w.startsWith('inside') ? w : 'in the ' + w) + '; the next typed character goes there (typed “7” → ' + compact(A2) + ').');
      else if (rootChild) out.push('The caret ends after the inserted element; typed characters follow it (typed “7” → ' + compact(A2) + ').');
      else out.push('Typing “7” right after the click gives ' + compact(A2) + '.');
    }
  }
  if (B) {
    if (cb === 'x ' + ca) out.push('With “x” already typed and the caret after it, the element is added after “x”; existing content is not changed.');
    else out.push('With “x” typed before the caret: ' + cb + (/^x[\^_]/.test(cb) || /^\(?x\)?[\^_]/.test(cb) ? ' (the previous character becomes the base of the new structure).' : '.'));
  }
  if (C) {
    const px = leafPath(C, 'x');
    const hasX = !!px;
    if (hasX && cc !== 'x ' + ca) {
      const w = wherePath(px);
      out.push('With “x” selected, the selection is taken into the new structure' + (w ? ' (' + (w.startsWith('inside') ? w : 'as the ' + w) + ')' : '') + ': ' + cc + '.');
    } else if (!hasX) out.push('With “x” selected, the selection is replaced by the element: ' + cc + '.');
    else out.push('With “x” selected: ' + cc + '.');
  }
  return out;
}
module.exports = { behaviorText, PICKER };
