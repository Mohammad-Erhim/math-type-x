/**
 * Small offline handwriting recogniser (digits, a few letters, + - = / ( ) x, fractions and scripts).
 * It is the built-in engine behind /hand/recognize and the client fallback; the endpoint contract
 * ({result:{mathml,score}}) lets a stronger recogniser replace it.
 */
import { STROKE_FONT } from './strokefont';
import { HERSHEY } from './hershey';
import { escText } from '../core/mathml';

export interface Strokes {
  x: number[][];
  y: number[][];
}
type Pt = [number, number];
interface Sym {
  strokes: Pt[][];
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  ch?: string;
  score?: number;
  kind?: 'num' | 'id' | 'op' | 'bar' | 'unknown';
}

const N = 32;

function bbox(pts: Pt[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

/** resample the whole symbol (all strokes) into N points along the path, normalised to a unit square */
function cloud(strokes: Pt[][]): Pt[] {
  const all = strokes.flat();
  const b = bbox(all);
  const s = Math.max(b.x1 - b.x0, b.y1 - b.y0) || 1;
  const pts: Pt[] = [];
  let total = 0;
  const segs: [Pt, Pt, number][] = [];
  for (const st of strokes) {
    for (let i = 1; i < st.length; i++) {
      const d = Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]);
      segs.push([st[i - 1], st[i], d]);
      total += d;
    }
  }
  if (!segs.length) return Array.from({ length: N }, () => [0.5, 0.5] as Pt);
  const step = total / (N - 1);
  let acc = 0;
  let next = 0;
  for (const [a, c, d] of segs) {
    while (d > 0 && next <= acc + d + 1e-9 && pts.length < N) {
      const t = (next - acc) / d;
      pts.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]);
      next += step;
    }
    acc += d;
  }
  while (pts.length < N) pts.push(segs[segs.length - 1][1]);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  return pts.map(([x, y]) => [(x - cx) / s + 0.5, (y - cy) / s + 0.5] as Pt);
}

function cloudDist(a: Pt[], b: Pt[]): number {
  // greedy point-cloud matching ($P)
  const n = a.length;
  const used = new Array(n).fill(false);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let best = Infinity;
    let bj = -1;
    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      const d = Math.hypot(a[i][0] - b[j][0], a[i][1] - b[j][1]);
      if (d < best) {
        best = d;
        bj = j;
      }
    }
    used[bj] = true;
    sum += best * (1 - i / n + 0.5);
  }
  return sum / n;
}

const TEMPLATES: { ch: string; cloud: Pt[]; strokes: number }[] = [];

/** polylines of a Hershey glyph path ("M x,y L x,y x,y M …") */
function hersheyStrokes(d: string): Pt[][] {
  const out: Pt[][] = [];
  for (const part of d.split('M').slice(1)) {
    const nums = part.replace(/L/g, ' ').trim().split(/\s+/).map((p) => p.split(',').map(Number));
    out.push(nums.map(([x, y]) => [x, y] as Pt));
  }
  return out;
}

for (const [ch, d] of Object.entries(HERSHEY)) {
  if (!/^[0-9A-Za-z]$/.test(ch)) continue; // operators and brackets are handled by rules
  const st = hersheyStrokes(d);
  // the Hershey 'l' / 'I' / '|' are plain verticals: they are confusable with 1 and brackets, so skip them
  if (ch === 'l' || ch === 'I' || ch === 'i' || ch === 'j') continue;
  TEMPLATES.push({ ch, cloud: cloud(st), strokes: st.length });
}
// the small built-in font adds a few hand-tuned shapes (italic x, y, flagged 1, 7 …)
for (const [ch, lines] of Object.entries(STROKE_FONT)) {
  if ('-=+/()'.includes(ch)) continue;
  const st = lines.map((l) => l.map(([x, y]) => [x, y] as Pt));
  TEMPLATES.push({ ch, cloud: cloud(st), strokes: st.length });
}

function classify(sym: Sym): void {
  const w = sym.x1 - sym.x0;
  const h = sym.y1 - sym.y0;
  const n = sym.strokes.length;
  const asp = w / (h || 1);
  if (n === 1 && h < 0.2 * w + 4 && w > 6) {
    sym.ch = '-';
    sym.kind = 'op';
    sym.score = 0.9;
    return;
  }
  if (n === 2) {
    const [a, b] = sym.strokes.map(bbox);
    const flat = (r: ReturnType<typeof bbox>) => r.y1 - r.y0 < 0.35 * (r.x1 - r.x0) + 3;
    if (flat(a) && flat(b)) {
      sym.ch = '=';
      sym.kind = 'op';
      sym.score = 0.9;
      return;
    }
    const fa = flat(a);
    const fb = flat(b);
    if ((fa && !fb && b.y1 - b.y0 > 0.5 * h) || (fb && !fa && a.y1 - a.y0 > 0.5 * h)) {
      const hz = fa ? a : b;
      const vt = fa ? b : a;
      if (Math.abs((hz.y0 + hz.y1) / 2 - (vt.y0 + vt.y1) / 2) < 0.3 * h && Math.abs((vt.x0 + vt.x1) / 2 - (hz.x0 + hz.x1) / 2) < 0.3 * w) {
        sym.ch = '+';
        sym.kind = 'op';
        sym.score = 0.85;
        return;
      }
    }
  }
  if (n === 1 && asp < 0.6 && h > 6) {
    // line-like strokes: 1, / or a bracket
    const pts = sym.strokes[0];
    const first = pts[0];
    const last = pts[pts.length - 1];
    const mid = pts[Math.floor(pts.length / 2)];
    const chord = Math.hypot(last[0] - first[0], last[1] - first[1]) || 1;
    // maximal deviation from the chord and where along the path it happens
    let bulge = 0;
    let at = 0;
    let acc = 0;
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const dev = Math.abs((last[0] - first[0]) * (first[1] - pts[i][1]) - (first[0] - pts[i][0]) * (last[1] - first[1])) / chord;
      if (dev > bulge) {
        bulge = dev;
        at = acc / (total || 1);
      }
    }
    if (bulge > 0.12 * h && asp < 0.5 && at > 0.3 && at < 0.7) {
      sym.ch = mid[0] < (first[0] + last[0]) / 2 ? '(' : ')';
      sym.kind = 'op';
      sym.score = 0.8;
      return;
    }
    if (bulge > 0.12 * h && at <= 0.3 && asp < 0.3) {
      // flagged one
      sym.ch = '1';
      sym.kind = 'num';
      sym.score = 0.8;
      return;
    }
    if (bulge <= 0.12 * h) {
      const slant = Math.abs(last[0] - first[0]) / (Math.abs(last[1] - first[1]) || 1);
      if (asp < 0.3 && (slant < 0.3 || asp < 0.22)) {
        sym.ch = '1';
        sym.kind = 'num';
        sym.score = 0.85;
        return;
      }
      if (last[1] < first[1] ? last[0] > first[0] : last[0] < first[0]) {
        sym.ch = '/';
        sym.kind = 'op';
        sym.score = 0.8;
        return;
      }
    }
  }
  const c = cloud(sym.strokes);
  let best = Infinity;
  let bch = '?';
  for (const t of TEMPLATES) {
    const d = (cloudDist(c, t.cloud) + cloudDist(t.cloud, c)) / 2 + (t.strokes === n ? 0 : 0.03 * Math.abs(t.strokes - n));
    if (d < best) {
      best = d;
      bch = t.ch;
    }
  }
  // shapes that look the same in both cases are read as lower case
  if (/^[CcOoSsUuVvWwXxZz]$/.test(bch)) bch = bch.toLowerCase();
  sym.ch = bch;
  sym.score = Math.max(0, Math.min(1, 1 - best * 2.2));
  sym.kind = /[0-9]/.test(bch) ? 'num' : /[a-zA-Z]/.test(bch) ? 'id' : 'op';
}

function groupSymbols(strokes: Pt[][]): Sym[] {
  const items: Sym[] = strokes.map((s) => ({ strokes: [s], ...bbox(s) }));
  const flat = (s: Sym) => s.strokes.length === 1 && s.x1 - s.x0 > 12 && s.y1 - s.y0 < 0.25 * (s.x1 - s.x0);
  // a long flat stroke with content above and below (within its x-range) is a fraction line: never merged
  const bars = new Set<Sym>();
  for (const a of items) {
    if (!flat(a)) continue;
    const within = (s: Sym) => s !== a && (s.x0 + s.x1) / 2 >= a.x0 - 4 && (s.x0 + s.x1) / 2 <= a.x1 + 4;
    const up = items.some((s) => within(s) && (s.y0 + s.y1) / 2 < a.y0 && s.y1 <= a.y0 + 6);
    const down = items.some((s) => within(s) && (s.y0 + s.y1) / 2 > a.y1 && s.y0 >= a.y1 - 6);
    if (up && down) bars.add(a);
  }
  const median = [...items].map((s) => Math.max(s.y1 - s.y0, s.x1 - s.x0)).sort((a, b) => a - b)[Math.floor(items.length / 2)] || 10;
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (bars.has(a) || bars.has(b)) continue;
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const gapY = Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1);
        const small = Math.min(a.x1 - a.x0, b.x1 - b.x0);
        // stacked strokes (=, ‹i›-dots, ÷) or crossing strokes (x, +)
        if (ox >= 0.3 * small && ox >= 0 && gapY < 0.6 * median) {
          a.strokes.push(...b.strokes);
          Object.assign(a, bbox(a.strokes.flat()));
          items.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  return items.sort((a, b) => a.x0 - b.x0);
}

interface Node {
  s: Sym;
  mml?: string;
}

function tok(sym: Sym): string {
  const c = sym.ch ?? '?';
  if (/[0-9]/.test(c)) return `<mn>${c}</mn>`;
  if (/[a-zA-Z]/.test(c)) return `<mi>${escText(c)}</mi>`;
  return `<mo>${escText(c === '-' ? '−' : c)}</mo>`;
}

function mergeNums(parts: string[]): string {
  const out: string[] = [];
  for (const p of parts) {
    const prev = out[out.length - 1];
    const m = /^<mn>(\d+)<\/mn>$/.exec(p);
    const pm = prev ? /^<mn>(\d+)<\/mn>$/.exec(prev) : null;
    if (m && pm) out[out.length - 1] = `<mn>${pm[1]}${m[1]}</mn>`;
    else out.push(p);
  }
  return out.join('');
}

function build(syms: Sym[]): string {
  if (!syms.length) return '';
  // fractions: a bar with symbols above and below inside its x-range
  const bars = syms.filter((s) => s.ch === '-' && s.x1 - s.x0 > 14);
  for (const bar of bars) {
    const inside = (s: Sym) => s !== bar && (s.x0 + s.x1) / 2 >= bar.x0 - 2 && (s.x0 + s.x1) / 2 <= bar.x1 + 2;
    const above = syms.filter((s) => inside(s) && s.y1 <= bar.y0 + 4 && (s.y0 + s.y1) / 2 < bar.y0);
    const below = syms.filter((s) => inside(s) && s.y0 >= bar.y1 - 4 && (s.y0 + s.y1) / 2 > bar.y1);
    if (above.length && below.length) {
      const used = new Set<Sym>([bar, ...above, ...below]);
      const num = build(above);
      const den = build(below);
      const frac = `<mfrac><mrow>${num}</mrow><mrow>${den}</mrow></mfrac>`;
      // place the fraction where the bar is
      const rest = syms.filter((s) => !used.has(s));
      const before = rest.filter((s) => (s.x0 + s.x1) / 2 < (bar.x0 + bar.x1) / 2);
      const after = rest.filter((s) => (s.x0 + s.x1) / 2 >= (bar.x0 + bar.x1) / 2);
      return build(before) + frac + build(after);
    }
  }
  // scripts: symbols clearly above (or below) the running baseline and small
  const heights = syms.map((s) => s.y1 - s.y0).sort((a, b) => a - b);
  const mh = heights[Math.floor(heights.length / 2)] || 1;
  const parts: string[] = [];
  let baseBottom = syms[0].y1;
  let baseTop = syms[0].y0;
  let i = 0;
  while (i < syms.length) {
    const s = syms[i];
    const prevBase = i > 0;
    const cy = (s.y0 + s.y1) / 2;
    const baseMid = (baseTop + baseBottom) / 2;
    const small = s.y1 - s.y0 < 0.75 * (baseBottom - baseTop) + 2;
    if (prevBase && small && s.kind !== 'op' && cy < baseMid - 0.25 * (baseBottom - baseTop) && s.y1 < baseBottom - 0.25 * (baseBottom - baseTop)) {
      // superscript run
      const run: Sym[] = [s];
      let k = i + 1;
      while (k < syms.length && (syms[k].y0 + syms[k].y1) / 2 < baseMid - 0.1 * mh && syms[k].kind !== 'op') run.push(syms[k++]);
      const last = parts.pop() ?? '<mrow/>';
      parts.push(`<msup><mrow>${last}</mrow><mrow>${mergeNums(run.map(tok))}</mrow></msup>`);
      i = k;
      continue;
    }
    parts.push(tok(s));
    if (s.kind !== 'op' || s.ch === ')' || s.ch === '(') {
      baseBottom = s.y1;
      baseTop = s.y0;
    }
    i++;
  }
  void mh;
  return mergeNums(parts);
}

export function recognize(input: Strokes): { mathml: string; score: number } {
  const strokes: Pt[][] = [];
  for (let i = 0; i < input.x.length; i++) {
    const xs = input.x[i] ?? [];
    const ys = input.y[i] ?? [];
    const pts: Pt[] = [];
    for (let k = 0; k < Math.min(xs.length, ys.length); k++) if (Number.isFinite(xs[k]) && Number.isFinite(ys[k])) pts.push([xs[k], ys[k]]);
    if (pts.length) strokes.push(pts);
  }
  if (!strokes.length) return { mathml: '<math xmlns="http://www.w3.org/1998/Math/MathML"/>', score: 0 };
  const syms = groupSymbols(strokes);
  syms.forEach(classify);
  const body = build(syms);
  const score = syms.reduce((a, s) => a + (s.score ?? 0), 0) / syms.length;
  return { mathml: `<math xmlns="http://www.w3.org/1998/Math/MathML">${body}</math>`, score: Math.round(score * 100) / 100 };
}
void 0;
