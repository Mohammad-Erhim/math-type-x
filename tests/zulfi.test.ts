import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZULFI_GROUPS, zulfiSymbol, isZulfiChar, zulfiSvg } from '../src/layout/zulfi';
import { renderSvg } from '../src/render/svg';
import { renderPng } from '../server/render';
import { EditorCore } from '../src/core/engine';
import { classify } from '../src/core/typing';

const N = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const cp = (c: number) => String.fromCodePoint(c);

test('the symbol lists hold the symbols of the tables, each with a shape and an advance', () => {
  assert.deepEqual(ZULFI_GROUPS.map((g) => g.id), ['operators', 'relations', 'sets', 'arrows', 'brackets', 'letters', 'functions', 'geometry', 'calculus', 'forms', 'marks', 'other']);
  let n = 0;
  for (const g of ZULFI_GROUPS) {
    assert.ok(g.items.length >= 4, g.id);
    for (const c of g.items) {
      const s = zulfiSymbol(c)!;
      assert.ok(s && s.d.startsWith('M') && s.a > 0, g.id + ' ' + c.toString(16));
      n++;
    }
  }
  assert.ok(n >= 140, 'about 150 list entries: ' + n);
  assert.match(zulfiSvg(ZULFI_GROUPS[1].items[0]), /<path d="M/);
});

test('a symbol is drawn as a shape (no text, no font) in the SVG export, with the advance of its glyph', () => {
  const c = ZULFI_GROUPS[1].items[0];
  const s = zulfiSymbol(c)!;
  const r = renderSvg(`<math ${N}><mi>x</mi><mo>${cp(c)}</mo><mi>y</mi></math>`);
  assert.ok(r.svg.includes(`d="${s.d}"`));
  assert.ok(!r.svg.includes(cp(c)), 'the private-use character itself is not in the image');
  const without = renderSvg(`<math ${N}><mi>x</mi><mi>y</mi></math>`);
  assert.ok(r.width >= without.width + Math.floor((s.a / 1000) * 16), `${r.width} vs ${without.width} + ${s.a / 62.5}`);
});

test('letters of the tables are identifiers, signs are operators; a typed symbol enters the formula as one token', () => {
  const letters = ZULFI_GROUPS.find((g) => g.id === 'letters')!.items[0];
  const sign = ZULFI_GROUPS.find((g) => g.id === 'operators')!.items[0];
  assert.equal(classify(cp(letters)), 'arabic');
  assert.equal(classify(cp(sign)), 'op');
  const ed = new EditorCore();
  ed.typeText(cp(sign) + cp(letters));
  const m = ed.getMathML();
  assert.match(m, /<mo>&#x[Ee]1[0-9A-Fa-f]{2};<\/mo><mi>&#x[Ee]1[0-9A-Fa-f]{2};<\/mi>/);
  assert.ok(isZulfiChar(cp(sign)));
});

test('the PNG of a formula with symbols draws them (image services need no font for it)', () => {
  const items = ZULFI_GROUPS.find((g) => g.id === 'calculus')!.items;
  const mml = `<math ${N}>${items.slice(0, 3).map((c) => `<mi>${cp(c)}</mi>`).join('')}</math>`;
  const a = renderPng(mml);
  const b = renderPng(`<math ${N}><mi>x</mi></math>`);
  assert.ok(a.width > b.width && a.height >= 10);
  assert.ok(!a.png.equals(b.png));
});
