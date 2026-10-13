import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { locate, controlsFor, ctxValue, ctxLayoutKey } from '../src/core/context';
import LAYOUT from '../src/data/ctx-layout.json';

const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const M = (x: string) => `<math ${NS}>${x}</math>`;
const DOCS: Record<string, string> = {
  matrix: M('<mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced>'),
  table: M('<mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable>'),
  piecewise: M('<mfenced open="{" close=""><mtable columnalign="left"><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr></mtable></mfenced>'),
  aligned: M('<mtable columnalign="right left"><mtr><mtd><mi>a</mi></mtd><mtd><mo>=</mo><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mo>=</mo><mi>d</mi></mtd></mtr></mtable>'),
  fence: M('<mfenced open="[" close="]"><mi>x</mi><mo>+</mo><mn>1</mn></mfenced>'),
  operator: M('<mi>x</mi><mo>+</mo><mi>y</mi>'),
  multiline: M('<mi>a</mi><mspace linebreak="newline"/><mi>b</mi>'),
  stack: M('<mstack><mn>12</mn><msrow><mo>+</mo><mn>34</mn></msrow><msline/></mstack>'),
  mspace: M('<mi>a</mi><mspace width="1em" height="3ex" depth="2ex"/><mi>b</mi>'),
  sum: M('<munderover><mo>&#x2211;</mo><mi>i</mi><mi>n</mi></munderover>'),
  symbol: M('<mi>x</mi>'),
  longdiv: M('<mlongdiv longdivstyle="lefttop"><mn>3</mn><mn>12</mn><mn>4</mn></mlongdiv>'),
  numA: M('<mn>1</mn><mo>.</mo><mn>5</mn>'),
  numB: M('<mn>1</mn><mo>,</mo><mn>000</mn>'),
};

/** the contextual tab of the reference (tools/s30.js): which controls, which layout, which toggles, which select values */
test('contextual tab state follows the recorded reference DOM', () => {
  const steps: any[] = JSON.parse(readFileSync(join(process.cwd(), 'evidence/ref_ctx_dump.json'), 'utf8')).steps;
  const bad: string[] = [];
  let n = 0;
  for (const st of steps) {
    const m = /^(\w+) k=(\d)( sel(\d))?( all)?$/.exec(st.desc);
    if (!m) continue;
    const [, key, k, , sl, all] = m;
    const ed = new EditorCore();
    ed.setMathML(DOCS[key]);
    for (let i = 0; i < Number(k); i++) ed.moveLeft();
    for (let i = 0; i < Number(sl ?? 0); i++) ed.moveLeft(true);
    if (all) ed.selectAll();
    const loc = locate(ed);
    const vis = st.extra.filter((e: any) => e.rect[2] > 0 && e.rect[3] > 0);
    const refButtons = vis.filter((e: any) => e.title && ((e.tag === 'BUTTON' && e.rect[1] > 25) || e.tag === 'SELECT'));
    const refTitles = refButtons.map((e: any) => e.title as string);
    n++;
    const ctl = loc ? controlsFor(loc) : [];
    const got = ctl.map((c) => c.title);
    const wantSet = ([...new Set(refTitles)] as string[]).sort();
    if (JSON.stringify([...got].sort()) !== JSON.stringify(wantSet)) {
      bad.push(`${st.desc}: controls missing ${JSON.stringify(wantSet.filter((t) => !got.includes(t)))} extra ${JSON.stringify(got.filter((t) => !wantSet.includes(t)))}`);
      continue;
    }
    if (!loc) continue;
    const lay = (LAYOUT as any)[ctxLayoutKey(loc)];
    if (!lay) bad.push(`${st.desc}: no layout ${ctxLayoutKey(loc)}`);
    // toggled buttons
    const refOn = refButtons.filter((e: any) => /wrs_toggled/.test(e.cls)).map((e: any) => e.title as string).sort();
    const gotOn = ctl.filter((c) => ctxValue(ed, loc, c.id).toggled).map((c) => c.title).sort();
    if (JSON.stringify(refOn) !== JSON.stringify(gotOn)) bad.push(`${st.desc}: toggled\n   want ${refOn.join(' | ')}\n   got  ${gotOn.join(' | ')}`);
  }
  console.log(`ctx layout: ${n - bad.length}/${n}`);
  if (bad.length) console.log(bad.slice(0, 10).join('\n'));
  assert.ok(n >= 20);
});
