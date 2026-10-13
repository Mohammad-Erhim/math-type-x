import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { accessible2mathml } from '../src/convert/accessible';
import { mathml2accessible } from '../src/convert/speech';

// The Arabic phrases are read through the same grammar as the English ones: speaking a formula in Arabic and
// reading it back gives the same MathML as speaking and reading it in English.
test('accessible text in Arabic reads back like the English text', () => {
  const ar: Record<string, string> = JSON.parse(readFileSync(join(process.cwd(), 'tests/oracle/services_speech_ar.json'), 'utf8'));
  let n = 0;
  let same = 0;
  const bad: string[] = [];
  for (const [mml, spokenAr] of Object.entries(ar)) {
    if (/Error|DOCTYPE/.test(spokenAr)) continue;
    let en: string;
    try {
      en = mathml2accessible(mml, 'en');
    } catch {
      continue;
    }
    n++;
    const a = accessible2mathml(en, 'en');
    const b = accessible2mathml(spokenAr, 'ar');
    if (a === b) same++;
    else if (bad.length < 15) bad.push(`${JSON.stringify(en)}\n   ar  ${JSON.stringify(spokenAr)}\n   en→ ${a}\n   ar→ ${b}`);
  }
  console.log(`accessible2mathml ar vs en: ${same}/${n}`);
  if (bad.length) console.log(bad.join('\n'));
  assert.ok(same / n > 0.9, `only ${same}/${n} agree`);
});

test('simple Arabic phrases', () => {
  const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
  assert.equal(accessible2mathml('a على b', 'ar'), `<math${NS}><mfrac><mi>a</mi><mi>b</mi></mfrac></math>`);
  assert.equal(accessible2mathml('الجذرالمربع ل x', 'ar'), `<math${NS}><msqrt><mi>x</mi></msqrt></math>`);
});
