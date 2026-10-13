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

/** SVG markup (inner) of a catalogue control icon fitted into a w×h box */
export function controlIcon(c: Control, w: number, h: number): string {
  // vector re-drawing of the reference artwork (tools/gen/trace_controls.py)
  const t = TRACED[c.id];
  if (t) {
    const body = t.layers.map((l) => `<path d="${l.d}" fill="${l.fill}"${(l as any).op ? ` fill-opacity="${(l as any).op}"` : ''} fill-rule="evenodd"/>`).join('');
    return t.w === w && t.w === h ? body : `<g transform="scale(${w / t.w} ${h / t.w})">${body}</g>`;
  }
  const mml = c.A ?? '<math/>';
  let doc;
  try {
    doc = parseMathML(mml.includes('xmlns') ? mml : mml.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"'));
  } catch {
    return '';
  }
  if (doc.row.length === 0) return '';
  // find a font size that fits
  let size = w <= 22 ? 15 : 14;
  let lay = layoutDocument(doc.row, undefined, size);
  const fit = () => {
    const tw = lay.w;
    const th = lay.a + lay.d;
    return Math.min((w - 2) / Math.max(tw, 1), (h - 2) / Math.max(th, 1));
  };
  let f = fit();
  if (f < 1) {
    size = Math.max(6, size * f);
    lay = layoutDocument(doc.row, undefined, size);
  }
  const x0 = (w - lay.w) / 2;
  const y0 = (h - (lay.a + lay.d)) / 2;
  return `<g transform="translate(${r(x0)} ${r(y0)})">${itemsToSvg(lay.items)}</g>`;
}
