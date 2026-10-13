/**
 * Glyph metrics. Letters and digits are set in the platform sans-serif with Arial advance widths
 * (as in the reference); symbols come from a measured table (src/data/ref-metrics.json) and fall back to
 * the advances of STIX Two Math.
 */
import stix from '../data/metrics.json';
import ref from '../data/ref-metrics.json';
import arWidths from '../data/ar-widths.json';

export interface Variant { adv: number; y1: number; y2: number; x1: number; x2: number; d: string }
export const raw = stix as unknown as { upm: number; cps: Record<string, number[]>; variants: Record<string, Variant> };
const REF = ref as unknown as Record<string, [number, number, number, string, string, string, number, string]>;

/** Arial advance widths (1/1000 em) for printable ASCII */
const ARIAL: Record<string, number> = {
  ' ': 278, '!': 278, '"': 355, '#': 556, $: 556, '%': 889, '&': 667, "'": 191, '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556, '8': 556, '9': 556, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 278, '\\': 278, ']': 278, '^': 469, _: 556, '`': 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 500, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  '{': 334, '|': 260, '}': 334, '~': 584,
};
ARIAL.q = 556;

export type FontKind = 'sans' | 'math' | 'fraktur' | 'script' | 'double' | 'mathrtl';

export interface TokInfo {
  /** advance at `size` px (fractional) */
  w: number;
  lpad: number;
  rpad: number;
  font: FontKind;
}

const BIG = new Set([0x2211, 0x220f, 0x2210, 0x22c0, 0x22c1, 0x22c2, 0x22c3, 0x2a00, 0x2a01, 0x2a02, 0x2a04, 0x2a06, 0x2297, 0x2295, 0x2294]);
const INT = new Set([0x222b, 0x222c, 0x222d, 0x222e, 0x222f, 0x2230, 0x2231, 0x2232, 0x2233]);

const KIND: Record<string, FontKind> = { '': 'sans', wrs_italic: 'sans', wrs_mathChar: 'math', 'wrs_mathChar wrs_italic': 'math', wrs_frakturChar: 'fraktur', wrs_scriptChar: 'script', wrs_doubleStruckChar: 'double', wrs_roundBrackets1854Char: 'math' };

const AR_WIDTHS = arWidths as Record<string, number>;
const ADV_CACHE = new Map<string, number | null>();
let measureCtx: CanvasRenderingContext2D | null | undefined;

/** advance (em) of a letter of a script without a metrics table: measured by the browser in the font the text is drawn in
 * (like the reference, which lays out what the browser measures), tables of the Arabic blocks without a canvas */
function measuredAdv(ch: string): number | null {
  const hit = ADV_CACHE.get(ch);
  if (hit !== undefined) return hit;
  let w: number | null = null;
  if (measureCtx === undefined) {
    try {
      measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
      if (measureCtx) measureCtx.font = "100px Arial,'Liberation Sans',Helvetica,sans-serif";
    } catch {
      measureCtx = null;
    }
  }
  if (measureCtx) {
    const m = measureCtx.measureText(ch).width;
    if (m > 0) w = m / 100;
  }
  if (w === null) w = AR_WIDTHS[(ch.codePointAt(0) ?? 0).toString(16)] ?? null;
  ADV_CACHE.set(ch, w);
  return w;
}

function stixAdv(ch: string): number {
  const m = raw.cps[ch.codePointAt(0)!];
  return m ? m[0] / raw.upm : 0.6;
}

export function isBigOp(cp: number): boolean {
  return BIG.has(cp) || INT.has(cp);
}
export function isIntegral(cp: number): boolean {
  return INT.has(cp);
}

/** metrics of a token (one character group) at `size` px */
export function tokenInfo(tag: string, mathvariant: string, text: string, size: number): TokInfo {
  const key = `${tag}|${mathvariant ? `mathvariant="${mathvariant}"` : ''}|${text}`;
  const hit = REF[key] ?? REF[`${tag}||${text}`];
  if (hit) {
    const [w, lpad, rpad, cls, fs] = hit;
    const k = size / parseFloat(fs);
    const font = KIND[cls.replace(/\s*wrs_(notItalic|notBold)/g, '').trim()] ?? 'math';
    return { w: w * k, lpad: lpad * (size / 16), rpad: rpad * (size / 16), font };
  }
  // composed text (merged runs): sum of the characters
  const chars = Array.from(text);
  if (chars.length > 1) {
    let w = 0;
    let font: FontKind = 'sans';
    let lp = 0;
    let rp = 0;
    chars.forEach((c, i) => {
      const t = tokenInfo(tag, mathvariant, c, size);
      w += t.w;
      font = t.font;
      if (i === 0) lp = t.lpad;
      if (i === chars.length - 1) rp = t.rpad;
    });
    return { w, lpad: lp, rpad: rp, font };
  }
  const ch = chars[0] ?? '';
  const cp = ch.codePointAt(0) ?? 0;
  if (ARIAL[ch] !== undefined && cp < 127) {
    const isOp = tag === 'mo';
    return { w: (ARIAL[ch] / 1000) * size, lpad: isOp ? 1 : 0, rpad: isOp ? 1 : 0, font: 'sans' };
  }
  // letters of other scripts: sans-serif approximation
  if (/\p{L}|\p{M}|\p{Nd}/u.test(ch) && tag !== 'mo') return { w: (measuredAdv(ch) ?? 0.58) * size, lpad: 0, rpad: 0, font: 'sans' };
  const mv = mathvariant;
  const font: FontKind = mv === 'fraktur' ? 'fraktur' : mv === 'script' ? 'script' : mv === 'double-struck' ? 'double' : 'math';
  return { w: stixAdv(ch) * size, lpad: tag === 'mo' ? 2 * (size / 16) : 0, rpad: tag === 'mo' ? 1 * (size / 16) : 0, font };
}

/** pieces of the stretchy delimiters (STIX Two Math size variants) */
export function pickVariant(base: string, heightEm: number): Variant | null {
  const list = [raw.variants[base], ...Array.from({ length: 12 }, (_, i) => raw.variants[`${base}.s${i + 1}`])].filter(Boolean) as Variant[];
  if (!list.length) return null;
  for (const v of list) if ((v.y2 - v.y1) / raw.upm >= heightEm - 0.02) return v;
  return list[list.length - 1];
}
