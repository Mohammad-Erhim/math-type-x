import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogue } from '../src/core/catalogue';
import { EditorCore } from '../src/core/engine';
import { renderSvg } from '../src/render/svg';

const N = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const control = catalogue.controls.find((c) => c.title === 'Elements stacked, same size')!;

test('"Elements stacked, same size" is a control of the scripts and layout tab next to the other stack controls', () => {
  assert.ok(control);
  assert.equal(control.tab, 5);
  assert.ok(!catalogue.controls.some((c) => c !== control && c.tab === 5 && c.group === 0 && c.geom[0] === control.geom[0] && c.geom[1] === control.geom[1]));
  // the control that was already there stays as it is
  assert.equal(catalogue.controls.find((c) => c.title === 'Element over')!.A, '<math><mover><mrow/><mrow/></mover></math>');
});

test('it inserts an over structure marked as same size; a stack can be nested as often as wanted', () => {
  const ed = new EditorCore();
  ed.activate(control);
  ed.typeText('a');
  ed.moveVertical(-1);
  ed.typeText('b');
  assert.match(ed.getMathML(), /<mover wrs:stack="same"><mi>a<\/mi><mi>b<\/mi><\/mover>/);
  ed.activate(control);
  assert.match(ed.getMathML(), /<mover wrs:stack="same"><mi>a<\/mi><mrow><mi>b<\/mi><mover wrs:stack="same">/);
});

test('both elements are drawn at the size of the text, the plain over script is smaller', () => {
  const sizes = (mml: string) => [...renderSvg(mml).svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => +m[1]);
  const same = sizes(`<math ${N} xmlns:wrs="http://www.wiris.com/xml/mathml-extension"><mover wrs:stack="same"><mi>a</mi><mi>b</mi></mover></math>`);
  const plain = sizes(`<math ${N}><mover><mi>a</mi><mi>b</mi></mover></math>`);
  assert.equal(same.length, 2);
  assert.equal(same[0], same[1]);
  assert.ok(plain[1] < plain[0]);
  const hSame = renderSvg(`<math ${N} xmlns:wrs="http://www.wiris.com/xml/mathml-extension"><mover wrs:stack="same"><mi>a</mi><mi>b</mi></mover></math>`).height;
  assert.ok(hSame > 0);
});
