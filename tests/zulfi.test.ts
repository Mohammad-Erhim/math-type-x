import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZULFI_GROUPS, zulfiSymbol, isZulfiChar, zulfiSvg } from '../src/layout/zulfi';
import { renderSvg } from '../src/render/svg';
import { renderPng } from '../server/render';
import { layoutDocument } from '../src/layout/layout';
import { parseMathML } from '../src/core/mathml';
import { EditorCore } from '../src/core/engine';
import { classify } from '../src/core/typing';

const N = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const cp = (c: number) => String.fromCodePoint(c);

test('the symbol lists hold the symbols of the tables, each with a shape and an advance', () => {
  assert.deepEqual(ZULFI_GROUPS.map((g) => g.id), ['letters']);
  let n = 0;
  for (const g of ZULFI_GROUPS) {
    assert.ok(g.items.length >= 4, g.id);
    for (const c of g.items) {
      const s = zulfiSymbol(c)!;
      assert.ok(s && s.d.startsWith('M') && s.a > 0, g.id + ' ' + c.toString(16));
      n++;
    }
  }
  assert.ok(n >= 40, 'about 40 letters: ' + n);
  assert.match(zulfiSvg(ZULFI_GROUPS[0].items[0]), /<path d="M/);
});

test('a symbol is drawn as a shape (no text, no font) in the SVG export, with the advance of its glyph', () => {
  const c = ZULFI_GROUPS[0].items[0];
  const s = zulfiSymbol(c)!;
  const r = renderSvg(`<math ${N}><mi>x</mi><mo>${cp(c)}</mo><mi>y</mi></math>`);
  assert.ok(r.svg.includes(`d="${s.d}"`));
  assert.ok(!r.svg.includes(cp(c)), 'the private-use character itself is not in the image');
  const without = renderSvg(`<math ${N}><mi>x</mi><mi>y</mi></math>`);
  assert.ok(r.width >= without.width + Math.floor((s.a / 1000) * 16), `${r.width} vs ${without.width} + ${s.a / 62.5}`);
});

test('the letters of the tables are identifiers; a typed symbol enters the formula as one token', () => {
  const letters = ZULFI_GROUPS.find((g) => g.id === 'letters')!.items[0];
  const sign = ZULFI_GROUPS.find((g) => g.id === 'letters')!.items[1];
  assert.equal(classify(cp(letters)), 'arabic');
    const ed = new EditorCore();
  ed.typeText(cp(sign) + cp(letters));
  const m = ed.getMathML();
  assert.match(m, /<mi>&#x[Ee]1[0-9A-Fa-f]{2};<\/mi><mi>&#x[Ee]1[0-9A-Fa-f]{2};<\/mi>/);
  assert.ok(isZulfiChar(cp(sign)));
});

test('the PNG of a formula with symbols draws them (image services need no font for it)', () => {
  const items = ZULFI_GROUPS.find((g) => g.id === 'letters')!.items;
  const mml = `<math ${N}>${items.slice(0, 3).map((c) => `<mi>${cp(c)}</mi>`).join('')}</math>`;
  const a = renderPng(mml);
  const b = renderPng(`<math ${N}><mi>x</mi></math>`);
  assert.ok(a.width > b.width && a.height >= 10);
  assert.ok(!a.png.equals(b.png));
});

test('in an Arabic editor the natural logarithm is لو(ه): the bracket holds the Arabic math letter U+E14E', async () => {
  const { catalogue } = await import('../src/core/catalogue');
  const ctl = catalogue.controls.find((c) => c.title === 'Natural logarithm')!;
  const ed = new EditorCore();
  ed.setRtl(true);
  ed.activate(ctl);
  assert.match(ed.getMathML(), /<mi>&#x644;&#x648;<\/mi><mfenced><mi>&#xE14E;<\/mi><\/mfenced>/);
  assert.deepEqual([ed.caret.path.length, ed.caret.index], [1, 1], 'the caret stands in the bracket, after the letter');
  const l = layoutDocument(parseMathML(ed.getMathML()).row, undefined, 16, true);
  assert.ok(l.w > 20 && l.w < 80, 'a sane width: ' + l.w);
  const en = new EditorCore();
  en.activate(ctl);
  assert.match(en.getMathML(), /<mi>ln<\/mi>/);
});

test('in an Arabic editor the differential d of the calculus controls is the last Arabic math letter; otherwise it stays d', async () => {
  const { catalogue } = await import('../src/core/catalogue');
  for (const title of ['Differential', 'Derivative', 'Definite integral with differential', 'Integral with subscript and differential']) {
    const ctl = catalogue.controls.find((c) => c.title === title)!;
    const en = new EditorCore();
    en.activate(ctl);
    assert.match(en.getMathML(), /<mo>d<\/mo>/, title);
    const ar = new EditorCore();
    ar.arabicLanguage = true;
    ar.activate(ctl);
    assert.ok(!/<mo>d<\/mo>/.test(ar.getMathML()) && ar.getMathML().includes('&#xE188;'), title + ' ' + ar.getMathML());
  }
  const last = ZULFI_GROUPS[0].items[ZULFI_GROUPS[0].items.length - 1];
  assert.equal(last, 0xe188, 'the last letter of the list');
});

test('contextual extension: structures with inputs have a vertical alignment (not in the bare engine)', async () => {
  const { contextState, applyContext } = await import('../src/core/context');
  const { layoutDocument } = await import('../src/layout/layout');
  const { parseMathML } = await import('../src/core/mathml');
  const mml = `<math ${N}><mi>x</mi><msup><mi>a</mi><mn>2</mn></msup></math>`;
  const make = (extras: boolean) => {
    const ed = new EditorCore();
    ed.setMathML(mml);
    ed.contextExtras = extras;
    ed.caret = { path: [[1, 0]], index: 1 }; // inside the base of the power
    return ed;
  };
  assert.equal(contextState(make(false)), null, 'the engine alone keeps the reference behaviour');
  const ed = make(true);
  const st = contextState(ed)!;
  assert.equal(st.kind, 'structure');
  assert.deepEqual(st.controls.map((c) => c.id), ['valign_baseline', 'valign_middle', 'valign_middle_baseline']);
  const h = (m: string) => {
    const l = layoutDocument(parseMathML(m).row);
    return [l.a, l.d];
  };
  const base = h(ed.getMathML());
  applyContext(ed, 'valign_middle');
  assert.match(ed.getMathML(), /<msup wrs:valign="middle">/);
  const mid = h(ed.getMathML());
  assert.notDeepEqual(mid, base, 'the structure moved');
  applyContext(ed, 'valign_baseline');
  assert.ok(!/valign/.test(ed.getMathML()));
  assert.deepEqual(h(ed.getMathML()), base, 'baseline is the default position again');
});
