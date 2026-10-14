/**
 * Which controls the contextual tab offers: the caret was walked through formulas in the real playground
 * (tools/ctx_matrix.js, MODE=discover and MODE=select) and the control titles recorded at every stop; the engine must offer the
 * same set at the same stop. Recorded in evidence/ctx_*_ref.json, the formulas in evidence/ctx_cases_*.json.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { DocGeometry } from '../src/layout/geometry';
import { handleKey } from '../src/core/keys';
import { locate, controlsFor, ctxValue } from '../src/core/context';

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const read = (f: string) => JSON.parse(readFileSync(join(process.cwd(), f), 'utf8'));

// recordings of the reference; `skip` lists formulas the reference could not load (its editor kept the previous one)
const RUNS: { file: string; mode: 'discover' | 'select'; cases?: string; skip?: string[] }[] = [
  { file: 'evidence/ctx_discover_ref.json', mode: 'discover', skip: ['longdiv'] },
  { file: 'evidence/ctx_adj_ref.json', mode: 'discover', skip: ['longdiv_us'] },
  { file: 'evidence/ctx_ops_ref.json', mode: 'discover', skip: ['o_2208'] },
  { file: 'evidence/ctx_ops2_ref.json', mode: 'discover' },
  { file: 'evidence/ctx_nest_ref.json', mode: 'discover', skip: ['n3'] },
  { file: 'evidence/ctx_sel_ref.json', mode: 'select' },
  { file: 'evidence/ctx_sel2_ref.json', mode: 'select', cases: 'evidence/ctx_cases_sel2.json' },
];

for (const run of RUNS) {
  if (!existsSync(join(process.cwd(), run.file))) continue;
  test(`contextual controls per caret stop equal the reference: ${run.file.replace(/^evidence\/ctx_|_ref\.json$/g, '')}`, () => {
    const data = read(run.file) as Record<string, any>;
    const cases = run.cases ? (read(run.cases) as { name: string; start?: number }[]) : [];
    let ok = 0;
    const bad: string[] = [];
    for (const [name, rec] of Object.entries(data)) {
      if (rec.flow || !rec.mml || run.skip?.includes(name)) continue;
      const e = new EditorCore();
      e.geometry = new DocGeometry(e);
      e.setMathML(`<math${NS}>${rec.mml}</math>`);
      const host = { ed: e, runGeneral() {} };
      handleKey(host as any, 'Home', {} as any);
      for (let i = 0; i < (cases.find((c) => c.name === name)?.start ?? 0); i++) handleKey(host as any, 'ArrowRight', {} as any);
      rec.stops.forEach((st: any, i: number) => {
        if (i > 0) handleKey(host as any, 'ArrowRight', run.mode === 'select' ? ({ shift: true } as any) : ({} as any));
        const loc = locate(e);
        const mine = (loc ? controlsFor(loc) : []).map((c) => c.title + (loc && c.kind !== 'select' && ctxValue(e, loc, c.id).toggled ? '*' : ''));
        const ref = (st.sig as any[]).filter((c) => c.k !== 'i').map((c) => c.t + (c.on ? '*' : ''));
        // a stop is only compared when the reference's caret did not stay put (end of the formula repeats the last stop)
        if (JSON.stringify(mine) === JSON.stringify(ref)) ok++;
        else bad.push(`${name}[${i}] ref ${ref.join(',') || '-'} | ours ${mine.join(',') || '-'}`);
      });
    }
    assert.ok(ok > 0);
    assert.equal(bad.length, 0, `${bad.length} stops differ (${ok} equal):\n${bad.slice(0, 6).join('\n')}`);
  });
}
