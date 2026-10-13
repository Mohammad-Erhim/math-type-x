// Extract glyph advances/extents and delimiter variants from STIX Two Math (SIL OFL) into src/data/metrics.json
import opentype from 'opentype.js';
import fs from 'node:fs';
const buf = fs.readFileSync('node_modules/@fontsource/stix-two-math/files/stix-two-math-latin-400-normal.woff');
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const upm = font.unitsPerEm;
const cps = {};
const cmap = font.tables.cmap.glyphIndexMap;
for (const [cp, gi] of Object.entries(cmap)) {
  const g = font.glyphs.get(gi);
  const bb = g.getBoundingBox();
  cps[cp] = [Math.round(g.advanceWidth), Math.round(bb.y2), Math.round(bb.y1), Math.round(bb.x1), Math.round(bb.x2)];
}
// delimiter variants by glyph name
const variants = {};
for (let i = 0; i < font.numGlyphs; i++) {
  const g = font.glyphs.get(i);
  if (/^(parenleft|parenright|bracketleft|bracketright|braceleft|braceright)(\.s\d+)?$/.test(g.name)) {
    const bb = g.getBoundingBox();
    variants[g.name] = { adv: Math.round(g.advanceWidth), y2: Math.round(bb.y2), y1: Math.round(bb.y1), x1: Math.round(bb.x1), x2: Math.round(bb.x2), d: g.getPath(0, 0, upm).toPathData(2) };
  }
}
const out = { upm, ascender: font.ascender, descender: font.descender, cps, variants };
fs.writeFileSync('src/data/metrics.json', JSON.stringify(out));
console.log(Object.keys(cps).length, 'codepoints', Object.keys(variants).length, 'variants', fs.statSync('src/data/metrics.json').size, 'bytes');
