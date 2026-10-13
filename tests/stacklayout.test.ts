import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMathML } from '../src/core/mathml';
import { layoutDocument } from '../src/layout/layout';

interface Ref {
  mml: string;
  w: number;
  h: number;
  /** [text, x, y(box top), w, h] relative to the stack container */
  leaves: [string, number, number, number, number][];
}

/** elementary stacks and long divisions against the geometry recorded from the reference (tools/probe_stack.js) */
test('stack and long division layout follows the reference', () => {
  const refs: Ref[] = JSON.parse(readFileSync(join(process.cwd(), 'evidence/stack_layout_ref.json'), 'utf8'));
  let n = 0;
  const bad: string[] = [];
  for (const r of refs) {
    if (!/^<(mstack|mlongdiv)/.test(r.mml)) continue;
    let row;
    try {
      row = parseMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${r.mml}</math>`).row;
    } catch {
      continue;
    }
    const lay = layoutDocument(row);
    // the frame of the container (editor-only rectangle) gives its size
    const frame = lay.items.filter((it) => it.k === 'r' && (it as { ui?: boolean }).ui && (it as { color?: string }).color === '#cddce3') as { x: number; y: number; w: number; h: number }[];
    if (!frame.length) continue;
    const fx = Math.min(...frame.map((f) => f.x));
    const fy = Math.min(...frame.map((f) => f.y));
    const fw = Math.max(...frame.map((f) => f.x + f.w)) - fx;
    const fh = Math.max(...frame.map((f) => f.y + f.h)) - fy;
    n++;
    const glyphs = lay.items
      .filter((it) => it.k === 'g')
      .map((it) => {
        const g = it as { text: string; x: number; y: number };
        return { t: g.text, x: g.x - fx, y: g.y - fy };
      });
    // box top → baseline: 14.5 for letters and digits, 16.5 for symbol-font glyphs, 10.9 at the carry size
    const want = r.leaves.map((l) => ({ t: l[0], x: l[1], y: l[2] + (l[4] <= 14 ? 10.9 : /^[\p{L}\p{Nd}]/u.test(l[0]) ? 14.5 : 16.5) }));
    const key = (a: { x: number; y: number }) => Math.round(a.y / 8) * 1000 + a.x;
    glyphs.sort((a, b) => key(a) - key(b));
    want.sort((a, b) => key(a) - key(b));
    let ok = Math.abs(fw - r.w) <= 1 && Math.abs(fh - r.h) <= 1.5 && glyphs.length === want.length;
    let why = '';
    if (ok) {
      for (let i = 0; i < want.length; i++) {
        if (glyphs[i].t !== want[i].t || Math.abs(glyphs[i].x - want[i].x) > 2 || Math.abs(glyphs[i].y - want[i].y) > 3) {
          ok = false;
          why = ` ${want[i].t}: want (${want[i].x}, ${want[i].y}) got ${glyphs[i].t} (${glyphs[i].x.toFixed(1)}, ${glyphs[i].y.toFixed(1)})`;
          break;
        }
      }
    }
    if (!ok) bad.push(`${r.mml.slice(0, 90)} want ${r.w}x${r.h} got ${fw}x${fh}${why}`);
  }
  console.log(`stack layout: ${n - bad.length}/${n} equal`);
  if (bad.length) console.log(bad.slice(0, 5).join('\n'));
  assert.ok(n > 60);
  assert.ok((n - bad.length) / n > 0.95, bad.slice(0, 3).join('; '));
});
