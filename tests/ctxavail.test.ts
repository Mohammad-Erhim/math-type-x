/** controls that cannot do anything where the caret / selection is are disabled; a selected structure also offers nudges */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorCore } from '../src/core/engine';
import { DocGeometry } from '../src/layout/geometry';
import { handleKey } from '../src/core/keys';
import { locate, controlsFor } from '../src/core/context';

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
function at(mml: string, steps: number, select = 0, extras = false): EditorCore {
  const e = new EditorCore();
  e.geometry = new DocGeometry(e);
  e.contextExtras = extras;
  e.setMathML(`<math${NS}>${mml}</math>`);
  const host = { ed: e, runGeneral() {} };
  handleKey(host as any, 'Home', {} as any);
  for (let i = 0; i < steps; i++) handleKey(host as any, 'ArrowRight', {} as any);
  for (let i = 0; i < select; i++) handleKey(host as any, 'ArrowRight', { shift: true } as any);
  return e;
}
const state = (e: EditorCore) => Object.fromEntries(controlsFor(locate(e)!).map((c) => [c.id, !!c.disabled]));

test('removing what is not there is disabled', () => {
  const e = at('<mtable><mtr><mtd><mi>a</mi></mtd></mtr></mtable>', 1);
  const s = state(e);
  assert.equal(s.row_remove, true);
  assert.equal(s.col_remove, true);
  assert.equal(s.frame_remove, true);
  assert.equal(s.line_below_remove, true);
  assert.equal(s.row_below, false);
});

test('nudging lines is disabled, a selected structure can be nudged', () => {
  const lines = at('<mi>a</mi><mspace linebreak="newline"/><mi>b</mi>', 0, 2);
  assert.equal(state(lines).nudge_up, true);
  const frac = at('<mi>a</mi><mfrac><mi>x</mi><mi>y</mi></mfrac>', 1, 1, true);
  const s = state(frac);
  assert.equal(s.nudge_up, false);
  assert.ok('valign_middle' in s);
});
