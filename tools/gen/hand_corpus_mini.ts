import { simulateStrokes } from '../../src/hand/simulate';
import { writeFileSync } from 'node:fs';
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const F: Record<string, string> = {
  'x-y': '<mi>x</mi><mo>-</mo><mi>y</mi>', '2-1': '<mn>2</mn><mo>-</mo><mn>1</mn>', 'a=b': '<mi>a</mi><mo>=</mo><mi>b</mi>', 'x/y': '<mi>x</mi><mo>/</mo><mi>y</mi>',
  'x2': '<msup><mi>x</mi><mn>2</mn></msup>', 'a+b+c': '<mi>a</mi><mo>+</mo><mi>b</mi><mo>+</mo><mi>c</mi>', '(x)': '<mfenced><mi>x</mi></mfenced>',
  'sqrt x': '<msqrt><mi>x</mi></msqrt>', 'frac': '<mfrac><mn>1</mn><mn>2</mn></mfrac>', 'xy': '<mi>x</mi><mi>y</mi>', '2x': '<mn>2</mn><mi>x</mi>',
  '3.5': '<mn>3.5</mn>', 'pi': '<mi>&#x3C0;</mi>', 'leq': '<mi>a</mi><mo>&#x2264;</mo><mi>b</mi>', 'sin x': '<mi>s</mi><mi>i</mi><mi>n</mi><mi>x</mi>',
};
const out: unknown[] = [];
for (const [name, body] of Object.entries(F)) {
  const st = simulateStrokes(`<math${NS}>${body}</math>`, 684, 415);
  let tt = 0, prev = -1;
  const X: number[][] = [], Y: number[][] = [], T: number[][] = [];
  st.forEach((q) => {
    if (prev >= 0) tt += q.sym === prev ? 80 : 350;
    prev = q.sym ?? -1;
    X.push(q.x.map((v) => Math.round(v / 2 + 120))); Y.push(q.y.map((v) => Math.round(v / 2 + 120)));
    T.push(q.x.map((_, i) => tt + i * 8)); tt += q.x.length * 8;
  });
  out.push({ name, mml: `<math${NS}>${body}</math>`, x: X, y: Y, t: T });
}
writeFileSync('tests/oracle/hand_mini_in.json', JSON.stringify(out));
console.log(out.length);
