/**
 * Which controls the contextual tab offers in structures inserted with the toolbar (and typed into): the caret was walked
 * through them in the real playground (tools/ctx_matrix.js MODE=discover with flows; evidence/ctx_flows_ref.json and the
 * random nested flows evidence/ctx_rand_ref.json); the engine must offer the same controls (same pressed state) at every stop.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { DocGeometry } from '../src/layout/geometry';
import { handleKey } from '../src/core/keys';
import { locate, controlsFor, ctxValue } from '../src/core/context';
import { catalogue, behaviorOf } from '../src/core/catalogue';

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const EXT = new Set(['Baseline', 'Middle', 'Middle-baseline']);

function runFlow(e: EditorCore, host: any, flow: string[]): boolean {
  for (const st of flow) {
    if (st.startsWith('type:')) e.typeText(st.slice(5));
    else if (st.startsWith('key:')) handleKey(host, st.slice(4), {} as any);
    else {
      const ctl = catalogue.controls.find((c) => c.title === st);
      if (!ctl || behaviorOf(ctl) === 'picker') return false;
      e.activate(ctl);
    }
  }
  return true;
}
const cases = (f: string): Record<string, any> => (existsSync(join(process.cwd(), f)) ? JSON.parse(readFileSync(join(process.cwd(), f), 'utf8')) : {});
const known: Record<string, string> = existsSync(join(process.cwd(), 'evidence/ctx_flows_known.json')) ? JSON.parse(readFileSync(join(process.cwd(), 'evidence/ctx_flows_known.json'), 'utf8')) : {};

for (const file of ['evidence/ctx_flows_ref.json', 'evidence/ctx_rand_ref.json']) {
  const data = cases(file);
  if (!Object.keys(data).length) continue;
  test(`contextual controls per caret stop equal the reference: ${file.replace(/^evidence\/ctx_|_ref\.json$/g, '')}`, () => {
    let ok = 0;
    let skipped = 0;
    const bad: string[] = [];
    for (const [name, rec] of Object.entries(data)) {
      if (!rec.flow) continue;
      const e = new EditorCore();
      e.geometry = new DocGeometry(e);
      e.setMathML(`<math${NS}/>`);
      const host = { ed: e, runGeneral() {} };
      if (!runFlow(e, host, rec.flow)) {
        skipped++;
        continue;
      }
      // the reference's walk starts at Home of the typed formula; the stops are single ArrowRight presses
      handleKey(host as any, 'Home', {} as any);
      rec.stops.forEach((st: any, i: number) => {
        if (i > 0) handleKey(host as any, 'ArrowRight', {} as any);
        if (known[`${name}|${i}`]) return;
        const loc = locate(e);
        const mine = (loc ? controlsFor(loc) : []).filter((c) => !EXT.has(c.title)).map((c) => c.title + (loc && c.kind !== 'select' && ctxValue(e, loc, c.id).toggled ? '*' : ''));
        const ref = (st.sig as any[]).filter((c) => c.k !== 'i' && !EXT.has(c.t)).map((c) => c.t + (c.on ? '*' : ''));
        if (JSON.stringify(mine) === JSON.stringify(ref)) ok++;
        else bad.push(`${name}[${i}] ref ${ref.join(',') || '-'} | ours ${mine.join(',') || '-'}`);
      });
    }
    assert.ok(ok > 0, `nothing compared (${skipped} skipped)`);
    assert.equal(bad.length, 0, `${bad.length} stops differ (${ok} equal, ${skipped} flows skipped):\n${bad.slice(0, 10).join('\n')}`);
  });
}
