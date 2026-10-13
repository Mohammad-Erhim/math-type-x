/**
 * Toolbar icons. Every icon is vector artwork produced by the layout engine from the control's MathML
 * (templates are drawn with green empty-slot boxes, symbols as glyphs) or hand-drawn for the
 * non-mathematical controls. All colours follow the reference toolbar.
 */
import { parseMathML } from '../core/mathml';
import { layoutDocument } from '../layout/layout';
import type { Control } from '../core/catalogue';

import { itemsToSvg, FONT as ICON_FONT } from '../layout/svg';
import traced from '../data/control-icons.json';

const TRACED = traced as unknown as Record<string, { w: number; layers: { fill: string; d: string }[] }>;
export { itemsToSvg, ICON_FONT };
export const SLOT_COLOR = '#2e9e2e';
const r = (n: number) => Math.round(n * 100) / 100;

/** The traced artwork is thinned a little by the vectorising (the sprites are anti-aliased bitmaps): a hairline stroke in
 * the fill colour gives back the weight of the original (measured: median ink 0.88 of the sprite without it). */
const TRACE_STROKE = 0.2;
export function tracedPaths(layers: { fill: string; d: string; op?: number }[], fill?: string): string {
  return layers
    .map((l) => {
      const f = fill ?? l.fill;
      return `<path d="${l.d}" fill="${f}"${l.op ? ` fill-opacity="${l.op}"` : ` stroke="${f}" stroke-width="${TRACE_STROKE}" stroke-linejoin="round"`} fill-rule="evenodd"/>`;
    })
    .join('');
}

/** controls whose icon is drawn from their formula instead of the traced sprite: thin hairlines (the infinity loops, the
 * curly d) do not survive tracing at this size, and the limit word follows the language */
export const DRAWN_ICONS = new Set(['TB-9-009', 'TB-9-010', 'TB-1-024', 'TB-2-014', 'TB-9-008']);

/** SVG markup (inner) of a catalogue control icon fitted into a w×h box */
export function controlIcon(c: Control, w: number, h: number, arabic = false): string {
  // the limit buttons are drawn from their formula: the word follows the language (نها in Arabic, mirrored) and the
  // infinity sign stays clear at this size
  const limit = c.id === 'TB-9-009' || c.id === 'TB-9-010';
  // vector re-drawing of the reference artwork (tools/gen/trace_controls.py)
  const t = DRAWN_ICONS.has(c.id) ? undefined : TRACED[c.id];
  if (t) {
    const body = tracedPaths(t.layers as any);
    return t.w === w && t.w === h ? body : `<g transform="scale(${w / t.w} ${h / t.w})">${body}</g>`;
  }
  let mml = c.A ?? '<math/>';
  if (limit && arabic) mml = mml.replace('<mi>lim</mi>', '<mi>\u0646\u0647\u0627</mi>').replace('&#x2192;', '&#x2190;');
  let doc;
  try {
    doc = parseMathML(mml.includes('xmlns') ? mml : mml.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"'));
  } catch {
    return '';
  }
  if (doc.row.length === 0) return '';
  // find a font size that fits
  let size = w <= 22 ? 15 : 14;
  const rtlIcon = limit && arabic;
  let lay = layoutDocument(doc.row, undefined, size, rtlIcon);
  const fit = () => {
    const tw = lay.w;
    const th = lay.a + lay.d;
    return Math.min((w - 2) / Math.max(tw, 1), (h - 2) / Math.max(th, 1));
  };
  let f = fit();
  if (f < 1) {
    size = Math.max(6, size * f);
    lay = layoutDocument(doc.row, undefined, size, rtlIcon);
  }
  const x0 = (w - lay.w) / 2;
  const y0 = (h - (lay.a + lay.d)) / 2;
  return `<g transform="translate(${r(x0)} ${r(y0)})">${itemsToSvg(lay.items, { slots: true })}</g>`;
}
