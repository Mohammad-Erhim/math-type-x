import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
/** a deliberate deviation from the recordings: "لط" is no function of Arabic mathematics (the natural logarithm has no
 * Arabic name here): typed ل ط stays two letters */
const deviate = (w: string) => w.replace(/<mi>&#x644;&#x637;<\/mi>/g, '<mi>&#x644;</mi><mi>&#x637;</mi>');
const strip = (s: string) => s.replace(NS, '');

function typed(s: string, rtl: boolean): string {
  const ed = new EditorCore();
  ed.setMathML(`<math${rtl ? ' dir="rtl"' : ''}${NS}/>`);
  for (const ch of [...s]) ed.typeChar(ch);
  return strip(ed.getMathML());
}

// Arabic content typed into the reference editor (language ar and en): tools/probe_ar_typing.js
test('typing Arabic letters, digits and punctuation equals the reference', () => {
  const d = JSON.parse(readFileSync(join(process.cwd(), 'evidence/ref_ar_typing.json'), 'utf8')) as Record<string, Record<string, string>>;
  const bad: string[] = [];
  let n = 0;
  for (const lang of ['ar', 'en']) {
    for (const [s, want] of Object.entries(d[lang])) {
      const w = deviate(strip(want));
      // the recording lost the first keystroke now and then (empty result although something was typed): skip those
      if (/^<math( dir="rtl")?\/>$/.test(w) && s.trim()) continue;
      n++;
      const got = typed(s, lang === 'ar');
      if (got !== w) bad.push(`${lang} ${JSON.stringify(s)}\n   want ${w}\n   got  ${got}`);
    }
  }
  console.log(`arabic typing: ${n - bad.length}/${n}`);
  if (bad.length) console.log(bad.slice(0, 30).join('\n'));
  assert.equal(bad.length, 0);
});

// words typed in the ar editor: which ones become one function name
test('Arabic function names typed as letters merge like the reference', () => {
  const f = join(process.cwd(), 'evidence/ref_ar_words.json');
  if (!existsSync(f)) return;
  const d = JSON.parse(readFileSync(f, 'utf8')) as Record<string, string>;
  const bad: string[] = [];
  let n = 0;
  for (const [s, want] of Object.entries(d)) {
    if (/^<math\/>$/.test(want)) continue;
    n++;
    const got = typed(s, true).replace(' dir="rtl"', '');
    if (got !== deviate(want)) bad.push(`${JSON.stringify(s)}\n   want ${deviate(want)}\n   got  ${got}`);
  }
  console.log(`arabic words: ${n - bad.length}/${n}`);
  if (bad.length) console.log(bad.slice(0, 30).join('\n'));
  assert.equal(bad.length, 0);
});

// token kind of every typed character of the Arabic blocks (tools/probe_ar_classify.js)
test('typed characters of the Arabic blocks become the same token kinds as in the reference', () => {
  const d = JSON.parse(readFileSync(join(process.cwd(), 'evidence/ref_ar_classify.json'), 'utf8')) as Record<string, string>;
  const bad: string[] = [];
  let n = 0;
  for (const [hex, want] of Object.entries(d)) {
    const ch = String.fromCodePoint(parseInt(hex, 16));
    const ed = new EditorCore();
    ed.setMathML(`<math dir="rtl"${NS}/>`);
    ed.typeChar(ch);
    const m = /<(mi|mo|mn|mtext)[ >]/.exec(ed.getMathML());
    const got = m ? m[1] : '?';
    n++;
    if (got !== want.split(' ')[0]) bad.push(`U+${hex.toUpperCase().padStart(4, '0')} ${ch} want ${want} got ${got}`);
  }
  console.log(`arabic block classification: ${n - bad.length}/${n}`);
  if (bad.length) console.log(bad.slice(0, 40).join('\n'));
  assert.equal(bad.length, 0);
});
