import test from 'node:test';
import assert from 'node:assert/strict';
import { mathml2accessible } from '../src/convert/speech';
import { accessible2mathml } from '../src/convert/accessible';
import { mathml2content, content2mathml } from '../src/convert/content';
import { serializeMathML, parseMathML } from '../src/core/mathml';

const w = (s: string) => `<math xmlns="http://www.w3.org/1998/Math/MathML">${s}</math>`;
const canon = (s: string) => serializeMathML(parseMathML(s).row, parseMathML(s).attrs, { xmlns: true });

for (const s of [
  '<mi>x</mi><mo>+</mo><mn>1</mn>',
  '<mfrac><mi>a</mi><mi>b</mi></mfrac>',
  '<msqrt><mi>x</mi></msqrt>',
  '<msup><mi>x</mi><mn>2</mn></msup>',
  '<msup><mi>x</mi><mi>n</mi></msup>',
  '<mfrac><mrow><mi>a</mi><mo>+</mo><mn>1</mn></mrow><mrow><mi>b</mi><mo>-</mo><mn>1</mn></mrow></mfrac>',
  '<msqrt><mi>x</mi><mo>+</mo><mn>1</mn></msqrt>',
  '<mi>x</mi><mo>=</mo><mn>2</mn>',
]) {
  test('accessible round trip ' + s, () => {
    const spoken = mathml2accessible(w(s));
    const back = accessible2mathml(spoken);
    assert.equal(mathml2accessible(back), spoken);
  });
}

test('content MathML', () => {
  const c = mathml2content(w('<mi>x</mi><mo>+</mo><mn>1</mn>'));
  assert.match(c, /<apply><plus\/><ci>x<\/ci><cn>1<\/cn><\/apply>/);
  const p = content2mathml(c);
  assert.equal(canon(p), canon(w('<mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow>')));
});
test('content of fraction and power', () => {
  const c = mathml2content(w('<mfrac><mi>a</mi><mn>2</mn></mfrac><mo>=</mo><msup><mi>b</mi><mn>2</mn></msup>'));
  assert.match(c, /<apply><eq\/><apply><divide\/><ci>a<\/ci><cn>2<\/cn><\/apply><apply><power\/><ci>b<\/ci><cn>2<\/cn><\/apply><\/apply>/);
});
