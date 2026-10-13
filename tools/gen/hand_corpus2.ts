// Second style: the small hand-tuned stroke font (different shapes from the templates)
import { STROKE_FONT } from '../../src/hand/strokefont';
import { writeFileSync } from 'node:fs';
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const out: { name: string; mml: string; x: number[][]; y: number[][]; t: number[][] }[] = [];
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const chars = '0123456789+-=()/xyabcn'.split('');
const tag = (c: string) => (/\d/.test(c) ? 'mn' : /[a-z]/.test(c) ? 'mi' : 'mo');
for (const c of chars) {
  const f = STROKE_FONT[c];
  if (!f) continue;
  for (let s = 0; s < 6; s++) {
    const rand = rng(s * 977 + c.charCodeAt(0));
    const sc = 40 + rand() * 40;
    const slant = (rand() - 0.5) * 0.4;
    const rot = (rand() - 0.5) * 0.15;
    const ox = 300 + rand() * 100, oy = 200;
    let tt = 0;
    const X: number[][] = [], Y: number[][] = [], T: number[][] = [];
    for (const line of f) {
      const px: number[] = [], py: number[] = [], pt: number[] = [];
      const wob = 1 + rand() * 2;
      for (let i = 0; i + 1 < line.length; i++) for (let k = 0; k < 8; k++) {
        const x0 = line[i][0] + (line[i + 1][0] - line[i][0]) * k / 8, y0 = line[i][1] + (line[i + 1][1] - line[i][1]) * k / 8;
        let x = (x0 - 0.5) * sc, y = (y0 - 0.5) * sc * 1.3;
        x += slant * -y;
        const xr = x * Math.cos(rot) - y * Math.sin(rot), yr = x * Math.sin(rot) + y * Math.cos(rot);
        px.push(Math.round((ox + xr + (rand() - 0.5) * wob) * 2) / 2); py.push(Math.round((oy + yr + (rand() - 0.5) * wob) * 2) / 2); pt.push(tt); tt += 8;
      }
      X.push(px); Y.push(py); T.push(pt); tt += 100;
    }
    const t = tag(c);
    out.push({ name: c + '#' + s, mml: `<math${NS}><${t}>${c === '<' ? '&lt;' : c}</${t}></math>`, x: X, y: Y, t: T });
  }
}
writeFileSync('tests/oracle/hand_corpus2_in.json', JSON.stringify(out));
console.log('samples', out.length);
