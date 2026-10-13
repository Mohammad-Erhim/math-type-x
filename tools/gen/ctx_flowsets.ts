// control sets at every caret stop of formulas built through the toolbar (evidence/ctx_flows_ref.json)
import { readFileSync } from 'node:fs';
import { EditorCore } from '../../src/core/engine';
import { DocGeometry } from '../../src/layout/geometry';
import { handleKey } from '../../src/core/keys';
import { findControl } from '../../src/core/catalogue';
import { locate, controlsFor, ctxValue } from '../../src/core/context';
const data = JSON.parse(readFileSync('evidence/ctx_flows_ref.json', 'utf8')) as Record<string, any>;
const tabs = JSON.parse(readFileSync('tools/toolbar_tabs.json', 'utf8')) as Record<string, number>;
let ok = 0, bad = 0, same = 0, diffCount = 0;
for (const [name, rec] of Object.entries(data)) {
  const e = new EditorCore();
  e.geometry = new DocGeometry(e);
  const host = { ed: e, runGeneral() {} };
  for (const st of rec.flow as string[]) {
    if (st.startsWith('type:')) for (const ch of st.slice(5)) e.typeChar(ch);
    else if (st.startsWith('key:')) handleKey(host as any, st.slice(4), {} as any);
    else {
      const c = findControl(tabs[st], 0, st);
      if (!c) throw new Error('no control ' + st);
      e.activate(c);
    }
  }
  handleKey(host as any, 'Home', {} as any);
  const mine: string[][] = [];
  let prev = '';
  for (let i = 0; i < 40; i++) {
    const loc = locate(e);
    mine.push((loc ? controlsFor(loc) : []).map((c) => c.title + (c.kind !== 'select' && loc && ctxValue(e, loc, c.id).toggled ? '*' : '')));
    const k = JSON.stringify(e.caret);
    handleKey(host as any, 'ArrowRight', {} as any);
    if (JSON.stringify(e.caret) === k) break;
  }
  const ref = rec.stops.map((s: any) => (s.sig as any[]).filter((c) => c.k !== 'i').map((c) => c.t + (c.on ? '*' : '')));
  const mm = rec.stops[0].mml;
  void mm;
  // the crawl records the last stop twice (the key that did not move the caret)
  if (ref.length === mine.length + 1) ref.pop();
  if (mine.length !== ref.length) {
    diffCount++;
    console.log(`${name}: stops ${mine.length} vs ref ${ref.length}`);
    continue;
  }
  same++;
  const bads: string[] = [];
  ref.forEach((r: string[], i: number) => {
    if (JSON.stringify(r) === JSON.stringify(mine[i])) ok++;
    else { bad++; bads.push(`[${i}] ref ${r.slice(0, 3).join(',')}${r.length > 3 ? '…' + r.length : ''} ours ${mine[i].slice(0, 3).join(',')}${mine[i].length > 3 ? '…' + mine[i].length : ''}`); }
  });
  if (bads.length) console.log(name + ' ' + bads.join(' | '));
}
console.log(`flows with the same stop count ${same}, other ${diffCount}; stops equal ${ok}, different ${bad}`);
