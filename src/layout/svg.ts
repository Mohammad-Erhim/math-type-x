/** Drawing of layout items as SVG markup (shared by the editor, the icons and the image services). */
import { Item } from './layout';
import { pickVariant, raw } from './metrics';
import { K } from './layout';

export const FONT = "'STIX Two Math','Cambria Math','STIXGeneral',serif";
/** the reference editor's own symbol fonts (loaded when the integrator provides `fontsUrl`; STIX is the fallback) */
export const MATH_FONT = `'Conv_math1',${FONT}`;
export const KIND_FONT: Record<string, string> = {
  math: MATH_FONT,
  script: `'Conv_script',${FONT}`,
  fraktur: `'Conv_fraktur',${FONT}`,
  double: `'Conv_doubleStruck','Conv_math1',${FONT}`,
};
/** family of letters and digits (the layout uses Arial advance widths) */
export const SANS = "Arial,'Liberation Sans',Helvetica,sans-serif";
export const SLOT_COLOR = '#006400';

const r = (n: number) => Math.round(n * 100) / 100;
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** set by the editor once the reference symbol fonts are available: delimiters are then composed from their pieces */
let vendorFonts = false;
export function setVendorFonts(on: boolean): void {
  vendorFonts = on;
}

/** delimiter pieces of the reference (measured on the reference page, SRS Appendix H) */
function vendorFence(it: Extract<Item, { k: 'f' }>, color: string): string | null {
  const ch = it.ch;
  if (!'()[]{}|'.includes(ch) || ch.length !== 1) return null;
  const top = it.y - (it.a + 1);
  const H = it.y + it.d - top;
  const open = it.close === undefined ? '([{'.includes(ch) : !it.close;
  const fs = 16 * (it.size / 16);
  const t = (family: string, text: string, x: number, boxTop: number, asc: number, size = fs) =>
    `<text x="${r(x)}" y="${r(boxTop + asc * (size / 16))}" font-size="${r(size)}" font-family="'${family}'" fill="${color}">${text}</text>`;
  const BR = (c: string, y: number, x = open ? it.x : it.x + 1) => t('Conv_brackets', c, x, y, 14);
  const SM = (c: string, y: number, x = open ? it.x : it.x + 1) => t('Conv_brack_sm', c, x, y, 5.3);
  const cp = (code: number) => String.fromCodePoint(code);
  let out = '';
  if (ch === '(' || ch === ')') {
    const sizes: [number, string, number][] = [[20, 'Conv_roundBrackets1854', 14.48], [24, 'Conv_roundBrackets2254', 17.6], [28, 'Conv_roundBrackets2654', 20.7], [32, 'Conv_roundBrackets3054', 23.9], [35, 'Conv_roundBrackets3454', 27.0]];
    const hit = sizes.find((q) => H <= q[0] + 0.5);
    if (hit) {
      const baseTop = hit[0] === 20 ? it.y - 14 : top + 3;
      return t(hit[1], ch, it.x, baseTop, hit[2]);
    }
    const n = Math.max(0, Math.floor((H - 28) / 5));
    const Hf = 28 + 5 * n;
    let y = Math.round(top + (H - Hf) / 2 + 0.01) + (it.dy ?? 0);
    out += BR(cp(open ? 0x239b : 0x239e), y, it.x);
    y += 14;
    for (let k = 0; k < n; k++, y += 5) out += SM(cp(open ? 0x239c : 0x239f), y, it.x);
    out += BR(cp(open ? 0x239d : 0x23a0), y, it.x);
    return out;
  }
  if (ch === '[' || ch === ']') {
    if (H < 15) return null;
    if (H < 44) {
      const n = Math.max(1, Math.floor((H - 10) / 5));
      const Hf = 10 + 5 * n;
      let y = Math.round(top + (H - Hf) / 2 + 0.01) + (it.dy ?? 0);
      out += SM(cp(open ? 0x23a1 : 0x23a4), y);
      y += 5;
      for (let k = 0; k < n; k++, y += 5) out += SM(cp(open ? 0x23a2 : 0x23a5), y);
      out += SM(cp(open ? 0x23a3 : 0x23a6), y);
      return out;
    }
    const n = Math.max(1, Math.floor((H - 28) / 14));
    const Hf = 28 + 14 * n;
    let y = Math.round(top + (H - Hf) / 2 + 0.01) + (it.dy ?? 0);
    out += BR(cp(open ? 0x23a1 : 0x23a4), y);
    y += 14;
    for (let k = 0; k < n; k++, y += 14) out += BR(cp(open ? 0x23a2 : 0x23a5), y);
    out += BR(cp(open ? 0x23a3 : 0x23a6), y);
    return out;
  }
  if (ch === '{' || ch === '}') {
    if (H < 27) return null;
    const k = Math.max(1, Math.floor((H - 15) / 10));
    const Hf = 5 * (2 * k + 3);
    let y = Math.round(top + (H - Hf) / 2 + 0.01);
    const x = it.x + (open ? 2 : 1);
    out += SM(cp(open ? 0x23a7 : 0x23ab), y, x);
    y += 5;
    for (let i = 0; i < k; i++, y += 5) out += SM(cp(open ? 0x23aa : 0x23ae), y, x);
    out += SM(cp(open ? 0x23a8 : 0x23ac), y, x);
    y += 5;
    for (let i = 0; i < k; i++, y += 5) out += SM(cp(open ? 0x23aa : 0x23ae), y, x);
    out += SM(cp(open ? 0x23a9 : 0x23ad), y, x);
    return out;
  }
  if (ch === '|') {
    if (H < 8) return null;
    const px = open ? it.x : it.x + 1;
    const piece = (y: number, small: boolean) => t(small ? 'Conv_brack_sm' : 'Conv_brackets', cp(0xf402), px, y, small ? 5.3 : 14);
    if (H < 44) {
      const n = Math.max(1, Math.floor(H / 5));
      let y = Math.round(top + (H - 5 * n) / 2 + 0.01);
      for (let k = 0; k < n; k++, y += 5) out += piece(y, true);
    } else {
      const n = Math.max(3, Math.floor(H / 14));
      let y = Math.round(top + (H - 14 * n) / 2 + 0.01);
      for (let k = 0; k < n; k++, y += 14) out += piece(y, false);
    }
    return out;
  }
  return null;
}

const NAMES: Record<string, string> = { '(': 'parenleft', ')': 'parenright', '[': 'bracketleft', ']': 'bracketright', '{': 'braceleft', '}': 'braceright' };

function fenceSvg(it: Extract<Item, { k: 'f' }>, fg: string): string {
  const color = it.color ?? fg;
  const top = it.y - it.a;
  const bot = it.y + it.d;
  const h = bot - top;
  if (vendorFonts) {
    const vf = vendorFence(it, color);
    if (vf) return vf;
  }
  const n = NAMES[it.ch];
  if (n) {
    const v = pickVariant(n, h / it.size);
    if (v) {
      const k = it.size / raw.upm;
      // vertical scale so that the glyph spans exactly the box; keep stroke thickness (x scale = k)
      const gh = (v.y2 - v.y1) * k;
      const sy = gh > 0 ? h / gh : 1;
      const cy = ((v.y1 + v.y2) / 2) * k; // glyph centre (y up)
      // path is y-up negative in font units: flip handled by scale(k, k*sy) with path already y-down
      const midBox = top + h / 2;
      const ty = midBox + cy * sy;
      return `<path transform="translate(${r(it.x)} ${r(ty)}) scale(${r(k * 1000) / 1000} ${r(k * sy * 1000) / 1000})" d="${v.d}" fill="${color}"/>`;
    }
  }
  const w = it.w;
  const cx = it.x + w / 2;
  const sw = Math.max(1, it.size / 16);
  switch (it.ch) {
    case '|':
      return `<rect x="${r(cx - sw / 2)}" y="${r(top)}" width="${r(sw)}" height="${r(h)}" fill="${color}"/>`;
    case '||':
      return `<rect x="${r(cx - sw * 1.5)}" y="${r(top)}" width="${r(sw)}" height="${r(h)}" fill="${color}"/><rect x="${r(cx + sw * 0.5)}" y="${r(top)}" width="${r(sw)}" height="${r(h)}" fill="${color}"/>`;
    case '⌈':
    case '⌊':
    case '⌉':
    case '⌋': {
      const left = it.ch === '⌈' || it.ch === '⌊';
      const up = it.ch === '⌈' || it.ch === '⌉';
      const x0 = left ? it.x + w * 0.35 : it.x + w * 0.65;
      const x1 = left ? it.x + w * 0.85 : it.x + w * 0.15;
      const yv = up ? top : bot;
      return `<path d="M${r(x1)} ${r(yv)} L${r(x0)} ${r(yv)} L${r(x0)} ${r(up ? bot : top)}" fill="none" stroke="${color}" stroke-width="${r(sw)}"/>`;
    }
    case '⟦':
    case '⟧': {
      const left = it.ch === '⟦';
      const xa = left ? it.x + w * 0.35 : it.x + w * 0.65;
      const xb = left ? it.x + w * 0.85 : it.x + w * 0.15;
      const xc = left ? it.x + w * 0.5 : it.x + w * 0.5;
      return `<path d="M${r(xb)} ${r(top)} L${r(xa)} ${r(top)} L${r(xa)} ${r(bot)} L${r(xb)} ${r(bot)} M${r(xc)} ${r(top)} L${r(xc)} ${r(bot)}" fill="none" stroke="${color}" stroke-width="${r(sw)}"/>`;
    }
    case '<':
    case '⟨':
    case '>':
    case '⟩': {
      const left = it.ch === '<' || it.ch === '⟨';
      const xa = left ? it.x + w * 0.8 : it.x + w * 0.2;
      const xb = left ? it.x + w * 0.2 : it.x + w * 0.8;
      return `<path d="M${r(xa)} ${r(top)} L${r(xb)} ${r(top + h / 2)} L${r(xa)} ${r(bot)}" fill="none" stroke="${color}" stroke-width="${r(sw)}"/>`;
    }
  }
  return `<text x="${r(it.x)}" y="${r(it.y)}" font-size="${r(it.size)}" font-family="${FONT}" fill="${color}">${esc(it.ch)}</text>`;
}

export function itemsToSvg(items: Item[], opts: { slot?: string; fg?: string; sans?: string; ui?: boolean } = {}): string {
  const fg = opts.fg ?? '#000';
  let o = '';
  for (const it of items) {
    // editor-only marks (stack frames, empty cells) are not part of exported images
    if ((it.k === 'r' || it.k === 'p') && it.ui && !opts.ui) continue;
    switch (it.k) {
      case 'g': {
        const fill = it.color ?? fg;
        const fam = it.font === 'sans' ? opts.sans ?? SANS : KIND_FONT[it.font] ?? FONT;
        // the reference sets text in HTML boxes: its baseline sits on a whole pixel, one above the layout's
        // (measured on 16 px letters and digits: box top + 13; the smaller script sizes line up with the layout
        // baseline, so do the operator glyphs of its symbol font, except the 24 px summation sign)
        const asc = it.font === 'sans' ? K.asc * it.size : K.asc * it.size + 0.125 * it.size;
        const up = it.size >= 15.5 && (it.font === 'sans' || it.size === 24);
        const base = Math.round(it.y - asc) + Math.round(asc) - (up ? 1 : 0);
        o += `<text x="${r(it.x)}" y="${r(base)}" font-size="${r(it.size)}" font-family="${fam}" fill="${fill}"${it.italic ? ' font-style="italic"' : ''}${it.bold ? ' font-weight="bold"' : ''} xml:space="preserve">${esc(it.text)}</text>`;
        break;
      }
      case 'f':
        o += fenceSvg(it, fg);
        break;
      case 'r':
        // rules and bars are crisp one pixel lines on the pixel grid
        o += `<rect x="${Math.round(it.x)}" y="${Math.round(it.y)}" width="${Math.max(1, Math.round(it.w))}" height="${Math.max(1, Math.round(it.h))}" fill="${it.color ?? fg}"/>`;
        break;
      case 'p':
        o += `<path transform="translate(${r(it.x)} ${r(it.y)})" d="${it.d}" fill="${it.fill ? it.color ?? fg : 'none'}" stroke="${it.color ?? fg}" stroke-width="${it.sw ?? 1}"/>`;
        break;
      case 's':
        o += `<rect x="${r(it.x) + 0.5}" y="${r(it.y) + 0.5}" width="${r(it.w) - 1}" height="${r(it.h) - 1}" fill="none" stroke="${opts.slot ?? SLOT_COLOR}" stroke-width="1"/>`;
        break;
    }
  }
  return o;
}
