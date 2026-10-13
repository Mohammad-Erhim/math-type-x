// Random formulas (grammar) drawn with the stroke font plus noise: truth = the formula it was built from.
import { simulateStrokes } from '../../src/hand/simulate';
import { writeFileSync } from 'node:fs';
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const N = Number(process.env.N ?? 160);
const out: { name: string; mml: string; x: number[][]; y: number[][]; t: number[][] }[] = [];
for (let n = 0; n < N; n++) {
  const rand = rng(n * 7919 + 13);
  const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)];
  const num = () => { const k = 1 + Math.floor(rand() * 2.2); let s = ''; for (let i = 0; i < k; i++) s += pick([...'0123456789']); return s; };
  const id = () => pick([...'xyzabnmkt']);
  const atom = (): string => (rand() < 0.5 ? `<mn>${num()}</mn>` : `<mi>${id()}</mi>`);
  const small = (): string => (rand() < 0.6 ? `<mn>${pick([...'0123456789'])}</mn>` : `<mi>${pick([...'nxk'])}</mi>`);
  const term = (): string => {
    const r = rand();
    if (r < 0.55) return atom();
    if (r < 0.7) return `<msup>${atom()}${small()}</msup>`;
    if (r < 0.78) return `<msub><mi>${id()}</mi>${small()}</msub>`;
    if (r < 0.88) return `<mfrac>${atom()}${atom()}</mfrac>`;
    if (r < 0.94) return `<msqrt>${atom()}</msqrt>`;
    return `<mfenced><mrow>${atom()}<mo>+</mo>${atom()}</mrow></mfenced>`;
  };
  const len = 1 + Math.floor(rand() * 4);
  let body = '';
  for (let i = 0; i < len; i++) {
    if (i) body += `<mo>${pick(['+', '-', '='])}</mo>`;
    body += term();
  }
  // merge adjacent numbers like the recogniser does
  const mml = `<math${NS}>${body}</math>`;
  const st = simulateStrokes(mml, 684, 415);
  if (!st.length) continue;
  const sc = 0.9 + rand() * 0.6;
  const slant = (rand() - 0.5) * 0.35;
  const rot = (rand() - 0.5) * 0.08;
  const xs = st.flatMap((q) => q.x), ys = st.flatMap((q) => q.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const ox = 340, oy = 207;
  let tt = 0, prevSym = -1;
  const X: number[][] = [], Y: number[][] = [], T: number[][] = [];
  for (const q of st) {
    if (prevSym >= 0) tt += q.sym === prevSym ? 60 + rand() * 120 : 250 + rand() * 600;
    prevSym = q.sym ?? -1;
    const wob = 1 + rand() * 1.6;
    const px: number[] = [], py: number[] = [], pt: number[] = [];
    q.x.forEach((x0, i) => {
      let x = (x0 - cx) * sc, y = (q.y[i] - cy) * sc;
      x += slant * -y;
      const xr = x * Math.cos(rot) - y * Math.sin(rot), yr = x * Math.sin(rot) + y * Math.cos(rot);
      px.push(Math.round((ox + xr + (rand() - 0.5) * wob) * 2) / 2); py.push(Math.round((oy + yr + (rand() - 0.5) * wob) * 2) / 2); pt.push(tt + i * 8);
    });
    tt += q.x.length * 8;
    X.push(px); Y.push(py); T.push(pt);
  }
  out.push({ name: 'r' + n, mml, x: X, y: Y, t: T });
}
writeFileSync('tests/oracle/hand_corpus3_in.json', JSON.stringify(out));
console.log('samples', out.length);
