import test from 'node:test';
import assert from 'node:assert/strict';
import { recognize } from '../src/hand/recognize';
import { simulateStrokes } from '../src/hand/simulate';

const strip = (s: string) => s.replace(/ xmlns="[^"]*"/, '');

for (const [src, want] of [
  ['<math><mn>12</mn><mo>+</mo><mn>7</mn></math>', '<math><mn>12</mn><mo>+</mo><mn>7</mn></math>'],
  ['<math><mi>x</mi><mo>=</mo><mn>3</mn></math>', '<math><mi>x</mi><mo>=</mo><mn>3</mn></math>'],
  ['<math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>', '<math><mfrac><mrow><mn>1</mn></mrow><mrow><mn>2</mn></mrow></mfrac></math>'],
] as const) {
  test('recognise simulated strokes: ' + src, () => {
    const st = simulateStrokes(src, 684, 415);
    const r = recognize({ x: st.map((s) => s.x), y: st.map((s) => s.y) });
    assert.equal(strip(r.mathml), want);
  });
}
