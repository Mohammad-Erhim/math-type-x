import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { locate, controlsFor, applyContext } from '../src/core/context';

const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const M = (x: string) => `<math ${NS}>${x}</math>`;
// documents and caret positions of tools/s23.js
const SETUPS: Record<string, { mml: string; left: number }> = {
  matrix: { mml: M('<mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced>'), left: 5 },
  operator: { mml: M('<mi>x</mi><mo>+</mo><mi>y</mi>'), left: 1 },
  mspace: { mml: M('<mi>a</mi><mspace width="1em" height="3ex" depth="2ex"/><mi>b</mi>'), left: 1 },
  fence_in: { mml: M('<mfenced open="[" close="]"><mi>x</mi><mo>+</mo><mn>1</mn></mfenced>'), left: 3 },
};
const strip = (m: string) => m.replace(/ xmlns="[^"]+"/, '');

/** length fields (reference scenario s23): value typed into the "Value" input and confirmed with Enter */
test('length fields write the recorded attributes', () => {
  const steps: any[] = JSON.parse(readFileSync(join(process.cwd(), 'evidence/scenarios/s23_length_fields.json'), 'utf8')).steps;
  const bad: string[] = [];
  let n = 0;
  for (const s of steps) {
    const m = /^\[(\w+)\] "(.+)": Ctrl\+A, type "(.*)", Enter$/.exec(s.desc);
    // steps whose click timed out in the reference recording carry no information
    if (!m || s.err) continue;
    const su = SETUPS[m[1]];
    const ed = new EditorCore();
    ed.setMathML(su.mml);
    for (let i = 0; i < su.left; i++) ed.moveLeft();
    const loc = locate(ed);
    assert.ok(loc, s.desc);
    const ctl = controlsFor(loc!).find((c) => c.title === m[2]);
    assert.ok(ctl, `${s.desc}: control missing`);
    applyContext(ed, ctl!.id, m[3]);
    n++;
    if (strip(ed.getMathML()) !== strip(s.mathml)) bad.push(`${s.n} ${s.desc}\n   want ${strip(s.mathml)}\n   got  ${strip(ed.getMathML())}`);
  }
  console.log(`length fields: ${n - bad.length}/${n} equal`);
  if (bad.length) console.log(bad.slice(0, 12).join('\n'));
  assert.ok(n > 40);
  assert.equal(bad.length, 0);
});
