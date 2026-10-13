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

// the reference crawled with "Automatic italic" switched off (evidence/crawl_out_noitalic)
test('toolbar controls with automatic italic OFF', () => {
  const fails: string[] = [];
  let n = 0;
  for (const tab of [0, 3]) {
    const d = JSON.parse(readFileSync(join(process.cwd(), `evidence/crawl_out_noitalic/tab${tab}.json`), 'utf8'));
    for (const r of d.results) {
      const c = catalogue.controls.find((x) => x.ref === r.id);
      if (!c || behaviorOf(c) !== 'insert' || !c.A) continue;
      const run = (setup: (ed: EditorCore) => void) => {
        const ed = new EditorCore();
        ed.setMathML(EMPTY);
        ed.setAutoItalic(false);
        ed.setDigits(digitSet(c.A2));
        setup(ed);
        return ed;
      };
      const check = (label: string, got: string, want?: string) => {
        if (want === undefined) return;
        n++;
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
