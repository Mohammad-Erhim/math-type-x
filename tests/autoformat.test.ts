import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorCore } from '../src/core/engine';

const strip = (s: string) => s.replace(/ xmlns="[^"]+"/, '');
const run = (text: string, auto: boolean) => {
  const e = new EditorCore();
  e.autoformat = auto;
  e.typeText(text);
  return strip(e.getMathML());
};

test('autoformat is off by default: symbols stay literal (EDT-005)', () => {
  assert.equal(run('a/b', false), '<math><mi>a</mi><mo>/</mo><mi>b</mi></math>');
  assert.equal(run('(', false), '<math><mo>(</mo></math>');
});

test('autoformat on: fraction, scripts, times, relations, auto-paired delimiters', () => {
  assert.equal(run('a/b', true), '<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>');
  assert.equal(run('12/3', true), '<math><mfrac><mn>12</mn><mn>3</mn></mfrac></math>');
  assert.equal(run('a^2', true), '<math><msup><mi>a</mi><mn>2</mn></msup></math>');
  assert.equal(run('a_1', true), '<math><msub><mi>a</mi><mn>1</mn></msub></math>');
  assert.equal(run('a*b', true), '<math><mi>a</mi><mo>&#xD7;</mo><mi>b</mi></math>');
  assert.equal(run('a>=b', true), '<math><mi>a</mi><mo>&#x2265;</mo><mi>b</mi></math>');
  assert.equal(run('a<=b', true), '<math><mi>a</mi><mo>&#x2264;</mo><mi>b</mi></math>');
  assert.equal(run('(x)y', true), '<math><mfenced><mi>x</mi></mfenced><mi>y</mi></math>');
  assert.equal(run('[x]', true), '<math><mfenced open="[" close="]"><mi>x</mi></mfenced></math>');
});
