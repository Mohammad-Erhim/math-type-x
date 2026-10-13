// layout box (width, ascent, descent) of formulas: node .build/box_dump.cjs '<mml>' ...
import { parseMathML } from '../../src/core/mathml';
import { layoutRow } from '../../src/layout/layout';
for (const m of process.argv.slice(2)) {
  const doc = parseMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${m}</math>`) as any;
  const row = doc.row ?? doc;
  const b = layoutRow(row, { size: 16, level: 0, display: true, rtl: false } as any);
  console.log(m.slice(0, 70).padEnd(72), 'w', b.w, 'a', b.a, 'd', b.d);
}
