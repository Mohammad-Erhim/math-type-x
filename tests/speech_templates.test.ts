import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mathml2accessible } from '../src/convert/speech';

// structure probes with marker operands (tools/gen/speech_probe.mjs): the reference answer in English and Arabic
const d: Record<string, { mml: string; en: string; ar: string }> = JSON.parse(readFileSync(join(process.cwd(), 'tests/oracle/speech_templates.json'), 'utf8'));
const run = (mml: string, lang: string) => {
  try {
    return mathml2accessible(mml, lang);
  } catch {
    return 'Error converting from MathML to accessible text.';
  }
};

for (const lang of ['en', 'ar'] as const) {
  test(`accessible text of the structure probes (${lang})`, () => {
    const bad: string[] = [];
    for (const [k, v] of Object.entries(d)) {
      const want = v[lang];
      if (/Error 500/.test(want)) continue;
      const got = run(v.mml, lang);
      if (got !== want) bad.push(`${k}\n   want ${JSON.stringify(want)}\n   got  ${JSON.stringify(got)}`);
    }
    console.log(`speech templates ${lang}: ${Object.keys(d).length - bad.length}/${Object.keys(d).length}`);
    if (bad.length) console.log(bad.slice(0, 60).join('\n'));
    assert.equal(bad.length, 0);
  });
}

// every input of the English corpora answered by the reference for lang=ar (tools/gen/oracle_speech_ar.mjs)
test('accessible text of the whole corpus in Arabic', () => {
  const ar: Record<string, string> = JSON.parse(readFileSync(join(process.cwd(), 'tests/oracle/services_speech_ar.json'), 'utf8'));
  const bad: string[] = [];
  let n = 0;
  for (const [mml, want] of Object.entries(ar)) {
    if (want.includes('<!DOCTYPE')) continue;
    n++;
    const got = run(mml, 'ar');
    if (got !== want) bad.push(`${mml.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '').slice(0, 200)}\n   want ${JSON.stringify(want)}\n   got  ${JSON.stringify(got)}`);
  }
  console.log(`speech ar corpus: ${n - bad.length}/${n}`);
  if (process.env.SHOW) console.log(bad.slice(0, +process.env.SHOW).join('\n'));
  assert.equal(bad.length, 0);
});

// random editor documents answered by the reference in both languages (tools/fuzz_speech.sh)
test('accessible text of random documents in English and Arabic', () => {
  const rec: Record<string, { en: string; ar: string }> = JSON.parse(readFileSync(join(process.cwd(), 'tests/oracle/speech_fuzz.json'), 'utf8'));
  const bad: string[] = [];
  let n = 0;
  for (const [mml, v] of Object.entries(rec)) {
    if (v.en.includes('<!DOCTYPE') || v.en === 'NETWORK') continue;
    for (const lang of ['en', 'ar'] as const) {
      n++;
      const got = run(mml, lang);
      if (got !== v[lang]) bad.push(`[${lang}] ${mml.slice(0, 200)}\n   want ${JSON.stringify(v[lang])}\n   got  ${JSON.stringify(got)}`);
    }
  }
  console.log(`speech fuzz corpus: ${n - bad.length}/${n}`);
  if (bad.length) console.log(bad.slice(0, 10).join('\n'));
  assert.equal(bad.length, 0);
});
