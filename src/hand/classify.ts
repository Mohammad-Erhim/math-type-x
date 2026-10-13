/**
 * Symbol classifier of the handwriting recogniser: multi-stroke template matching in the spirit of $N.
 * A candidate (the strokes of one symbol) is resampled into one polyline, compared with every stroke order and
 * direction of every template (so the way a symbol is drawn does not matter) and ranked by the mean distance
 * in a unit box, plus small penalties for a different aspect ratio or number of strokes.
 */
import { allGlyphs, Pt } from './glyphs';

const M = 40;

export interface Cand {
  ch: string;
  d: number;
}

interface Tmpl {
  ch: string;
  n: number;
  asp: number;
  pts: Float32Array;
  /** every fourth point: the cheap first-stage comparison */
  coarse: Float32Array;
  /** vertical extent of the glyph in cap-height units (baseline = 1, top of capitals = 0, descenders > 1) */
  top: number;
  bottom: number;
}

const len = (s: Pt[]): number => {
  let l = 0;
  for (let i = 1; i < s.length; i++) l += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
  return l;
};

export function bbox(strokes: Pt[][]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const s of strokes) {
    for (const [x, y] of s) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1 };
}

/** resample the strokes (in the given order and direction) into M points spread by length, then normalise into a unit box */
/** a polyline resampled into n points evenly spaced along its length */
function evenly(st: Pt[], n: number): Pt[] {
  const l = len(st);
  if (l < 1e-9 || st.length < 2 || n < 2) return Array.from({ length: Math.max(n, 1) }, () => st[0]);
  const out: Pt[] = [];
  let seg = 1;
  let acc = 0;
  let segLen = Math.hypot(st[1][0] - st[0][0], st[1][1] - st[0][1]);
  for (let i = 0; i < n; i++) {
    const target = (l * i) / (n - 1);
    while (seg < st.length - 1 && acc + segLen < target - 1e-12) {
      acc += segLen;
      seg++;
      segLen = Math.hypot(st[seg][0] - st[seg - 1][0], st[seg][1] - st[seg - 1][1]);
    }
    const t = segLen > 0 ? Math.min(1, Math.max(0, (target - acc) / segLen)) : 0;
    out.push([st[seg - 1][0] + (st[seg][0] - st[seg - 1][0]) * t, st[seg - 1][1] + (st[seg][1] - st[seg - 1][1]) * t]);
  }
  return out;
}

/** drop jitter: even resampling (so that sparse and dense input are treated alike) and a moving average */
function denoise(strokes: Pt[][]): Pt[][] {
  const lens = strokes.map(len);
  const total = lens.reduce((a, c) => a + c, 0) || 1;
  const N = 150;
  return strokes.map((st, i) => {
    if (st.length < 2 || lens[i] < 1e-9) return st;
    const n = Math.max(6, Math.round((N * lens[i]) / total));
    const pts = evenly(st, n);
    const r = Math.max(1, Math.round(n / 40));
    return pts.map((_q, k) => {
      const lo = Math.max(0, k - r);
      const hi = Math.min(n - 1, k + r);
      // the window shrinks at the ends, so that the end points stay where they are
      const half = Math.min(k - lo, hi - k);
      let sx = 0;
      let sy = 0;
      for (let q = k - half; q <= k + half; q++) {
        sx += pts[q][0];
        sy += pts[q][1];
      }
      const c = 2 * half + 1;
      return [sx / c, sy / c] as Pt;
    });
  });
}

function vector(strokesIn: Pt[][]): { pts: Float32Array; asp: number } {
  return finish(denoise(strokesIn));
}

/** normalise already denoised strokes into the unit box and resample them into M points */
function finish(strokes: Pt[][]): { pts: Float32Array; asp: number } {
  const b = bbox(strokes);
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  const s = Math.max(w, h) || 1;
  const ox = (s - w) / 2 - b.x0;
  const oy = (s - h) / 2 - b.y0;
  const norm = strokes.map((st) => st.map(([x, y]) => [(x + ox) / s, (y + oy) / s] as Pt));
  const lens = norm.map(len);
  const total = lens.reduce((a, c) => a + c, 0) || 1;
  // points per stroke: proportional to the length, at least 3 (a dot is three equal points)
  let alloc = lens.map((l) => Math.max(3, Math.round((l / total) * M)));
  let sum = alloc.reduce((a, c) => a + c, 0);
  while (sum > M && alloc.some((a) => a > 3)) {
    const i = alloc.indexOf(Math.max(...alloc));
    alloc[i]--;
    sum--;
  }
  while (sum < M) {
    const i = alloc.indexOf(Math.max(...alloc.map((a, k) => (lens[k] / alloc[k]) * 1e6)));
    void i;
    const k = lens.map((l, j) => l / alloc[j]).reduce((best, v, j, arr) => (v > arr[best] ? j : best), 0);
    alloc[k]++;
    sum++;
  }
  const out = new Float32Array(sum * 2);
  let o = 0;
  norm.forEach((st, si) => {
    const n = alloc[si];
    const l = lens[si];
    if (l < 1e-9 || st.length < 2) {
      for (let i = 0; i < n; i++) {
        out[o++] = st[0][0];
        out[o++] = st[0][1];
      }
      return;
    }
    let seg = 1;
    let acc = 0;
    let segLen = Math.hypot(st[1][0] - st[0][0], st[1][1] - st[0][1]);
    for (let i = 0; i < n; i++) {
      const target = (l * i) / (n - 1);
      while (seg < st.length - 1 && acc + segLen < target - 1e-12) {
        acc += segLen;
        seg++;
        segLen = Math.hypot(st[seg][0] - st[seg - 1][0], st[seg][1] - st[seg - 1][1]);
      }
      const t = segLen > 0 ? Math.min(1, Math.max(0, (target - acc) / segLen)) : 0;
      out[o++] = st[seg - 1][0] + (st[seg][0] - st[seg - 1][0]) * t;
      out[o++] = st[seg - 1][1] + (st[seg][1] - st[seg - 1][1]) * t;
    }
  });
  return { pts: out, asp: Math.min(20, Math.max(0.05, (w || 0.01) / (h || 0.01))) };
}

function permutations<T>(a: T[]): T[][] {
  if (a.length <= 1) return [a.slice()];
  const out: T[][] = [];
  a.forEach((x, i) => {
    for (const p of permutations([...a.slice(0, i), ...a.slice(i + 1)])) out.push([x, ...p]);
  });
  return out;
}

const TEMPLATES: Tmpl[] = [];

/** extra look-alikes of a glyph: slanted and narrower / wider versions, so one drawing per class covers more hands */
function variants(strokes: Pt[][]): Pt[][][] {
  const out: Pt[][][] = [];
  const mid = 11.5;
  for (const k of [-0.25, 0, 0.25]) {
    for (const sx of [0.72, 1, 1.4]) {
      for (const sy of [0.75, 1, 1.35]) {
        out.push(strokes.map((s) => s.map(([x, y]) => [(x + k * (mid - y)) * sx, y * sy] as Pt)));
      }
    }
  }
  return out;
}

const AFFINE: [number, number, number][] = [];
// the glyph as it is, plus slanted / narrower / wider / flatter looks of it
for (const [k, sx, sy] of [[0, 1, 1], [-0.22, 1, 1], [0.22, 1, 1], [0, 0.72, 1], [0, 1.4, 1], [0, 1, 0.75], [0, 1, 1.35], [0.2, 0.75, 1], [-0.2, 1.3, 1], [0, 1.3, 0.8], [0.2, 1, 0.8], [-0.2, 0.8, 1.2]] as [number, number, number][]) AFFINE.push([k, sx, sy]);

function build(): void {
  const mid = 11.5;
  for (const g of allGlyphs()) {
    const b = bbox(g.strokes);
    const top = (b.y0 - 1) / 21;
    const bottom = (b.y1 - 1) / 21;
    const n = g.strokes.length;
    const orders = n <= 3 ? permutations([...g.strokes.keys()]) : [[...g.strokes.keys()]];
    const flips = n <= 3 ? 1 << n : 1;
    for (const order of orders) {
      for (let f = 0; f < flips; f++) {
        const seq = order.map((idx, k) => (f & (1 << k) ? g.strokes[idx].slice().reverse() : g.strokes[idx]));
        // the denoised stroke set is shared by all shear / scale variants (they are affine maps of it)
        const base = denoise(seq);
        for (const [k, sx, sy] of AFFINE) {
          const st = base.map((s) => s.map(([x, y]) => [(x + k * (mid - y)) * sx, y * sy] as Pt));
          const v = finish(st);
          // coarse version: every fourth point (stage one of the search)
          const coarse = new Float32Array((v.pts.length / 8) * 2);
          for (let i = 0, o = 0; i < v.pts.length; i += 8) {
            coarse[o++] = v.pts[i];
            coarse[o++] = v.pts[i + 1];
          }
          TEMPLATES.push({ ch: g.ch, n, asp: v.asp, pts: v.pts, coarse, top, bottom });
        }
      }
    }
  }
}

/** rank the templates for the strokes of one symbol; the best distance of every class, ascending */
export function templateCount(): number {
  if (!TEMPLATES.length) build();
  return TEMPLATES.length;
}

export function classifyStrokes(strokes: Pt[][]): Cand[] {
  if (!TEMPLATES.length) build();
  const clean = strokes.filter((s) => s.length > 0).map((s) => (s.length === 1 ? [s[0], [s[0][0] + 0.01, s[0][1] + 0.01] as Pt] : s));
  if (!clean.length) return [];
  const c = vector(clean);
  const nStrokes = clean.length;
  const best = new Map<string, number>();
  const bestT = new Map<string, Tmpl>();
  const na = c.pts.length / 2;
  const cc = new Float32Array((c.pts.length / 8) * 2);
  for (let i = 0, o = 0; i < c.pts.length; i += 8) {
    cc[o++] = c.pts[i];
    cc[o++] = c.pts[i + 1];
  }
  // stage one: a coarse ordered comparison with every template, then the full one for the best few hundred
  const coarse = new Float32Array(TEMPLATES.length).fill(Infinity);
  for (let ti = 0; ti < TEMPLATES.length; ti++) {
    const t = TEMPLATES[ti];
    if (t.pts.length !== c.pts.length) continue;
    // plausible aspect ratios and stroke counts only
    if (Math.abs(Math.log(c.asp / t.asp)) > 1.6 || Math.abs(t.n - nStrokes) > 2) continue;
    let sum = 0;
    for (let i = 0; i < cc.length; i += 2) {
      const dx = cc[i] - t.coarse[i];
      const dy = cc[i + 1] - t.coarse[i + 1];
      sum += Math.sqrt(dx * dx + dy * dy);
    }
    coarse[ti] = sum;
  }
  const cutoff = Float32Array.from(coarse).sort()[Math.min(TEMPLATES.length - 1, 600)];
  for (let ti = 0; ti < TEMPLATES.length; ti++) {
    if (coarse[ti] > cutoff || coarse[ti] === Infinity) continue;
    const t = TEMPLATES[ti];
    let sum = 0;
    for (let i = 0; i < c.pts.length; i += 2) {
      const dx = c.pts[i] - t.pts[i];
      const dy = c.pts[i + 1] - t.pts[i + 1];
      sum += Math.sqrt(dx * dx + dy * dy);
    }
    let d = sum / na;
    d += 0.06 * Math.min(1.5, Math.abs(Math.log(c.asp / t.asp)));
    d += 0.025 * Math.abs(t.n - nStrokes);
    const prev = best.get(t.ch);
    if (prev === undefined || d < prev) {
      best.set(t.ch, d);
      bestT.set(t.ch, t);
    }
  }
  // second stage: for the nearest classes the point clouds are compared both ways (tolerates stroke length
  // differences and uneven writing speed), which separates look-alikes that the ordered comparison blurs
  const ranked = [...best.entries()].sort((a, b) => a[1] - b[1]).slice(0, 10);
  const nearest = (a: Float32Array, b: Float32Array): number => {
    let tot = 0;
    for (let i = 0; i < a.length; i += 2) {
      let m = Infinity;
      for (let j = 0; j < b.length; j += 2) {
        const dx = a[i] - b[j];
        const dy = a[i + 1] - b[j + 1];
        const q = dx * dx + dy * dy;
        if (q < m) m = q;
      }
      tot += Math.sqrt(m);
    }
    return tot / (a.length / 2);
  };
  return ranked
    .map(([ch, d0]) => {
      const t = bestT.get(ch)!;
      const ch2 = (nearest(c.pts, t.pts) + nearest(t.pts, c.pts)) / 2;
      const pen = 0.06 * Math.min(1.5, Math.abs(Math.log(c.asp / t.asp))) + 0.025 * Math.abs(t.n - nStrokes);
      return { ch, d: 0.4 * d0 + 0.6 * (ch2 + pen) };
    })
    .sort((a, b) => a.d - b.d);
}

/** vertical extent of a class in cap-height units, or null for unknown classes */
export function glyphExtent(ch: string): { top: number; bottom: number } | null {
  if (!TEMPLATES.length) build();
  const t = TEMPLATES.find((x) => x.ch === ch);
  return t ? { top: t.top, bottom: t.bottom } : null;
}
