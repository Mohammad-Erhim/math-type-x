/** Shapes Arabic runs with HarfBuzz and the bundled faces, so that the layout of the image services measures what the
 * browser does (joined forms, ligatures, kerning and mark positioning of each face). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as hb from 'harfbuzzjs';
import { setRunShaper } from '../src/layout/metrics';
import { ARABIC_FONTS } from '../src/layout/arfonts';
import { fontDir } from './font';

interface Shaper {
  font: hb.Font;
  upm: number;
}
const shapers = new Map<string, Shaper | null>();

function load(family: string): Shaper | null {
  let s = shapers.get(family);
  if (s !== undefined) return s;
  s = null;
  try {
    const file = family === 'Liberation Sans' ? 'LiberationSans-Regular.ttf' : `${ARABIC_FONTS.find((f) => f.family === family)?.stem ?? 'MtxArabic'}-Regular.ttf`;
    const data = readFileSync(join(fontDir(), file));
    const face = new hb.Face(new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer));
    s = { font: new hb.Font(face), upm: face.upem };
  } catch {
    s = null;
  }
  shapers.set(family, s);
  return s;
}

/** characters the Arabic faces do not hold: drawn (and measured) in Liberation Sans, as the browser falls through */
const LATIN = /[\u0021-\u007e\u00a1-\u024f]/;

function advance(s: Shaper, text: string, size: number): number {
  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(s.font, buf);
  let adv = 0;
  for (const p of buf.getGlyphPositions()) adv += p.xAdvance;
  return (adv / s.upm) * size;
}

setRunShaper((text, size, family) => {
  const arabic = load(family);
  if (!arabic) return null;
  let w = 0;
  // consecutive characters of one face are shaped together (joining happens inside a run)
  for (const m of text.matchAll(/[\u0021-\u007e\u00a1-\u024f]+|[^\u0021-\u007e\u00a1-\u024f]+/g)) {
    const latin = LATIN.test(m[0][0]);
    const s = latin ? load('Liberation Sans') ?? arabic : arabic;
    w += advance(s, m[0], size);
  }
  return w > 0 ? w : null;
});
