/**
 * Contextual-tab actions against the reference: every control (every option of a select) was clicked at every caret stop
 * of a formula in the real playground (tools/ctx_matrix.js MODE=effects) and the resulting MathML recorded; the engine must
 * produce the same MathML for the same caret stop and control.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { DocGeometry } from '../src/layout/geometry';
import { handleKey } from '../src/core/keys';
import { locate, controlsFor, applyContext } from '../src/core/context';

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const norm = (s: string) => s.replace(NS, '').replace(' xmlns:wrs="http://www.wiris.com/xml/mathml-extension"', '').replace(/<math[^>]*>/, '<math>');

const RUNS: [string, string[]][] = [
  ['evidence/ctx_ld_fx_all_ref.json', ['stack_full', 'ld_full']],
  ['evidence/ctx_fx2_ref.json', ['fx_paren', 'fx_numdot', 'fx_stack', 'fx_multiline']],
  ['evidence/ctx_fx_ref.json', ['fx_arrow', 'fx_hat', 'fx_bar', 'fx_paren_arrow', 'fx_lim', 'fx_brace']],
];

for (const [file, names] of RUNS) {
  const path = join(process.cwd(), file);
  if (!existsSync(path)) continue;
  const data = JSON.parse(readFileSync(path, 'utf8')) as Record<string, { mml: string; stops: { i: number; fx?: Record<string, { mml?: string }> }[] }>;
  for (const name of names) {
    const rec = data[name];
    if (!rec) continue;
    test(`contextual actions equal the reference: ${name}`, () => {
      let n = 0;
      const bad: string[] = [];
      for (const st of rec.stops) {
        for (const [label, f] of Object.entries(st.fx ?? {})) {
          if (!f.mml) continue;
          const e = new EditorCore();
          e.geometry = new DocGeometry(e);
          e.setMathML(`<math${NS}>${rec.mml}</math>`);
          const host = { ed: e, runGeneral() {} };
          handleKey(host as any, 'Home', {} as any);
          for (let i = 0; i < st.i; i++) handleKey(host as any, 'ArrowRight', {} as any);
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
      assert.ok(n > 0);
      assert.equal(bad.length, 0, `${bad.length}/${n} differ:\n${bad.slice(0, 5).join('\n')}`);
    });
  }
}
