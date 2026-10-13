// replays recorded reference effects (tools/ctx_matrix.js MODE=effects) through the engine and reports differences
// usage: node .build/ctx_replay.cjs evidence/file.json caseName
import { readFileSync } from 'node:fs';
import { EditorCore } from '../../src/core/engine';
import { DocGeometry } from '../../src/layout/geometry';
import { handleKey } from '../../src/core/keys';
import { locate, controlsFor, applyContext } from '../../src/core/context';

const [file, name] = process.argv.slice(2);
const rec = JSON.parse(readFileSync(file, 'utf8'))[name];
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const strip = (s: string) => s.replace(NS, '').replace(' xmlns:wrs="http://www.wiris.com/xml/mathml-extension"', '');
let ok = 0;
let bad = 0;
for (const st of rec.stops) {
  if (!st.fx) continue;
  for (const [label, f] of Object.entries<any>(st.fx)) {
    if (!f.mml) continue;
    const e = new EditorCore();
    e.geometry = new DocGeometry(e);
    e.setMathML(`<math${NS}>${rec.mml}</math>`);
    const host = { ed: e, runGeneral() {} };
    handleKey(host as any, 'Home', {} as any);
    for (let i = 0; i < st.i; i++) handleKey(host as any, 'ArrowRight', {} as any);
    const loc = locate(e);
    const eq = label.indexOf('=');
    const title = eq > 0 ? label.slice(0, eq) : label;
    const value = eq > 0 ? label.slice(eq + 1) : undefined;
    const ctl = loc ? controlsFor(loc).find((c) => c.title === title) : undefined;
    let got = '(no control)';
    if (ctl) {
      applyContext(e, ctl.id, value);
      got = strip(e.getMathML());
    }
    const want = strip(f.mml.startsWith('<math') ? f.mml : f.mml);
    const norm = (x: string) => x.replace(/<math[^>]*>/, '<math>');
    if (norm(got) === norm(want)) ok++;
    else {
      bad++;
      console.log(`stop ${st.i} ${label}\n   want ${norm(want).slice(0, 300)}\n   got  ${norm(got).slice(0, 300)}`);
    }
  }
}
console.log(`${ok} equal, ${bad} different`);
