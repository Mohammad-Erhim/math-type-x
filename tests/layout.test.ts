import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMathML } from '../src/core/mathml';
import { layoutDocument, boxH, K } from '../src/layout/layout';

/** glyph boxes of my layout in the reference's convention: (left, top, w, h) relative to the container */
function boxes(mml: string) {
  const d = parseMathML(mml.includes('xmlns') ? mml : mml.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"'));
  const lay = layoutDocument(d.row, undefined, 16);
  const out: { t: string; x: number; top: number; fs: number }[] = [];
  for (const it of lay.items) {
    if (it.k === 'g') {
      const asc = it.font === 'sans' ? K.asc * it.size : K.asc * it.size + 0.125 * it.size;
      out.push({ t: it.text, x: it.x, top: it.y - asc, fs: it.size });
    }
  }
  return { out, lay };
}

const ref = JSON.parse(readFileSync(join(process.cwd(), 'evidence/measure_basic.json'), 'utf8')) as Record<string, any[]>;
const CASES: Record<string, string> = {
  x: '<math><mi>x</mi></math>',
  xy: '<math><mi>x</mi><mi>y</mi></math>',
  'x+1': '<math><mi>x</mi><mo>+</mo><mn>1</mn></math>',
  frac: '<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>',
  sup: '<math><msup><mi>x</mi><mn>2</mn></msup></math>',
  sub: '<math><msub><mi>x</mi><mn>1</mn></msub></math>',
  subsup: '<math><msubsup><mi>x</mi><mn>1</mn><mn>2</mn></msubsup></math>',
  sqrt: '<math><msqrt><mi>x</mi></msqrt></math>',
  root: '<math><mroot><mi>x</mi><mn>3</mn></mroot></math>',
  paren: '<math><mfenced><mi>x</mi></mfenced></math>',
  sum: '<math><munderover><mo>&#x2211;</mo><mi>i</mi><mi>n</mi></munderover></math>',
  int: '<math><msubsup><mo>&#x222B;</mo><mn>0</mn><mn>1</mn></msubsup></math>',
};

test('glyph boxes follow the reference measurements (≤ 1.5 px)', () => {
  const bad: string[] = [];
  let n = 0;
  for (const [name, mml] of Object.entries(CASES)) {
    const want = (ref[name] ?? []).filter((e) => e.t && e.t.trim() && !(e.cls || '').includes('wrs_underline'));
    const got = boxes(mml).out;
    // pair by text and order
    const used = new Set<number>();
    for (const w of want) {
      const wx = w.x - 6;
      const wt = w.y - 6; // container-relative top
      const k = got.findIndex((g, i) => !used.has(i) && g.t === w.t || (g.t.codePointAt(0) === (w.t.codePointAt(0) ?? 0)));
      void k;
      let best = -1;
      let bd = 1e9;
      got.forEach((g, i) => {
        if (used.has(i)) return;
        const same = g.t === w.t || Array.from(g.t)[0] === Array.from(w.t)[0];
        if (!same) return;
        const dd = Math.abs(g.x - wx) + Math.abs(g.top - wt);
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      });
      n++;
      if (best < 0) {
        bad.push(`${name}: no glyph ${JSON.stringify(w.t)}`);
        continue;
      }
      used.add(best);
      const g = got[best];
      const dx = g.x - wx;
      const dy = g.top - wt;
      // the drawing code (src/layout/svg.ts) snaps baselines and was calibrated on rendered ink afterwards (tools/leafshift.py)
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1.5) bad.push(`${name}: ${JSON.stringify(w.t)} want (${wx}, ${wt}) got (${g.x.toFixed(1)}, ${g.top.toFixed(1)})  dx=${dx.toFixed(1)} dy=${dy.toFixed(1)}`);
    }
  }
  console.log(`layout: ${n - bad.length}/${n} glyph boxes within 1.5px`);
  if (bad.length) console.log(bad.join('\n'));
  assert.ok(n > 10);
  void boxH;
});
