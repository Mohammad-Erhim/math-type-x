import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recognize } from '../src/hand/recognize';
import { simulateStrokes } from '../src/hand/simulate';

const strip = (s: string) => s.replace(/ xmlns="[^"]*"/, '');

for (const [src, want] of [
  ['<math><mn>12</mn><mo>+</mo><mn>7</mn></math>', '<math><mn>12</mn><mo>+</mo><mn>7</mn></math>'],
  ['<math><mi>x</mi><mo>=</mo><mn>3</mn></math>', '<math><mi>x</mi><mo>=</mo><mn>3</mn></math>'],
  ['<math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>', '<math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>'],
  ['<math><msup><mi>x</mi><mn>2</mn></msup></math>', '<math><msup><mi>x</mi><mn>2</mn></msup></math>'],
  ['<math><msqrt><mi>x</mi></msqrt></math>', '<math><msqrt><mi>x</mi></msqrt></math>'],
] as const) {
  test('recognise simulated strokes: ' + src, () => {
    const st = simulateStrokes(src, 684, 415);
    const r = recognize({ x: st.map((s) => s.x), y: st.map((s) => s.y) });
    assert.equal(strip(r.mathml), want);
  });
}

// synthetic handwriting (tools/gen/hand_corpus*.ts): strokes with slant, rotation, jitter and pauses; the truth is
// the formula they were drawn from
type Sample = { name: string; mml: string; x: number[][]; y: number[][]; t?: number[][] };
const SAME: Record<string, string> = { l: '1', I: '1', '|': '1', o: '0', O: '0' };
const CASE = new Set('cCoOsSuUvVwWxXzZpP'.split(''));
const canon = (m: string) =>
  strip(m)
    .replace(/<m([ion])>([lIoO|])<\/m[ion]>/g, (_a, _b, c) => `<m>${SAME[c]}</m>`)
    .replace(/<mn>([01])<\/mn>/g, '<m>$1</m>')
    .replace(/<mi>([a-zA-Z])<\/mi>/g, (a, c) => (CASE.has(c) ? `<mi>${c.toLowerCase()}</mi>` : a));

for (const [file, min] of [
  ['hand_corpus_in.json', 0.95],
  ['hand_corpus2_in.json', 0.95],
  ['hand_corpus3_in.json', 0.85],
] as const) {
  test(`handwriting corpus ${file} is read correctly (≥ ${min * 100}%)`, () => {
    const corpus: Sample[] = JSON.parse(readFileSync(join(process.cwd(), 'tests/oracle', file), 'utf8'));
    let ok = 0;
    const bad: string[] = [];
    for (const s of corpus) {
      const r = recognize({ x: s.x, y: s.y, t: s.t });
      if (canon(r.mathml) === canon(s.mml)) ok++;
      else if (bad.length < 8) bad.push(`${s.name}: want ${canon(s.mml)}\n    got  ${canon(r.mathml)}`);
    }
    console.log(`${file}: ${ok}/${corpus.length}`);
    if (ok / corpus.length < min) console.log(bad.join('\n'));
    assert.ok(ok / corpus.length >= min, `${ok}/${corpus.length}`);
  });
}

test('scribbles give no random symbols', () => {
  // a spiral and a random scribble are not formulas: nothing is returned (the reference answers an empty <math>)
  const spiral = { x: [Array.from({ length: 60 }, (_, i) => 200 + Math.cos(i / 4) * (5 + i))], y: [Array.from({ length: 60 }, (_, i) => 200 + Math.sin(i / 4) * (5 + i))] };
  assert.doesNotMatch(recognize(spiral).mathml, /<m[ino]>/);
  let a = 7;
  const rnd = () => (a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const line = () => Array.from({ length: 50 }, () => 100 + rnd() * 80);
  const scribble = { x: [line(), line()], y: [line(), line()] };
  const r = recognize(scribble);
  assert.doesNotMatch(r.mathml, /<m[ino]>/);
  assert.equal(r.score, 0);
});

test('the service answers the reference format', () => {
  const r = recognize({ x: [[100, 140], [140, 100]], y: [[150, 210], [150, 210]] });
  assert.match(r.mathml, /^<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML">/);
  assert.ok(r.score >= 0 && r.score <= 1);
});
