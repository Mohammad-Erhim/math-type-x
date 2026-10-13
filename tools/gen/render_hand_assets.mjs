// renders the reference handwriting-mode SVG assets at 8x so that they can be re-traced (trace_hand.py)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
const dir = 'evidence/sprites/hand';
for (const f of readdirSync(dir).filter((n) => n.endsWith('.svg'))) {
  const svg = readFileSync(`${dir}/${f}`, 'utf8');
  const r = new Resvg(svg, { fitTo: { mode: 'zoom', value: 8 } }).render();
  writeFileSync(`${dir}/${f.replace('.svg', '_8x.png')}`, r.asPng());
  console.log(f, r.width, r.height);
}
