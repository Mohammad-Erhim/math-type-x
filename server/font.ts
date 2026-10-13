/** Converts the bundled WOFF1 math font to an sfnt (TTF/OTF) buffer so that resvg can load it. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
/** project root: the module lives in server/ (sources) or in a bundle directory next to it */
const root = [join(here, '..'), join(here, '../..'), process.cwd()].find((r) => existsSync(join(r, 'server/fonts'))) ?? process.cwd();

export function woffToSfnt(woff: Buffer): Buffer {
  if (woff.toString('latin1', 0, 4) !== 'wOFF') throw new Error('not a WOFF1 font');
  const flavor = woff.readUInt32BE(4);
  const n = woff.readUInt16BE(12);
  const entries: { tag: string; data: Buffer; sum: number }[] = [];
  for (let i = 0; i < n; i++) {
    const o = 44 + i * 20;
    const tag = woff.toString('latin1', o, o + 4);
    const off = woff.readUInt32BE(o + 4);
    const clen = woff.readUInt32BE(o + 8);
    const olen = woff.readUInt32BE(o + 12);
    const sum = woff.readUInt32BE(o + 16);
    const raw = woff.subarray(off, off + clen);
    entries.push({ tag, data: clen < olen ? inflateSync(raw) : Buffer.from(raw), sum });
  }
  entries.sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const headerLen = 12 + n * 16;
  let size = headerLen;
  const offsets = entries.map((e) => {
    const o = size;
    size += (e.data.length + 3) & ~3;
    return o;
  });
  const out = Buffer.alloc(size);
  out.writeUInt32BE(flavor, 0);
  out.writeUInt16BE(n, 4);
  let pow = 1;
  let log = 0;
  while (pow * 2 <= n) {
    pow *= 2;
    log++;
  }
  out.writeUInt16BE(pow * 16, 6);
  out.writeUInt16BE(log, 8);
  out.writeUInt16BE(n * 16 - pow * 16, 10);
  entries.forEach((e, i) => {
    const o = 12 + i * 16;
    out.write(e.tag, o, 'latin1');
    out.writeUInt32BE(e.sum, o + 4);
    out.writeUInt32BE(offsets[i], o + 8);
    out.writeUInt32BE(e.data.length, o + 12);
    e.data.copy(out, offsets[i]);
  });
  return out;
}

/** absolute path of a TTF/OTF copy of the font (generated into .cache on first use) */
export function mathFontPath(): string {
  const cache = join(root, '.cache');
  const target = join(cache, 'STIXTwoMath-latin.otf');
  if (!existsSync(target)) {
    const src = join(root, 'node_modules/@fontsource/stix-two-math/files/stix-two-math-latin-400-normal.woff');
    mkdirSync(cache, { recursive: true });
    writeFileSync(target, woffToSfnt(readFileSync(src)));
  }
  return target;
}

/** Liberation Sans (OFL) files bundled for the sans-serif letters and digits */
export function sansFontPaths(): string[] {
  const dir = join(root, 'server/fonts');
  return [
    ...['Regular', 'Italic', 'Bold', 'BoldItalic'].map((n) => join(dir, `LiberationSans-${n}.ttf`)),
    // Arabic letters (the layout's Arabic advance widths are the ones of this face)
    ...['Regular', 'Bold'].map((n) => join(dir, `MtxArabic-${n}.ttf`)),
  ];
}
