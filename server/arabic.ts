/** Shapes Arabic runs with the bundled face, so that the layout of the image services measures what the browser does. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import opentype from 'opentype.js';
import { setRunShaper } from '../src/layout/metrics';
import { sansFontPaths } from './font';

let face: any = null;
function load(): any {
  if (face) return face;
  try {
    const p = sansFontPaths().find((f) => /MtxArabic-Regular/.test(f));
    if (!p) return null;
    const b = readFileSync(p);
    face = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  } catch {
    face = null;
  }
  return face;
}

setRunShaper((text, size) => {
  const f = load();
  if (!f) return null;
  const w = f.getAdvanceWidth(text, size);
  return w > 0 ? w : null;
});
