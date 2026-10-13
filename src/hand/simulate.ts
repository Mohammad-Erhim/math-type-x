/** Simulated strokes for a formula (used when the handwriting mode is reopened, HND-009). */
import { parseMathML } from '../core/mathml';
import { layoutDocument } from '../layout/layout';
import { HERSHEY } from './hershey';
import { STROKE_FONT } from './strokefont';

export interface SimStroke {
  x: number[];
  y: number[];
}

type P = [number, number];

/** polylines of a character in glyph units (Hershey: baseline at y = 22, cap height 21), plus its advance */
function glyph(ch: string): { lines: P[][]; adv: number } | null {
  const d = HERSHEY[ch];
  if (d) {
    const lines: P[][] = d
      .split('M')
      .slice(1)
      .map((part) => part.replace(/L/g, ' ').trim().split(/\s+/).map((q) => q.split(',').map(Number) as P));
    const xs = lines.flat().map((p) => p[0]);
    const x0 = Math.min(...xs);
    return { lines: lines.map((l) => l.map(([x, y]) => [x - x0, y] as P)), adv: Math.max(...xs) - x0 + 6 };
  }
  const f = STROKE_FONT[ch.toLowerCase()] ?? STROKE_FONT[ch];
  if (f) return { lines: f.map((l) => l.map(([x, y]) => [x * 16, 1 + y * 21] as P)), adv: 20 };
  return null;
}

export function simulateStrokes(mml: string, w: number, h: number): SimStroke[] {
  const doc = parseMathML(mml);
  const lay = layoutDocument(doc.row);
  const out: SimStroke[] = [];
  const k = 2.6;
  const ox = 40;
  const oy = (h - (lay.a + lay.d) * k) / 2;
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
    return { x: xs, y: ys };
  };
  for (const it of lay.items) {
    if (it.k === 'g') {
      let x = ox + it.x * k;
      const capH = it.size * 0.72 * k;
      const sc = capH / 21;
      const base = oy + it.y * k;
      for (const ch of Array.from(it.text)) {
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
    } else if (it.k === 'r') {
      const x1 = ox + it.x * k;
      const x2 = ox + (it.x + it.w) * k;
      const y = oy + it.y * k;
      out.push(smooth([[x1, y], [x2, y]]));
    }
  }
  void w;
  return out;
}
