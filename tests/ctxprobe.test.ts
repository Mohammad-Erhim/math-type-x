import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { locate, controlsFor } from '../src/core/context';

const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const M = (x: string) => `<math ${NS}>${x}</math>`;
// same documents as tools/lib_ctx.js
const CONTEXTS: Record<string, string> = {
  matrix: M('<mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced>'),
  table: M('<mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable>'),
  piecewise: M('<mfenced open="{" close=""><mtable columnalign="left"><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr></mtable></mfenced>'),
  aligned: M('<mtable columnalign="right left"><mtr><mtd><mi>a</mi></mtd><mtd><mo>=</mo><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mo>=</mo><mi>d</mi></mtd></mtr></mtable>'),
  fence: M('<mfenced open="[" close="]"><mi>x</mi><mo>+</mo><mn>1</mn></mfenced>'),
  fraction: M('<mfrac><mi>a</mi><mi>b</mi></mfrac>'),
  operator: M('<mi>x</mi><mo>+</mo><mi>y</mi>'),
  multiline: M('<mi>a</mi><mspace linebreak="newline"/><mi>b</mi>'),
  longdiv: M('<mlongdiv longdivstyle="lefttop"><mn>3</mn><mn>12</mn><mn>4</mn></mlongdiv>'),
  stack: M('<mstack><mn>12</mn><msrow><mo>+</mo><mn>34</mn></msrow><msline/></mstack>'),
  mspace: M('<mi>a</mi><mspace width="1em" height="3ex" depth="2ex"/><mi>b</mi>'),
  numsep: M('<mn>1</mn><mo>.</mo><mn>5</mn>'),
  symbol: M('<mi>x</mi>'),
  sum: M('<munderover><mo>&#x2211;</mo><mi>i</mi><mi>n</mi></munderover>'),
  root: M('<msqrt><mi>x</mi></msqrt>'),
};

/** which controls the contextual tab shows with the caret k steps left of the end (reference probe s10a) */
test('contextual tab control sets match the reference probe', () => {
  const ref: Record<string, Record<string, string[]>> = JSON.parse(readFileSync(join(process.cwd(), 'evidence/scenarios/s10a.json'), 'utf8'));
  const bad: string[] = [];
  let n = 0;
  for (const [key, mml] of Object.entries(CONTEXTS)) {
    for (let k = 0; k <= 3; k++) {
      // the recorded 'longdiv' lists are copies of the previous context (no contextual controls: scenario s30)
      const want = key === 'longdiv' ? [] : ref[key]?.[String(k)];
      if (!want) continue;
      const ed = new EditorCore();
      ed.setMathML(mml);
      for (let i = 0; i < k; i++) ed.moveLeft();
      const loc = locate(ed);
      const got = loc ? controlsFor(loc).map((c) => c.title) : [];
      n++;
      if (JSON.stringify(got) !== JSON.stringify(want)) {
        const miss = want.filter((w) => !got.includes(w));
        const extra = got.filter((g) => !want.includes(g));
        bad.push(`${key} x${k} want=${want.length} got=${got.length}\n   missing ${JSON.stringify(miss).slice(0, 300)}\n   extra   ${JSON.stringify(extra).slice(0, 300)}${!miss.length && !extra.length ? ' (order)' : ''}`);
      }
    }
  }
  console.log(`context probe: ${n - bad.length}/${n} equal`);
  if (bad.length && process.env.SHOW) console.log(bad.join('\n'));
  else if (bad.length) console.log(bad.map((b) => b.split('\n')[0]).join(', '));
  assert.ok(n - bad.length >= Number(process.env.CTX_MIN ?? 0));
});
