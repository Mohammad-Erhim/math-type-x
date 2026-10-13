import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMathML } from '../src/core/mathml';
import { layoutDocument } from '../src/layout/layout';
import { renderSvg } from '../src/render/svg';
import { itemsToSvg } from '../src/layout/svg';
import { tokenInfo, setRunShaper } from '../src/layout/metrics';

const N = 'xmlns="http://www.w3.org/1998/Math/MathML" xmlns:wrs="http://www.wiris.com/xml/mathml-extension"';
const lay = (body: string) => layoutDocument(parseMathML(`<math ${N}>${body}</math>`).row, undefined, 16, false);

test('exported images draw no empty-slot placeholders, the editor and the toolbar icons do', () => {
  const l = lay('<mfrac><mrow/><mrow/></mfrac>');
  assert.ok(l.items.some((i) => i.k === 's'), 'the layout has slot boxes');
  assert.ok(!renderSvg(`<math ${N}><mfrac><mrow/><mrow/></mfrac></math>`).svg.includes('#006400'));
  assert.ok(itemsToSvg(l.items, { slots: true }).includes('#006400'));
  assert.ok(itemsToSvg(l.items, { ui: true }).includes('#006400'));
});

test('vertical alignment of a fence: baseline is the default, middle-baseline makes it symmetric about the baseline', () => {
  const T = '<mtable><mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd></mtr><mtr><mtd><mn>3</mn></mtd><mtd><mn>4</mn></mtd></mtr></mtable>';
  const base = lay(`<mi>x</mi><mfenced>${T}</mfenced>`);
  const same = lay(`<mi>x</mi><mfenced wrs:valign="baseline">${T}</mfenced>`);
  const mid = lay(`<mi>x</mi><mfenced wrs:valign="middle">${T}</mfenced>`);
  const mb = lay(`<mi>x</mi><mfenced wrs:valign="middle-baseline">${T}</mfenced>`);
  assert.equal(same.a + same.d, base.a + base.d);
  assert.equal(mid.a + mid.d, base.a + base.d, 'a table is already centred on the middle of the line');
  assert.equal(mb.a, mb.d);
  assert.ok(mb.d > base.d, 'the fence reaches as far below the baseline as above it');
  assert.equal(mb.a, base.a);
});

test('stretched arrows stay inside their length and are drawn on whole pixel rows', () => {
  const svg = renderSvg(`<math ${N}><mover><mo>&#x2192;</mo><mn>12345678</mn></mover></math>`, { zoom: 1 });
  const rects = [...svg.svg.matchAll(/M(-?[\d.]+) (-?[\d.]+)H(-?[\d.]+)V/g)];
  assert.ok(rects.length >= 1, 'the shaft is a one pixel rule');
  for (const m of rects) assert.equal(Number(m[2]) % 1, 0, 'the shaft row is a whole pixel');
});

test('an Arabic run is measured as a whole (joined letters), not as the sum of isolated letters', () => {
  setRunShaper((text, size) => (text === 'نها' ? 16.7 * (size / 16) : null));
  try {
    const run = tokenInfo('mi', '', 'نها', 16).w;
    assert.ok(Math.abs(run - 16.7) < 1e-6, String(run));
  } finally {
    setRunShaper(null);
  }
  const sum = tokenInfo('mi', '', 'نها', 16).w;
  assert.ok(sum > 20, 'without a shaper the isolated advances add up: ' + sum);
});

// reference editor DOM: container heights / placeholder tops of the "Big operator with …" controls (tools/domboxes)
test('big operator controls: empty text slot is a 16 x 23 box, containers and placeholders sit where the reference puts them', async () => {
  const { EditorCore } = await import('../src/core/engine');
  const { findControl } = await import('../src/core/catalogue');
  const cases: [string, number, number[]][] = [
    ['Big operator with under script', 46, [34]],
    ['Big operator with subscript', 33, [21]],
    ['Big operator with under and over scripts', 63, [5, 51]],
    ['Big operator with subscript and superscript', 37, [3, 25]],
  ];
  for (const [title, height, tops] of cases) {
    const ed = new EditorCore();
    ed.activate(findControl(5, 0, title)!);
    const l = layoutDocument(ed.row, undefined, 16, false);
    assert.equal(Math.round(l.a + l.d), height, title);
    const slots = l.items.filter((i) => i.k === 's').map((i: any) => Math.round(i.y)).sort((p: number, q: number) => p - q);
    assert.deepEqual(slots, tops, title);
    const box = l.items.filter((i) => i.k === 'r' && (i as any).ui);
    assert.equal(box.length, 4, 'black frame of the empty operator');
  }
});
