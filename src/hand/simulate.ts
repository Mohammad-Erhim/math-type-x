/** Simulated strokes for a formula (used when the handwriting mode is reopened, HND-009). */
import { parseMathML } from '../core/mathml';
import { layoutDocument } from '../layout/layout';
import { allGlyphs } from './glyphs';

export interface SimStroke {
  x: number[];
  y: number[];
  /** index of the symbol the stroke belongs to (strokes of one symbol are written in a row) */
  sym?: number;
}

type P = [number, number];

/** polylines of a character in glyph units (baseline at y = 22, cap height 21), plus its advance */
function glyph(ch0: string): { lines: P[][]; adv: number } | null {
  const ch = ch0 === '\u2212' ? '-' : ch0;
  const g = allGlyphs().find((q) => q.ch === ch) ?? allGlyphs().find((q) => q.ch === ch.toLowerCase());
  if (!g) return null;
  const xs = g.strokes.flat().map((p) => p[0]);
  const x0 = Math.min(...xs);
  return { lines: g.strokes.map((l) => l.map(([x, y]) => [x - x0, y] as P)), adv: Math.max(...xs) - x0 + 6 };
}

export function simulateStrokes(mml: string, w: number, h: number): SimStroke[] {
  const doc = parseMathML(mml);
  const lay = layoutDocument(doc.row);
  const out: SimStroke[] = [];
  const k = 2.6;
  const ox = 40;
  const oy = (h - (lay.a + lay.d) * k) / 2;
  let symId = 0;
  const smooth = (pts: P[]): SimStroke => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let s = 0; s < pts.length - 1; s++) {
      for (let t = 0; t < 6; t++) {
        xs.push(Math.round(pts[s][0] + ((pts[s + 1][0] - pts[s][0]) * t) / 6));
        ys.push(Math.round(pts[s][1] + ((pts[s + 1][1] - pts[s][1]) * t) / 6));
      }
    }
    xs.push(Math.round(pts[pts.length - 1][0]));
    ys.push(Math.round(pts[pts.length - 1][1]));
    return { x: xs, y: ys, sym: symId };
  };
  for (const it of lay.items) {
    if (it.k === 'g') {
      let x = ox + it.x * k;
      const capH = it.size * 0.72 * k;
      const sc = capH / 21;
      const base = oy + it.y * k;
      for (const ch of Array.from(it.text)) {
        symId++;
        const g = glyph(ch);
        if (!g) {
          x += it.size * 0.5 * k;
          continue;
        }
        for (const line of g.lines) {
          if (line.length < 2) continue;
          out.push(smooth(line.map(([gx, gy]) => [x + gx * sc, base + (gy - 22) * sc] as P)));
        }
        x += g.adv * sc;
      }
    } else if (it.k === 'f') {
      symId++;
      // delimiters: the glyph stretched to the height of the box
      const g = glyph(it.ch);
      if (g) {
        const top = oy + (it.y - it.a) * k;
        const bot = oy + (it.y + it.d) * k;
        const gx = ox + it.x * k;
        for (const line of g.lines) {
          if (line.length < 2) continue;
          const ys = g.lines.flat().map((q) => q[1]);
          const gy0 = Math.min(...ys);
          const gy1 = Math.max(...ys);
          out.push(smooth(line.map(([x, y]) => [gx + x * 0.35 * k + 2, top + ((y - gy0) / (gy1 - gy0 || 1)) * (bot - top)] as P)));
        }
      }
    } else if (it.k === 'p') {
      symId++;
      // polylines of the layout (radical signs, slashes): "M x y L x y …"
      const nums = it.d.match(/-?\d+(?:\.\d+)?/g);
      if (nums && /^[ML\d\s.\-]+$/.test(it.d) && nums.length >= 4) {
        const pts: P[] = [];
        for (let q = 0; q + 1 < nums.length; q += 2) pts.push([ox + (it.x + +nums[q]) * k, oy + (it.y + +nums[q + 1]) * k]);
        out.push(smooth(pts));
      }
    } else if (it.k === 'r') {
      symId++;
      const x1 = ox + it.x * k;
      const x2 = ox + (it.x + it.w) * k;
      const y = oy + it.y * k;
      const prev = out[out.length - 1];
      // the bar of a radical continues the sign in one stroke
      if (prev && Math.abs(prev.x[prev.x.length - 1] - x1) < 3 * k && Math.abs(prev.y[prev.y.length - 1] - y) < 3 * k && prev.y[0] > y) {
        const more = smooth([[x1, y], [x2, y]]);
        prev.x.push(...more.x);
        prev.y.push(...more.y);
      } else out.push(smooth([[x1, y], [x2, y]]));
    }
  }
  void w;
  return out;
}
