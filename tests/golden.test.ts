import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogue, behaviorOf } from '../src/core/catalogue';
import { EditorCore } from '../src/core/engine';

const EMPTY = '<math xmlns="http://www.w3.org/1998/Math/MathML"/>';
const norm = (s: string) => s.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '');

function digitSet(m?: string): 'western' | 'arabicIndic' | 'easternArabicIndic' {
  if (m && m.includes('&#x6F7;')) return 'easternArabicIndic';
  if (m && m.includes('&#x667;')) return 'arabicIndic';
  return 'western';
}

test('toolbar controls reproduce the golden MathML in states A, A2, B, C', () => {
  const fails: string[] = [];
  let n = 0;
  for (const c of catalogue.controls) {
    // controls added by this product (id TB-n-Xnn) are not in the recorded reference: tests/stacksame.test.ts
    if (behaviorOf(c) !== 'insert' || !c.A || /-X\d+$/.test(c.id)) continue;
    // digit mode contamination of the recorded crawl (Q-08)
    const ds = digitSet(c.A2);
    const run = (setup: (ed: EditorCore) => void) => {
      const ed = new EditorCore();
      ed.setMathML(EMPTY);
      ed.setDigits(ds);
      setup(ed);
      return ed;
    };
    const check = (label: string, got: string, want?: string) => {
      if (want === undefined) return;
      n++;
      if (norm(got) !== norm(want)) fails.push(`${c.id} ${c.title} [${label}]\n    want ${norm(want)}\n    got  ${norm(got)}`);
    };
    let ed = run(() => {});
    ed.activate(c);
    check('A', ed.getMathML(), c.A);
    ed.typeChar('7');
    check('A2', ed.getMathML(), c.A2);
    ed = run((e) => e.typeChar('x'));
    ed.activate(c);
    check('B', ed.getMathML(), c.B);
    ed = run((e) => {
      e.typeChar('x');
      e.moveLeft(true);
    });
    ed.activate(c);
    check('C', ed.getMathML(), c.C);
  }
  console.log('checked', n, 'cases; failures', fails.length);
  if (fails.length) console.log(fails.slice(0, 25).join('\n'));
  assert.equal(fails.length, 0);
});
