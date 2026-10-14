/**
 * Every contextual control (every option of a select) at every caret stop / selection extent of the formulas of
 * tools/ctx_cases*.js, clicked in the real playground (tools/ctx_matrix.js MODE=effects, evidence/ctx_fx_all_*.json): the
 * engine must produce the same MathML.  evidence/ctx_fx_known.json lists deliberate deviations ("case|stop|label": why).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { DocGeometry } from '../src/layout/geometry';
import { handleKey } from '../src/core/keys';
import { locate, controlsFor, applyContext } from '../src/core/context';
import { catalogue, behaviorOf } from '../src/core/catalogue';

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const norm = (s: string) => s.replace(NS, '').replace(' xmlns:wrs="http://www.wiris.com/xml/mathml-extension"', '').replace(/<math[^>]*>/, '<math>');
/** toolbar flow of the crawls: control titles, type:text, key:Name; false when it needs a picker */
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
const known: Record<string, string> = existsSync(join(process.cwd(), 'evidence/ctx_fx_known.json')) ? JSON.parse(readFileSync(join(process.cwd(), 'evidence/ctx_fx_known.json'), 'utf8')) : {};
const dir = join(process.cwd(), 'evidence');
/** the caret / selection of a case starts after `start` ArrowRight presses (formulas of the case files) */
const starts: Record<string, number> = {};
for (const f of readdirSync(dir).filter((x) => /^ctx_cases_.*\.json$/.test(x))) {
  for (const c of JSON.parse(readFileSync(join(dir, f), 'utf8')) as { name: string; start?: number }[]) if (c.start) starts[c.name] = c.start;
}
const files = readdirSync(dir).filter((f) => /^ctx_fx_all_.*_ref\.json$/.test(f));

for (const file of files) {
  const select = /_sel/.test(file);
  const data = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Record<string, { mml: string; flow?: string[]; stops: { i: number; fx?: Record<string, { mml?: string }> }[] }>;
  for (const [name, rec] of Object.entries(data)) {
    // the reference cannot load a bare mlongdiv (its editor kept the previous formula)
    if (name === 'longdiv' || name === 'longdiv_us') continue;
    test(`contextual effects equal the reference: ${file.replace(/^ctx_fx_all_|_ref\.json$/g, '')}/${name}`, () => {
      let n = 0;
      const bad: string[] = [];
      for (const st of rec.stops) {
        for (const [label, f] of Object.entries(st.fx ?? {})) {
          if (!f.mml) continue;
          if (known[`${name}|${st.i}|${label}`]) continue;
          const e = new EditorCore();
          e.geometry = new DocGeometry(e);
          const host = { ed: e, runGeneral() {} };
          if (rec.flow) {
            e.setMathML(`<math${NS}/>`);
            if (!runFlow(e, host, rec.flow)) continue;
          } else e.setMathML(`<math${NS}>${rec.mml}</math>`);
          handleKey(host as any, 'Home', {} as any);
          for (let i = 0; i < (starts[name] ?? 0); i++) handleKey(host as any, 'ArrowRight', {} as any);
          for (let i = 0; i < st.i; i++) handleKey(host as any, 'ArrowRight', select ? { shift: true } as any : {} as any);
          const eq = label.indexOf('=');
          const title = eq > 0 ? label.slice(0, eq) : label;
          const value = eq > 0 ? label.slice(eq + 1) : undefined;
          const loc = locate(e);
          const ctl = loc ? controlsFor(loc).find((c) => c.title === title) : undefined;
          let got = '(no control)';
          if (ctl) {
            applyContext(e, ctl.id, value);
            got = norm(e.getMathML());
          }
          n++;
          if (got !== norm(f.mml)) bad.push(`stop ${st.i} ${label}\n   want ${norm(f.mml)}\n   got  ${got}`);
        }
      }
      assert.equal(bad.length, 0, `${bad.length}/${n} differ:\n${bad.slice(0, process.env.ALL ? 999 : 8).join('\n')}`);
    });
  }
}
