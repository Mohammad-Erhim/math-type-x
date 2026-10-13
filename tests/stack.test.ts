import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { catalogue } from '../src/core/catalogue';
import { applyContext } from '../src/core/context';

const strip = (s: string) => s.replace(/ xmlns="[^"]+"/, '');
const scn = (n: string) => JSON.parse(readFileSync(join(process.cwd(), 'evidence/scenarios', n + '.json'), 'utf8')).steps as { n: number; desc: string; mathml: string }[];

test('elementary stack editing reproduces the reference sequence (s16)', () => {
  const ref = scn('s16_elementary');
  const e = new EditorCore();
  e.activate(catalogue.controls.find((x) => x.title === '3 rows stack with line and plus sign')!);
  e.typeText('12');
  e.enter();
  e.typeText('34');
  const at = (n: number) => ref.find((s) => s.n === n)!.mathml;
  assert.equal(strip(e.getMathML()), at(25));
  e.enter();
  e.typeText('5');
  assert.equal(strip(e.getMathML()), at(26));
  e.typeChar(' ');
  e.typeText('6');
  assert.equal(strip(e.getMathML()), at(27));
  const steps: [number, string, string?][] = [
    [28, 'st_carries'], [29, 'st_carry_nw'], [30, 'st_carry_n'], [31, 'st_carry_ne'], [32, 'st_carry_w'], [33, 'st_carry_e'], [34, 'st_carry_sw'],
    [35, 'st_carry_s'], [36, 'st_carry_se'], [37, 'st_prepend'], [38, 'st_append'], [39, 'st_line'], [40, 'st_right'], [41, 'st_left'], [42, 'st_spacing', '15px'],
  ];
  for (const [n, id, v] of steps) {
    applyContext(e, id, v);
    assert.equal(strip(e.getMathML()), at(n), `step ${n} ${id}`);
  }
});

test('stack contextual controls from a finished stack (s10b)', () => {
  const steps = scn('s10b_ctx_stack');
  const init = steps[0].mathml;
  const byTitle: Record<string, string> = {
    'Insert line': 'st_line', 'Up diagonal strike': 'st_strike', 'Prepend row': 'st_prepend', 'Append row': 'st_append', 'Insert carries in this row': 'st_carries',
    'Move to left': 'st_left', 'Move to right': 'st_right',
  };
  for (const s of steps.slice(1)) {
    const m = /^stack \/ (.+?) \((?:button|select)\) -> (click|option "(.*)")$/.exec(s.desc);
    if (!m) continue;
    const id = byTitle[m[1]] ?? (m[1] === 'Spacing between digits' ? 'st_spacing' : null);
    if (!id) continue;
    const e = new EditorCore();
    e.setMathML(init.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"'));
    // the controls belong to the stack: the caret sits at the end of its level (after the stack itself there are none)
    e.caret = { path: [[0, 0]], index: e.row[0].c![0].length };
    applyContext(e, id, m[3]);
    assert.equal(strip(e.getMathML()), s.mathml, s.desc);
  }
});
