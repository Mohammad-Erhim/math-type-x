/** Drawing of layout items as SVG markup (shared by the editor, the icons and the image services). */
import { Item } from './layout';
import { pickVariant, raw, tokenInfo } from './metrics';
import { zulfiSymbol } from './zulfi';
import { K } from './layout';
import { ARABIC_SCRIPT } from './arfonts';

/** the faces bundled with the editor and the image services (STIX Two Math, Liberation Sans, MTX Arabic): the editor
 * canvas, the icons and the PNG / SVG / PDF exports all draw with these, so they come out the same everywhere */
export const FONT = "'STIX Two Math','MTX Arabic','Cambria Math',serif";
export const MATH_FONT = FONT;
export const KIND_FONT: Record<string, string> = {
  math: MATH_FONT,
  script: FONT,
  fraktur: FONT,
  double: FONT,
  mathrtl: FONT,
};
/** family of letters and digits (the layout uses Arial advance widths; Liberation Sans has the same ones) */
export const SANS = "'Liberation Sans','MTX Arabic',Arial,Helvetica,sans-serif";
export const SLOT_COLOR = '#006400';
/** placeholders of script-sized slots are drawn fainter (measured on the reference) */
export const SMALL_SLOT_COLOR = '#6aa46a';

const r = (n: number) => Math.round(n * 100) / 100;
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const NAMES: Record<string, string> = { '(': 'parenleft', ')': 'parenright', '[': 'bracketleft', ']': 'bracketright', '{': 'braceleft', '}': 'braceright' };

function fenceSvg(it: Extract<Item, { k: 'f' }>, fg: string): string {
  const color = it.color ?? fg;
  const top = it.y - it.a;
  const bot = it.y + it.d;
  const h = bot - top;
  // angle brackets: two diagonal strokes, 6 px wide (the reference draws them as a pair of SVG lines)
  if (it.ch === '\u27e8' || it.ch === '\u27e9' || it.ch === '\u2329' || it.ch === '\u232a' || it.ch === '<' || it.ch === '>') {
    const open = it.ch === '\u27e8' || it.ch === '\u2329' || it.ch === '<';
    const x0 = it.x + (open ? 2 : 3);
    const xa = open ? x0 + 6 : x0;
    const xb = open ? x0 : x0 + 6;
    const t = top + 2;
    const b = bot - 2;
    const m = Math.round((t + b) / 2);
    return `<path d="M${r(xa)} ${r(t)} L${r(xb)} ${r(m)} L${r(xa)} ${r(b)}" fill="none" stroke="${color}" stroke-width="1"/>`;
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
    // bars are crisp one pixel lines on the pixel grid
    case '|': {
      const bw = Math.max(1, Math.round(sw));
      return `<rect x="${Math.round(cx - bw / 2)}" y="${Math.round(top)}" width="${bw}" height="${Math.max(1, Math.round(h))}" fill="${color}"/>`;
    }
    case '||': {
      const bw = Math.max(1, Math.round(sw));
      const x0 = Math.round(cx - bw * 1.5);
      return `<rect x="${x0}" y="${Math.round(top)}" width="${bw}" height="${Math.max(1, Math.round(h))}" fill="${color}"/><rect x="${x0 + 2 * bw}" y="${Math.round(top)}" width="${bw}" height="${Math.max(1, Math.round(h))}" fill="${color}"/>`;
    }
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

type End = 'none' | 'head' | 'bar' | 'hook' | 'harpUp' | 'harpDown' | 'chevron';
interface Arrow {
  /** shafts: one line, two lines close together (double arrows) or two arrows one above the other */
  kind: 'single' | 'double' | 'pair';
  /** the ends of the (upper) line */
  l: End;
  r: End;
  /** the ends of the lower line of a pair */
  l2?: End;
  r2?: End;
}
const ARROWS: Record<number, Arrow> = {
  0x2190: { kind: 'single', l: 'head', r: 'none' },
  0x2192: { kind: 'single', l: 'none', r: 'head' },
  0x2194: { kind: 'single', l: 'head', r: 'head' },
  0x21a4: { kind: 'single', l: 'head', r: 'bar' },
  0x21a6: { kind: 'single', l: 'bar', r: 'head' },
  0x21a9: { kind: 'single', l: 'head', r: 'hook' },
  0x21aa: { kind: 'single', l: 'hook', r: 'head' },
  0x21bc: { kind: 'single', l: 'harpUp', r: 'none' },
  0x21c0: { kind: 'single', l: 'none', r: 'harpUp' },
  0x21c4: { kind: 'pair', l: 'none', r: 'head', l2: 'head', r2: 'none' },
  0x21c6: { kind: 'pair', l: 'head', r: 'none', l2: 'none', r2: 'head' },
  0x21cb: { kind: 'pair', l: 'harpUp', r: 'none', l2: 'none', r2: 'harpDown' },
  0x21cc: { kind: 'pair', l: 'none', r: 'harpUp', l2: 'harpDown', r2: 'none' },
  0x21d0: { kind: 'double', l: 'chevron', r: 'none' },
  0x21d2: { kind: 'double', l: 'none', r: 'chevron' },
  0x21d4: { kind: 'double', l: 'chevron', r: 'chevron' },
  0x27f5: { kind: 'single', l: 'head', r: 'none' },
  0x27f6: { kind: 'single', l: 'none', r: 'head' },
  0x27f7: { kind: 'single', l: 'head', r: 'head' },
  0x27f8: { kind: 'double', l: 'chevron', r: 'none' },
  0x27f9: { kind: 'double', l: 'none', r: 'chevron' },
  0x27fa: { kind: 'double', l: 'chevron', r: 'chevron' },
};

/**
 * Stretched arrows are drawn on the pixel grid: one pixel shafts, small solid heads, bars, hooks and half heads
 * (the reference composes them from pieces of a symbol font; a stretched font glyph would have a stretched head).
 */
function arrowSvg(it: Extract<Item, { k: 'h' }>, color: string): string {
  const ch = it.arrow!.ch;
  const spec = ARROWS[ch.codePointAt(0)!];
  if (!spec) {
    // other arrows: the glyph stretched to the length
    const gw = 12;
    return `<text transform="translate(${r(it.x)} ${r(it.y + 14)}) scale(${r(it.w / gw)} 1)" font-size="16" font-family="${FONT}" fill="${color}">${esc(ch)}</text>`;
  }
  // the reference's pieces leave 2 px at the start and 3 px at the end of the stretched length (measured on its editor)
  const L = Math.round(it.x) + 2;
  const R = Math.max(L + 4, Math.round(it.x + it.w) - 3);
  const A = Math.round(it.y + 10.3); // row of the axis
  let fillD = '';
  let strokeD = '';
  let rects = '';
  let shade = '';
  const row = (top: number, x0: number, x1: number) => (rects += `M${x0} ${top}H${x1}V${top + 1}H${x0}Z`);
  // one line from L to R with its two ends; `c` is the row centre (y) of the line, `hh` the half height of a head
  const line = (c: number, l: End, rr: End, hh: number) => {
    let x0 = L;
    let x1 = R;
    const end = (e: End, x: number, d: number) => {
      // d: +1 when the end is the right end (the arrow points to +x), -1 for the left end
      const inner = (n: number) => x - d * n;
      switch (e) {
        case 'head':
          fillD += `M${x} ${c}L${inner(6)} ${c - hh - 0.5}L${inner(4.2)} ${c}L${inner(6)} ${c + hh + 0.5}Z`;
          return;
        case 'harpUp':
          fillD += `M${x} ${c}L${inner(5)} ${c - hh - 0.5}L${inner(3.5)} ${c}Z`;
          return;
        case 'harpDown':
          fillD += `M${x} ${c}L${inner(5)} ${c + hh + 0.5}L${inner(3.5)} ${c}Z`;
          return;
        case 'bar':
          rects += `M${x - (d > 0 ? 1 : 0)} ${c - 3.5}h1v7h-1Z`;
          return;
        case 'hook':
          strokeD += `M${inner(0.5)} ${c}V${c - 3}`;
          return;
        case 'chevron':
          strokeD += `M${inner(4)} ${c - 3.5}L${x - d * 0.5} ${c}L${inner(4)} ${c + 3.5}`;
          return;
      }
    };
    end(l, L, -1);
    end(rr, R, 1);
    row(Math.round(c - 0.5), x0, x1);
    // the shaft of the reference's pieces is a little heavier than one pixel: a faint row below it
    const r0 = Math.round(c - 0.5) + 1;
    shade += `M${x0 + 1} ${r0}H${x1 - 1}V${r0 + 1}H${x0 + 1}Z`;
  };
  if (spec.kind === 'single') line(A + 0.5, spec.l, spec.r, 3);
  else if (spec.kind === 'double') {
    // two shafts one pixel apart; the chevron heads sit on both
    const c = A + 0.5;
    const trim = (e: End, x: number, d: number) => (e === 'chevron' ? x - d * 1 : x);
    const x0 = trim(spec.l, L, -1);
    const x1 = trim(spec.r, R, 1);
    row(A - 1, x0, x1);
    row(A + 1, x0, x1);
    // the reference's double shaft is filled with a lighter grey between its two lines
    shade += `M${x0} ${A}H${x1}V${A + 1}H${x0}Z`;
    const heads = (e: End, x: number, d: number) => {
      if (e === 'chevron') strokeD += `M${x - d * 4.5} ${c - 4}L${x - d * 0.5} ${c}L${x - d * 4.5} ${c + 4}`;
    };
    heads(spec.l, L, -1);
    heads(spec.r, R, 1);
  } else {
    line(A - 2 + 0.5, spec.l, spec.r, 2.5);
    line(A + 3 + 0.5, spec.l2!, spec.r2!, 2.5);
  }
  return (
    (shade ? `<path d="${shade}" fill="${color}" fill-opacity=".4"/>` : '') +
    (rects ? `<path d="${rects}" fill="${color}"/>` : '') +
    (fillD ? `<path d="${fillD}" fill="${color}"/>` : '') +
    (strokeD ? `<path d="${strokeD}" fill="none" stroke="${color}" stroke-width="1" stroke-linejoin="miter"/>` : '')
  );
}

/** stretched braces, parentheses and brackets over / under a run */
function horizontalSvg(it: Extract<Item, { k: 'h' }>, color: string): string {
  if (it.shape === 'arrow' && it.arrow) {
    return arrowSvg(it, color);
  }
  const x0 = it.x;
  const x1 = it.x + it.w;
  const yEnd = it.top ? it.y + 10 : it.y + 4;
  const mid = (x0 + x1) / 2;
  const dir = it.top ? -1 : 1;
  let d = '';
  if (it.shape === 'brace') {
    d = `M${r(x0)} ${r(yEnd)} Q${r(x0)} ${r(yEnd + dir * 3)} ${r(x0 + 4)} ${r(yEnd + dir * 3)} L${r(mid - 4)} ${r(yEnd + dir * 3)} Q${r(mid)} ${r(yEnd + dir * 3)} ${r(mid)} ${r(yEnd + dir * 6)} Q${r(mid)} ${r(yEnd + dir * 3)} ${r(mid + 4)} ${r(yEnd + dir * 3)} L${r(x1 - 4)} ${r(yEnd + dir * 3)} Q${r(x1)} ${r(yEnd + dir * 3)} ${r(x1)} ${r(yEnd)}`;
  } else if (it.shape === 'paren') {
    d = `M${r(x0)} ${r(yEnd)} Q${r(x0)} ${r(yEnd + dir * 4)} ${r(x0 + 4)} ${r(yEnd + dir * 4)} L${r(x1 - 4)} ${r(yEnd + dir * 4)} Q${r(x1)} ${r(yEnd + dir * 4)} ${r(x1)} ${r(yEnd)}`;
  } else {
    d = `M${r(x0)} ${r(yEnd)} L${r(x0)} ${r(yEnd + dir * 4)} L${r(x1)} ${r(yEnd + dir * 4)} L${r(x1)} ${r(yEnd)}`;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1"/>`;
}

/** `ui`: editor-only marks too (stack frames, empty cells); `slots`: the boxes of empty slots (editor and toolbar icons) –
 * exported images (PNG, SVG, PDF, EPS) draw neither; `arabic`: CSS family of the chosen bundled Arabic face */
export function itemsToSvg(items: Item[], opts: { slot?: string; fg?: string; sans?: string; ui?: boolean; slots?: boolean; arabic?: string } = {}): string {
  const fg = opts.fg ?? '#000';
  let o = '';
  for (const it of items) {
    // editor-only marks (stack frames, empty cells) are not part of exported images
    if ((it.k === 'r' || it.k === 'p') && it.ui && !opts.ui) continue;
    switch (it.k) {
      case 'g': {
        const fill = it.color ?? fg;
        let fam = it.font === 'sans' ? opts.sans ?? SANS : KIND_FONT[it.font] ?? FONT;
        // the chosen Arabic face first: it holds the Arabic blocks only, Latin glyphs fall through to the next family
        if (opts.arabic && ARABIC_SCRIPT.test(it.text)) fam = `'${opts.arabic}',${fam}`;
        // the reference sets text in HTML boxes: its baseline sits on a whole pixel, one above the layout's
        // (measured on 16 px letters and digits: box top + 13; the smaller script sizes line up with the layout
        // baseline, so do the operator glyphs of its symbol font, except the 24 px summation sign)
        const asc = it.font === 'sans' ? K.asc * it.size : K.asc * it.size + 0.125 * it.size;
        const up = it.size >= 15.5 && (it.font === 'sans' || it.size === 24);
        const base = Math.round(it.y - asc) + Math.round(asc) - (up ? 1 : 0);
        // the mirrored symbols of right-to-left formulas: the regular glyph flipped around the middle of its advance
        const flipGlyph = it.flip && it.w !== undefined;
        const tx = flipGlyph ? ` transform="translate(${r(2 * it.x + it.w!)} 0) scale(-1 1)"` : '';
        // Arabic mathematical symbols are shapes, not text: each one a path at its advance. The run is laid out in its
        // reading direction: letters of Arabic script read from the right, so the first character is the rightmost.
        if (/[\ue100-\uefff]/.test(it.text) && [...it.text].some((c) => zulfiSymbol(c.codePointAt(0) ?? 0))) {
          const k = it.size / 1000;
          const parts: { text?: string; sym?: number; w: number }[] = [];
          let pending = '';
          const flush = () => {
            if (pending) parts.push({ text: pending, w: tokenInfo('mi', '', pending, it.size).w });
            pending = '';
          };
          for (const ch of it.text) {
            const zs = zulfiSymbol(ch.codePointAt(0) ?? 0);
            if (zs) {
              flush();
              parts.push({ sym: ch.codePointAt(0), w: zs.a * k });
            } else pending += ch;
          }
          flush();
          const total = parts.reduce((n, q) => n + q.w, 0);
          const rtlRun = ARABIC_SCRIPT.test(it.text);
          let x = rtlRun ? it.x + total : it.x;
          for (const q of parts) {
            if (rtlRun) x -= q.w;
            if (q.sym !== undefined) {
              const zs = zulfiSymbol(q.sym)!;
              o += `<path transform="translate(${r(x)} ${r(base)}) scale(${r(k * 1000) / 1000})" d="${zs.d}" fill="${fill}"/>`;
            } else {
              o += `<text x="${r(x)}" y="${r(base)}" font-size="${r(it.size)}" font-family="${fam}" fill="${fill}"${it.italic ? ' font-style="italic"' : ''}${it.bold ? ' font-weight="bold"' : ''} xml:space="preserve">${esc(q.text!)}</text>`;
            }
            if (!rtlRun) x += q.w;
          }
          break;
        }
        o += `<text x="${r(it.x)}" y="${r(base)}"${tx} font-size="${r(it.size)}" font-family="${fam}" fill="${fill}"${it.italic ? ' font-style="italic"' : ''}${it.bold ? ' font-weight="bold"' : ''} xml:space="preserve">${esc(it.text)}</text>`;
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
        o += `<path transform="translate(${r(it.x)} ${r(it.y)})${it.flip ? ' scale(-1 1)' : ''}" d="${it.d}" fill="${it.fill ? it.color ?? fg : 'none'}" stroke="${it.color ?? fg}" stroke-width="${it.sw ?? 1}"${it.dash ? ` stroke-dasharray="${it.dash}"` : ''}/>`;
        break;
      case 'h':
        o += horizontalSvg(it, it.color ?? fg);
        break;
      case 's':
        if (!opts.ui && !opts.slots) break;
        o += `<rect x="${r(it.x) + 0.5}" y="${r(it.y) + 0.5}" width="${r(it.w) - 1}" height="${r(it.h) - 1}" fill="none" stroke="${it.small ? SMALL_SLOT_COLOR : opts.slot ?? SLOT_COLOR}" stroke-width="1"/>`;
        break;
    }
  }
  return o;
}
