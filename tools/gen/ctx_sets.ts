// control sets of the engine at every caret stop against a recorded reference crawl (tools/ctx_matrix.js MODE=discover|select)
// usage: node .build/ctx_sets.cjs evidence/ctx_discover_ref.json [discover|select] [startKey]
import { readFileSync } from 'node:fs';
import { EditorCore } from '../../src/core/engine';
import { DocGeometry } from '../../src/layout/geometry';
import { handleKey } from '../../src/core/keys';
import { locate, controlsFor, ctxValue } from '../../src/core/context';

const [file, mode] = process.argv.slice(2);
const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, any>;
const cases = process.env.CASES ? (JSON.parse(readFileSync(process.env.CASES, 'utf8')) as any[]) : null;
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
let ok = 0;
let bad = 0;
for (const [name, rec] of Object.entries(data)) {
  if (rec.flow || !rec.mml) continue;
  const start = cases?.find((c) => c.name === name)?.start ?? 0;
  const e = new EditorCore();
  e.geometry = new DocGeometry(e);
  e.setMathML(`<math${NS}>${rec.mml}</math>`);
  const host = { ed: e, runGeneral() {} };
  handleKey(host as any, 'Home', {} as any);
  for (let i = 0; i < start; i++) handleKey(host as any, 'ArrowRight', {} as any);
  const diffs: string[] = [];
  rec.stops.forEach((st: any, i: number) => {
    if (i > 0) handleKey(host as any, 'ArrowRight', mode === 'select' ? ({ shift: true } as any) : ({} as any));
    const loc = locate(e);
    const ctl = loc ? controlsFor(loc) : [];
    const mine = ctl.map((c) => c.title + (loc && c.kind !== 'select' && ctxValue(e, loc, c.id).toggled ? '*' : ''));
    const ref = (st.sig as any[]).filter((c) => c.k !== 'i').map((c) => c.t + (c.on ? '*' : ''));
    const strip = (a: string[]) => (process.env.TOGGLES ? a : a.map((t) => t.replace(/\*$/, '')));
    if (JSON.stringify(strip(mine)) === JSON.stringify(strip(ref))) ok++;
    else {
      bad++;
      if (process.env.TOGGLES) { const a = new Set(mine), b = new Set(ref); diffs.push(`  [${i}] only ref: ${ref.filter((x) => !a.has(x)).join(',')} | only ours: ${mine.filter((x) => !b.has(x)).join(',')}`); return; }
      diffs.push(`  [${i}] ref ${ref.length ? ref.slice(0, 4).join(',') + (ref.length > 4 ? '…' + ref.length : '') : '-'}\n       ours ${mine.length ? mine.slice(0, 4).join(',') + (mine.length > 4 ? '…' + mine.length : '') : '-'}`);
    }
  });
  if (diffs.length) console.log(name + '\n' + diffs.join('\n'));
}
console.log(`${ok} equal, ${bad} different`);
