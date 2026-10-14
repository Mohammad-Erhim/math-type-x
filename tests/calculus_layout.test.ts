/**
 * Integral signs and radicals: the shapes are the reference's (measured on the playground), so that limits and
 * indices sit where the reference puts them and never touch the sign - in both reading directions.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMathML } from '../src/core/mathml';
import { layoutDocument } from '../src/layout/layout';
import { renderSvg } from '../src/render/svg';

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const lay = (inner: string, rtl = false) => {
  const d = parseMathML(`<math${NS}>${inner}</math>`);
  return layoutDocument(d.row, d.attrs, 16, rtl);
};
const glyphs = (inner: string, rtl = false) => lay(inner, rtl).items.filter((i) => i.k === 'g') as Extract<ReturnType<typeof lay>['items'][number], { k: 'g' }>[];
const INT = '<msubsup><mo>&#x222B;</mo><mi>y</mi><mi>x</mi></msubsup><mi>f</mi>';

test('integral signs are narrowed to the reference width in the SVG (LTR and RTL)', () => {
  for (const [dir, flipped] of [['', false], ['dir="rtl" ', true]] as const) {
    const { svg } = renderSvg(`<math ${dir}${NS.trim()}>${INT}</math>`);
    assert.match(svg, /scale\(0\.7 1\)/, 'the sign is narrowed');
    assert.equal(/scale\(-1 1\)/.test(svg), flipped, 'mirrored only in a right-to-left formula');
  }
});

test('the limits of an integral keep clear of the sign', () => {
  for (const rtl of [false, true]) {
    const g = glyphs(INT, rtl);
    const sign = g.find((i) => i.text === '∫')!;
    const hi = g.find((i) => i.text === 'x')!;
    const lo = g.find((i) => i.text === 'y')!;
    const k = sign.size / 32;
    const inkL = rtl ? sign.x + (sign.w ?? 0) - 16.5 * k : sign.x + 2.5 * k;
    const inkR = rtl ? sign.x + (sign.w ?? 0) - 2.5 * k : sign.x + 16.5 * k;
    // the upper limit sits to the side of the sign (right of it, left of it when mirrored) ...
    const right = hi.x + (hi.w ?? 0);
    assert.ok(rtl ? right <= inkL + 1 : hi.x >= inkR - 1, `limit ${hi.text} (${hi.x}) overlaps the sign (${inkL}..${inkR}) rtl=${rtl}`);
    // ... the lower one hangs below the baseline of the sign's body, clear of the foot
    assert.ok(lo.y - 0.7 * lo.size > sign.y - 0.1 * sign.size, 'the lower limit starts under the sign');
    // the upper limit is above the lower one, the lower limit sits under the sign's foot
    assert.ok(hi.y < lo.y);
  }
});

test('the index of a root never touches the sign: no line under it, always above the tick', () => {
  const idxs = ['<mn>3</mn>', '<mn>12</mn>', '<mn>46</mn>', '<mi>n</mi>', '<mfrac><mi>a</mi><mi>b</mi></mfrac>', '<msqrt><mi>x</mi></msqrt>'];
  const rads = ['<mi>r</mi>', '<msup><mi>r</mi><mn>9</mn></msup>', '<mfrac><mi>p</mi><mi>q</mi></mfrac>', '<mrow/>'];
  for (const rtl of [false, true]) {
    for (const idx of idxs) {
      for (const rad of rads) {
        const l = lay(`<mroot><mrow>${rad}</mrow>${idx}</mroot>`, rtl);
        const p = l.items.find((i) => i.k === 'p' && /^M/.test((i as { d: string }).d)) as { x: number; y: number; d: string };
        const n = p.d.match(/-?[\d.]+/g)!.map(Number); // M x y L x y L x y L x y
        assert.notEqual(n[1], n[3], 'no flat line under the index');
        const tickY = p.y + n[3]; // the peak of the small tick
        // the lowest ink of the index (its baseline, or of the placeholder) is above the tick
        const gl = l.items.filter((i) => i.k === 'g') as { y: number; x: number; text: string }[];
        for (const g of gl.filter((q) => !['r', '9', 'p', 'q'].includes(q.text))) {
          assert.ok(g.y <= tickY + 0.5, `${idx} over ${rad} rtl=${rtl}: index glyph ${g.text} baseline ${g.y} below the tick ${tickY}`);
        }
      }
    }
  }
});

test('the index width stretches the sign, the radicand moves by the reference amount', () => {
  const x0 = glyphs('<msqrt><mi>x</mi></msqrt>').find((i) => i.text === 'x')!.x;
  const want: Record<string, number> = {
    '<mn>1</mn>': 0,
    '<mn>12</mn>': 6,
    '<mn>123</mn>': 13,
    '<mn>1.5</mn>': 8,
    '<mi>x</mi><mi>y</mi>': 5,
    '<msup><mi>n</mi><mn>3</mn></msup>': 6,
    '<mfrac><mi>a</mi><mi>b</mi></mfrac>': 5,
  };
  for (const [idx, ext] of Object.entries(want)) {
    const x = glyphs(`<mroot><mi>x</mi><mrow>${idx}</mrow></mroot>`).filter((i) => i.text === 'x').reduce((m, i) => Math.max(m, i.x), 0);
    assert.ok(Math.abs(x - x0 - ext) <= 1, `${idx}: radicand moved by ${x - x0}, expected ${ext}`);
  }
});

test('a tall index of a root is raised so that its bottom stays above the tick', () => {
  const l = lay('<mroot><mi>x</mi><mfrac><mi>a</mi><mi>b</mi></mfrac></mroot>');
  const p = l.items.find((i) => i.k === 'p') as { y: number; d: string };
  const nums = p.d.match(/-?[\d.]+/g)!.map(Number);
  const tickY = p.y + nums[3];
  const b = l.items.find((i) => i.k === 'g' && (i as { text: string }).text === 'b') as { y: number; size: number };
  assert.ok(b.y + 0.25 * b.size <= tickY + 1, 'the denominator ends above the tick');
});
