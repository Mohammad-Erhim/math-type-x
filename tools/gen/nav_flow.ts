// insertion through the catalogue then caret stops: node .build/nav_flow.cjs tabIndex 'Control title' [typed text]
import { EditorCore } from '../../src/core/engine';
import { findControl } from '../../src/core/catalogue';
import { DocGeometry } from '../../src/layout/geometry';
import { handleKey } from '../../src/core/keys';
const [tab, title, text] = process.argv.slice(2);
const e = new EditorCore();
e.geometry = new DocGeometry(e);
const c = findControl(+tab, 0, title);
if (!c) throw new Error('no control');
e.activate(c);
for (const ch of text ?? '') e.typeChar(ch);
console.log(JSON.stringify(e.row, (k, v) => (k === 'g' ? undefined : v)).slice(0, 700));
console.log(e.getMathML().replace(/ xmlns="[^"]*"/, ''));
const host = { ed: e, runGeneral() {} };
handleKey(host as any, 'Home', {} as any);
const seen: string[] = [];
for (let i = 0; i < 30; i++) {
  const k = JSON.stringify(e.caret.path) + '#' + e.caret.index;
  seen.push(k);
  handleKey(host as any, 'ArrowRight', {} as any);
  if (JSON.stringify(e.caret.path) + '#' + e.caret.index === k) break;
}
console.log(seen.join('\n'));
