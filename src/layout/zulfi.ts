/**
 * Arabic mathematical symbols (the symbol tables of the Zulfi Math keyboard maps): every symbol is a vector shape stored
 * in src/data/zulfi.json (tools/gen/zulfi/extract.py) and drawn as a path, so they look the same in the editor and in
 * every export and need no font. In a formula they are private-use characters (U+E100 …), which the drawing code turns
 * into the shapes; `m` tells how they behave in a formula (mo: operator spacing, mi: an identifier).
 */
import data from '../data/zulfi.json';

export interface ZSymbol {
  /** advance, 1/1000 em */
  a: number;
  /** path, 1/1000 em, y down from the baseline */
  d: string;
  /** top / bottom of the ink (1/1000 em, y down from the baseline) */
  t: number;
  b: number;
  /** the keys that produce it on the Arabic keyboard of the tables */
  k: string;
  m: 'mo' | 'mi';
}

const raw = data as unknown as { upm: number; groups: { id: string; en: string; ar: string; items: string[] }[]; symbols: Record<string, ZSymbol> };

const SYMBOLS = new Map<number, ZSymbol>();
for (const [hex, s] of Object.entries(raw.symbols)) SYMBOLS.set(parseInt(hex, 16), s);

export const ZULFI_FIRST = 0xe100;
export const ZULFI_GROUPS = raw.groups.map((g) => ({ id: g.id, en: g.en, ar: g.ar, items: g.items.map((h) => parseInt(h, 16)) }));

export function zulfiSymbol(cp: number): ZSymbol | undefined {
  return cp >= ZULFI_FIRST && cp < 0xf000 ? SYMBOLS.get(cp) : undefined;
}

export const isZulfiChar = (ch: string): boolean => {
  const cp = ch.codePointAt(0) ?? 0;
  return cp >= ZULFI_FIRST && cp < 0xf000 && SYMBOLS.has(cp);
};

/** an inline <svg> of a symbol (palettes, previews) */
export function zulfiSvg(cp: number, size = 28, color = 'currentColor'): string {
  const s = SYMBOLS.get(cp);
  if (!s) return '';
  const top = Math.min(s.t, -760) - 60;
  const bottom = Math.max(s.b, 240) + 60;
  const w = s.a + 160;
  const h = bottom - top;
  const k = size / 1000;
  return `<svg width="${Math.round(w * k)}" height="${Math.round(h * k)}" viewBox="-80 ${top} ${w} ${h}" aria-hidden="true"><path d="${s.d}" fill="${color}"/></svg>`;
}
