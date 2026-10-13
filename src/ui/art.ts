/**
 * Hand-drawn vector artwork for non-mathematical toolbar controls (all original drawings, 22 px grid).
 * Each function returns inner SVG markup for a viewBox of the given size.
 */
const GREEN = '#2e9e2e';
const DARK = '#18212f';
const GREY = '#9aa7b0';

import { tracedPaths } from './icons';
import traced from '../data/traced-icons.json';

type Traced = Record<string, { w: number; h: number; layers: { fill: string; d: string }[] }>;
const TR = traced as unknown as Traced;
/** vector re-drawing of a reference bitmap icon (see tools/gen/trace_icons.py) */
function tracedArt(name: string): string {
  const ic = TR[name];
  if (!ic) return '';
  return tracedPaths(ic.layers as any);
}

export type Art = (w: number, h: number, o?: { rtl?: boolean }) => string;

const stroke = (d: string, c = DARK, w = 1.4, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const FONT = "font-family=\"'STIX Two Math','Cambria Math',serif\"";

export const ART: Record<string, Art> = {
  copy: () =>
    `<rect x="5.5" y="3.5" width="9" height="11" rx="1" fill="#fff" stroke="${GREY}"/>` +
    `<rect x="8.5" y="7.5" width="9" height="11" rx="1" fill="#fff" stroke="${GREY}"/>` +
    stroke('M10.5 11h5M10.5 13.5h5M10.5 16h3', GREY, 1),
  cut: () =>
    stroke('M7 3.5l7.5 10M15 3.5l-7.5 10', GREY, 1.4) +
    `<circle cx="7" cy="16.5" r="2.3" fill="none" stroke="${GREY}" stroke-width="1.4"/><circle cx="15" cy="16.5" r="2.3" fill="none" stroke="${GREY}" stroke-width="1.4"/>`,
  paste: () =>
    `<rect x="3.5" y="4.5" width="10" height="13" rx="1.2" fill="#9a8a78" stroke="#6d5f50"/>` +
    `<rect x="5.5" y="2.8" width="6" height="3.4" rx="0.8" fill="#d8d0c4" stroke="#6d5f50"/>` +
    `<rect x="9.5" y="8.5" width="9" height="10" rx="1" fill="#fff" stroke="#556e7b"/>` +
    stroke('M11.5 12h5M11.5 14.5h5M11.5 17h3', '#556e7b', 1),
  undo: () => stroke('M6 8.5h7a4.2 4.2 0 0 1 0 8.4H8', '#425a66', 1.8) + `<path d="M6.2 4.6L3 8.5l3.2 3.9z" fill="#425a66"/>`,
  redo: () => stroke('M16 8.5H9a4.2 4.2 0 0 0 0 8.4h5', GREY, 1.8) + `<path d="M15.8 4.6L19 8.5l-3.2 3.9z" fill="${GREY}"/>`,
  bold: () => `<text x="11" y="16.5" text-anchor="middle" font-size="17" font-weight="700" font-family="'Times New Roman',serif" fill="${DARK}">B</text>`,
  italic: () =>
    `<text x="5" y="16.5" font-size="14" font-style="italic" font-family="'Times New Roman',serif" fill="${DARK}">1</text>` +
    `<text x="11" y="16.5" font-size="14" font-style="italic" font-weight="700" font-family="'Times New Roman',serif" fill="${DARK}">b</text>`,
  color: () =>
    `<text x="3.5" y="15" font-size="15" font-weight="700" font-family="Arial,sans-serif" fill="${DARK}">A</text>` +
    `<rect x="3" y="16.5" width="16" height="3" fill="#e84a3c"/><rect x="3" y="16.5" width="5.3" height="3" fill="#2f6fdb"/><rect x="8.3" y="16.5" width="5.4" height="3" fill="#f2c230"/>` +
    `<path d="M12 4.5l3 3-5.5 5.5-3-3z" fill="#e8a43c"/>`,
  special: () =>
    `<rect x="2.5" y="2.5" width="17" height="17" rx="2" fill="#fff" stroke="#6e86a0" stroke-width="1.4"/>` +
    `<text x="11" y="15.5" text-anchor="middle" font-size="14" ${FONT} fill="#2a5db0">Ω</text>`,
  autoitalic: () =>
    `<text x="4.5" y="16" font-size="14" font-style="italic" font-family="'Times New Roman',serif" fill="${DARK}">1</text>` +
    `<text x="10.5" y="16" font-size="14" font-style="italic" font-family="'Times New Roman',serif" fill="${DARK}">b</text>`,
  regtext: () =>
    `<text x="4" y="15.5" font-size="13" font-family="'Times New Roman',serif" fill="${DARK}">T</text>` +
    stroke('M13.5 5.5v11M11.5 5.5h4M11.5 16.5h4', DARK, 1.2),
  rtl: () =>
    stroke('M3.5 7h15M3.5 11h15M3.5 15h9', DARK, 1.2) + `<path d="M14.5 12.5l3.5 2.5-3.5 2.5z" fill="${DARK}"/>`,
  ligature: () =>
    `<path d="M3 15c2-7 4-8 5.5-8 2 0 1.5 4 4 4 2.5 0 3-5 7.5-5" fill="none" stroke="${DARK}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<circle cx="9" cy="17.5" r="1.1" fill="${DARK}"/><circle cx="13" cy="17.5" r="1.1" fill="${DARK}"/>`,
  help: () =>
    `<circle cx="9" cy="9" r="8.2" fill="#fff" stroke="#18212f" stroke-width="1.4"/><text x="9" y="13.4" text-anchor="middle" font-size="13" font-weight="700" font-family="Arial,sans-serif" fill="#18212f">?</text>`,
  /** the handwriting strip: a squiggle and an open hand (28 x 40) */
  hand: () => `<g transform="translate(-29.726514,-319.53237)"> <g transform="matrix(0.14561515,0,0,0.14561515,29.656496,300.17917)"> <path d="m 64.488011,320.34222 c -1.327238,-3.61737 4.592207,0.69216 2.54074,-23.9592 -1.858151,-22.32838 -7.73228,-21.20244 -7.619871,-31.75393 0.272968,-25.62275 80.51434,-22.94691 80.68046,-49.11886 0.14561,-22.94119 -99.720743,-7.05061 -99.868852,-35.89922 C 40.080622,152.36772 155.2224,139.55965 155.2224,139.55965" style="fill:none;fill-opacity:1;fill-rule:evenodd;stroke:#f0f0f0;stroke-width:8.58427162;stroke-linecap:round;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 75.927824,321.03128 0,0 0,0 c 0,-0.15464 0,0 0,0 m 25.998046,0 0,0 c 0,0 0,-0.15464 0,0 z m 39.10755,-1.1913 c -4.91478,-1.31691 -11.82187,3.17032 -11.82187,10.26421 0,-7.26817 -3.45065,-17.96848 -14.28665,-17.96848 -7.1877,0 -12.99903,5.72177 -12.99903,12.98993 0,-7.26816 -5.811325,-17.39357 -12.999016,-17.39357 -7.187697,0 -12.99903,5.87641 -12.99903,13.14457 l 0,-46.23794 c 0,-7.26816 -5.811335,-13.14456 -12.999032,-13.14456 -7.187697,0 -12.99903,5.8764 -12.99903,13.14456 l 0,79.17666 0,0 c 0.458788,29.07267 24.009971,52.26896 52.760738,51.80503 28.13909,-0.30928 46.45152,-23.4523 48.87081,-51.80503 0,-18.11515 1.32088,-29.92703 -10.52789,-33.97538 z" style="fill:#f4f4f4;fill-opacity:1;stroke:#ffffff;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" /> </g> </g>`,
  expand: () => `<path d="M2 18L5 21L2 24" fill="none" stroke="#fff"/>`,
};

for (const k of ['copy', 'cut', 'paste', 'undo', 'redo', 'bold', 'italic', 'autoitalic', 'regtext', 'rtl', 'ligature', 'color', 'special', 'help']) {
  if (TR[k]) {
    const svg = tracedArt(k);
    ART[k] = (w: number, h: number) => {
      const ic = TR[k];
      const sx = w / ic.w;
      const sy = h / ic.h;
      return sx === 1 && sy === 1 ? svg : `<g transform="scale(${sx} ${sy})">${svg}</g>`;
    };
  }
}

export const TAB_ART: Record<number, (w: number, h: number) => string> = {};

/* ------------------------------------------------------------- tab icons */
const T = (inner: string) => `<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
const box = (x: number, y: number, w = 4, h = 5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke-width="1"/>`;
const text = (x: number, y: number, s: string, size = 14, fam = "'STIX Two Math','Cambria Math',serif") => `<text x="${x}" y="${y}" font-size="${size}" font-family="${fam}" fill="currentColor" stroke="none">${s}</text>`;

export const TAB_ICONS_HANDMADE: string[] = [
  // General: sqrt box + small fraction
  T(`<path d="M2 11 L4.5 10 L7 16 L10 4 H17"/>${box(10.5, 7, 4, 6)}`) + T(`${box(22, 3, 4, 5)}${box(22, 11, 4, 5)}<path d="M21 9.5 H27"/>`),
  // Symbols: ∈ ∞
  text(3, 16, '∈', 15) + text(14, 16, '∞', 15),
  // Arrows: → and dots
  T(`<path d="M3 10 H14 M10.5 6.5 L14.5 10 L10.5 13.5"/>`) + `<circle cx="18" cy="12" r="1.1" fill="currentColor"/><circle cx="22" cy="9.5" r="1.1" fill="currentColor"/><circle cx="26" cy="7" r="1.1" fill="currentColor"/>`,
  // Greek: α Ω
  text(2, 16, 'α', 15) + text(15, 16, 'Ω', 15),
  // Matrices: [boxes] {box
  T(`<path d="M4 3 H1.5 V17 H4 M17 3 H19.5 V17 H17"/>${box(5.5, 5, 3.4, 4)}${box(11.5, 5, 3.4, 4)}${box(5.5, 11, 3.4, 4)}${box(11.5, 11, 3.4, 4)}<path d="M24 3 C22 3 22 5 22 7 C22 9 21 10 20.5 10 C21 10 22 11 22 13 C22 15 22 17 24 17"/>${box(25.5, 4.5, 3, 4)}${box(25.5, 11.5, 3, 4)}`),
  // Scripts: boxes with sup/sub
  T(`${box(3, 8, 6, 8)}${box(10, 3, 4, 5)}<path d="M18 5 H21 M16 3 H25"/>${box(20, 4, 4, 5)}${box(20, 12, 4, 5)}<path d="M19 10.5 H25"/>`),
  // Decorations: parentheses box and hat
  T(`<path d="M5 3 C2 7 2 13 5 17 M15 3 C18 7 18 13 15 17"/>${box(7.5, 7, 4, 6)}<path d="M20 9 L24.5 4.5 L29 9"/>${box(22, 11, 5, 6)}`),
  // Big operators: Σ U
  text(2, 16, 'Σ', 16) + text(16, 16, 'U', 15, 'Arial,sans-serif'),
  // Calculus: integral + lim
  T(`<path d="M9 2 C7.5 1 6.5 2 6.5 4 L5.5 15 C5.5 17 4.5 18 3 17"/>${box(8.5, 2.5, 3, 3.5)}${box(5, 14.5, 3, 3.5)}`) + text(14, 16, 'lim', 11, 'Arial,sans-serif'),
  // Contextual: stylised tab with arrow
  T(`<ellipse cx="14.5" cy="13" rx="9" ry="3.6"/><ellipse cx="14.5" cy="13" rx="5" ry="1.6"/><path d="M10.5 3.5 H18.5 L14.5 8Z" fill="currentColor"/>`),
];

/** tab icons: traced reference artwork (fill = currentColor), hand-made drawings as fallback */
export const TAB_ICONS: string[] = TAB_ICONS_HANDMADE.map((fallback, i) => (TR['tab' + i] ? tracedArt('tab' + i) : fallback));
