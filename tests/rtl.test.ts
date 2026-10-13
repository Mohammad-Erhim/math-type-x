import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogue, behaviorOf } from '../src/core/catalogue';
import { EditorCore } from '../src/core/engine';

const EMPTY = '<math xmlns="http://www.w3.org/1998/Math/MathML"/>';
const norm = (s: string) => s.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '');

function digitSet(m?: string): 'western' | 'arabicIndic' | 'easternArabicIndic' {
  if (m && m.includes('&#x6F7;')) return 'easternArabicIndic';
  if (m && m.includes('&#x667;')) return 'arabicIndic';
  return 'western';
}

// the reference crawled with "Right to left editing" switched on (evidence/crawl_out_rtl)
test('toolbar controls in right-to-left mode', () => {
  const fails: string[] = [];
  let n = 0;
  for (const tab of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
    const d = JSON.parse(readFileSync(join(process.cwd(), `evidence/crawl_out_rtl/tab${tab}.json`), 'utf8'));
    for (const r of d.results) {
      const c = catalogue.controls.find((x) => x.ref === r.id);
      if (!c || behaviorOf(c) !== 'insert' || !c.A) continue;
      const run = (setup: (ed: EditorCore) => void) => {
        const ed = new EditorCore();
        ed.setMathML(EMPTY);
        ed.setRtl(true);
        ed.setDigits(digitSet(c.A2));
        setup(ed);
        return ed;
      };
      const check = (label: string, got: string, want0?: string) => {
        if (want0 === undefined) return;
        let want = want0;
        n++;
        // a deliberate deviation: the limit of a right-to-left formula is the Arabic word نها (the reference keeps "lim")
        want = want.replace(/<mi>lim<\/mi>/g, '<mi>&#x646;&#x647;&#x627;</mi>');
        // and the natural logarithm is طا (the reference writes لط, which is no function of Arabic mathematics)
        want = want.replace(/<mi>&#x644;&#x637;<\/mi>/g, '<mi>&#x637;&#x627;</mi>');
        if (norm(got) !== norm(want)) fails.push(`${r.id} ${c.title} [${label}]\n    want ${norm(want)}\n    got  ${norm(got)}`);
      };
      let ed = run(() => {});
      ed.activate(c);
      check('A', ed.getMathML(), r.cases.A?.mathml);
      ed.typeChar('7');
      check('A2', ed.getMathML(), r.cases.A2?.mathml);
      ed = run((e) => e.typeChar('x'));
      ed.activate(c);
      check('B', ed.getMathML(), r.cases.B?.mathml);
      ed = run((e) => {
        e.typeChar('x');
        e.moveLeft(true);
      });
      ed.activate(c);
      check('C', ed.getMathML(), r.cases.C?.mathml);
    }
  }
  console.log('checked', n, 'cases; failures', fails.length);
  if (fails.length) console.log(fails.slice(0, 400).join('\n'));
  assert.equal(fails.length, 0);
});

test('Arabic languages type Arabic-Indic digits by default, Persian / Urdu the Eastern set, others Western', async () => {
  const { digitsForLanguage } = await import('../src/core/typing');
  for (const l of ['ar', 'ar_eg', 'AR-sa', 'ar_ma']) assert.equal(digitsForLanguage(l), 'arabicIndic', l);
  for (const l of ['fa', 'ur', 'ps']) assert.equal(digitsForLanguage(l, [], ['fa', 'ps', 'ur']), 'easternArabicIndic', l);
  for (const l of ['en', 'fr', '', 'arm']) assert.equal(digitsForLanguage(l), 'western', l);
  const c = new EditorCore();
  c.modes.digits = digitsForLanguage('ar');
  c.typeText('12');
  assert.match(c.getMathML(), /<mn>&#x661;&#x662;<\/mn>|<mn>\u0661\u0662<\/mn>/);
});

test('bold / italic on a joined Arabic word keeps the letters one run (they stay joined in the drawing)', async () => {
  const { parseMathML } = await import('../src/core/mathml');
  const { layoutDocument } = await import('../src/layout/layout');
  const texts = (c: EditorCore) =>
    layoutDocument(parseMathML(c.getMathML()).row, undefined, 16, true).items.filter((i) => i.k === 'g').map((i) => (i as { text: string }).text);
  for (const act of ['bold', 'italic', 'color']) {
    const c = new EditorCore();
    c.setRtl(true);
    c.modes.arabicLigature = true;
    c.typeText('نها');
    assert.deepEqual(texts(c), ['نها']);
    c.selectAll();
    if (act === 'bold') c.toggleBold();
    else if (act === 'italic') c.toggleItalic();
    else c.setColor('#FF0000');
    assert.deepEqual(texts(c), ['نها'], act);
  }
  // letters typed one by one without the ligature mode were separate letters and stay so
  const d = new EditorCore();
  d.setRtl(true);
  d.typeText('نها');
  d.selectAll();
  d.toggleBold();
  assert.equal(texts(d).length, 3);
});

test('the exponent of an inverse function follows the typed digit set (Arabic-Indic digits in Arabic)', () => {
  const ctl = catalogue.controls.find((c) => c.title === 'Arcsine')!;
  for (const [set, one] of [['western', '1'], ['arabicIndic', '١'], ['easternArabicIndic', '۱']] as const) {
    const ed = new EditorCore();
    ed.setMathML(EMPTY);
    ed.setRtl(true);
    ed.setDigits(set);
    ed.activate(ctl);
    const m = ed.getMathML();
    const cp = (one.codePointAt(0) as number).toString(16).toUpperCase();
    assert.ok(set === 'western' ? m.includes('<mn>1</mn>') : m.includes(`<mn>&#x${cp};</mn>`), set + ' ' + m);
  }
});
