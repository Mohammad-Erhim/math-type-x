// Synthetic handwriting corpus: MathML → strokes (stroke fonts), with slant / scale / jitter, as a list of
// {name, mml, x, y, t}.  node tools/gen/hand_corpus.cjs  → tests/oracle/hand_corpus_in.json
import { simulateStrokes } from '../../src/hand/simulate';
import { writeFileSync } from 'node:fs';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const mi = (c: string) => `<mi>${c}</mi>`;
const mn = (c: string) => `<mn>${c}</mn>`;
const mo = (c: string) => `<mo>${c}</mo>`;
const F: Record<string, string> = {};
for (const d of '0123456789') F[d] = mn(d);
for (const c of 'abcdefghijklmnopqrstuvwxyz') F[c] = mi(c);
for (const c of 'ABCDEFGHJKLMNPQRSTUVWXYZ') F[c] = mi(c);
Object.assign(F, {
  '+': mo('+'), '-': mo('-'), '=': mo('='), '(': mo('('), ')': mo(')'), '/': mo('/'),
  '12': mn('12'), '305': mn('305'), '3.14': mn('3.14'),
  'x+1': mi('x') + mo('+') + mn('1'), '2x': mn('2') + mi('x'), 'a=b': mi('a') + mo('=') + mi('b'),
  'x2': `<msup>${mi('x')}${mn('2')}</msup>`, 'x_1': `<msub>${mi('x')}${mn('1')}</msub>`, 'e^x': `<msup>${mi('e')}${mi('x')}</msup>`,
  'frac12': `<mfrac>${mn('1')}${mn('2')}</mfrac>`, 'fracab': `<mfrac>${mi('a')}${mi('b')}</mfrac>`, 'frac x+1 over 2': `<mfrac><mrow>${mi('x') + mo('+') + mn('1')}</mrow>${mn('2')}</mfrac>`,
  'sqrt x': `<msqrt>${mi('x')}</msqrt>`, 'sqrt 2': `<msqrt>${mn('2')}</msqrt>`,
  '(a+b)': `<mfenced><mrow>${mi('a') + mo('+') + mi('b')}</mrow></mfenced>`, '12+34': mn('12') + mo('+') + mn('34'), '5-3': mn('5') + mo('-') + mn('3'),
  'x2+y2=1': `<msup>${mi('x')}${mn('2')}</msup>${mo('+')}<msup>${mi('y')}${mn('2')}</msup>${mo('=')}${mn('1')}`,
  'f(x)': mi('f') + `<mfenced>${mi('x')}</mfenced>`, '3x-2=7': mn('3') + mi('x') + mo('-') + mn('2') + mo('=') + mn('7'),
  'a_n': `<msub>${mi('a')}${mi('n')}</msub>`, '2^10': `<msup>${mn('2')}${mn('10')}</msup>`, 'y=2x+1': mi('y') + mo('=') + mn('2') + mi('x') + mo('+') + mn('1'),
  'a/b': mi('a') + mo('/') + mi('b'), 'x*y': mi('x') + mo('*') + mi('y'), '1.5': mn('1.5'), 'abc': mi('a') + mi('b') + mi('c'),
  'a+b+c': mi('a') + mo('+') + mi('b') + mo('+') + mi('c'), 'x<y': mi('x') + mo('&lt;') + mi('y'), 'x>y': mi('x') + mo('&gt;') + mi('y'),
});
const seeds = Number(process.env.SEEDS ?? 3);
const out: { name: string; mml: string; x: number[][]; y: number[][]; t: number[][] }[] = [];
for (const [name, body] of Object.entries(F)) {
  for (let s = 0; s < seeds; s++) {
    const rand = rng(s * 7919 + name.length * 31 + name.charCodeAt(0));
    const mml = `<math${NS}>${body}</math>`;
    let st = simulateStrokes(mml, 684, 415);
    if (!st.length) continue;
    // global transform: scale, slant, rotation; per-stroke jitter and a little wobble
    const sc = 0.8 + rand() * 0.9;
    const slant = (rand() - 0.5) * 0.5;
    const rot = (rand() - 0.5) * 0.12;
    const xs = st.flatMap((q) => q.x);
    const ys = st.flatMap((q) => q.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const ox = 150 + rand() * 200;
    const oy = 200 + rand() * 40;
    let tt = 0;
    const X: number[][] = [];
    const Y: number[][] = [];
    const T: number[][] = [];
    let prevSym = -1;
    for (const q of st) {
      // strokes of one symbol follow each other quickly, a pause separates the symbols
      if (prevSym >= 0) tt += q.sym === prevSym ? 60 + rand() * 120 : 300 + rand() * 600;
      prevSym = q.sym ?? -1;
      const wob = 1 + rand() * 2.2;
      const sx = (rand() - 0.5) * 3;
      const sy = (rand() - 0.5) * 3;
      const px: number[] = [];
      const py: number[] = [];
      const pt: number[] = [];
      q.x.forEach((x0, i) => {
        let x = (x0 - cx) * sc;
        let y = (q.y[i] - cy) * sc;
        x += slant * -y;
        const xr = x * Math.cos(rot) - y * Math.sin(rot);
        const yr = x * Math.sin(rot) + y * Math.cos(rot);
        px.push(Math.round((ox + xr + sx + (rand() - 0.5) * wob) * 2) / 2);
        py.push(Math.round((oy + yr + sy + (rand() - 0.5) * wob) * 2) / 2);
        pt.push(tt + i * 8);
      });
      tt += q.x.length * 8;
      X.push(px);
      Y.push(py);
      T.push(pt);
    }
    out.push({ name: name + '#' + s, mml, x: X, y: Y, t: T });
  }
}
writeFileSync(process.env.OUT ?? 'tests/oracle/hand_corpus_in.json', JSON.stringify(out));
console.log('samples', out.length);
