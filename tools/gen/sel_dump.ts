// selection extents of the engine after n Shift+ArrowRight from `start`: node .build/sel_dump.cjs '<mml>' start n
import { EditorCore } from '../../src/core/engine';
import { DocGeometry } from '../../src/layout/geometry';
import { handleKey } from '../../src/core/keys';
const [mml, start, n] = process.argv.slice(2);
const e = new EditorCore();
e.geometry = new DocGeometry(e);
e.setMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${mml}</math>`);
const host = { ed: e, runGeneral() {} };
handleKey(host as any, 'Home', {} as any);
for (let i = 0; i < +start; i++) handleKey(host as any, 'ArrowRight', {} as any);
for (let i = 1; i <= +n; i++) {
  handleKey(host as any, 'ArrowRight', { shift: true } as any);
  const s = e.sel;
  const row = s ? (e as any).row : null;
  let txt = '';
  if (s) {
    let r = e.row;
    for (const [a, b] of s.path) r = (r[a].c as any)[b];
    txt = r.slice(Math.min(s.from, s.to), Math.max(s.from, s.to)).map((x: any) => x.t + ':' + (x.x ?? '·')).join(' ');
  }
  console.log(i, s ? JSON.stringify(s.path) + ' ' + s.from + '-' + s.to : 'none', '|', txt);
}
void 0;
