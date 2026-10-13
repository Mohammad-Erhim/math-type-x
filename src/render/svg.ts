/** Formula rendering shared by the server and the browser: MathML → layout → SVG. */
import { parseMathML } from '../core/mathml';
import { layoutDocument } from '../layout/layout';
import { itemsToSvg, FONT } from '../layout/svg';
import { arabicCssFamily } from '../layout/arfonts';

export interface RenderOptions {
  zoom?: number;
  dpi?: number;
  fontSize?: number;
  color?: string;
  background?: string;
  padding?: number;
}

export interface Rendered {
  svg: string;
  width: number;
  height: number;
  /** distance from the top of the image to the baseline of the first line */
  baseline: number;
  /** CSS family of the chosen bundled Arabic face ('' = none): the image services load only that one */
  arabic: string;
}

const COLOR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|rgba?\([0-9., %]+\))$/;
export const safeColor = (c: string | undefined, d: string) => (c && COLOR.test(c) ? c : d);

export function renderSvg(mml: string, o: RenderOptions = {}): Rendered {
  const doc = parseMathML(mml);
  const size = Math.min(Math.max(o.fontSize ?? 16, 4), 128);
  const rtl = doc.attrs.some(([k, v]) => k === 'dir' && v === 'rtl');
  // the equation's font-family (`<math style="font-family:Tajawal">`): the bundled Arabic face for Arabic-script text
  const family = arabicCssFamily(/font-family:\s*'?([^';]+)'?/.exec(doc.attrs.find(([k]) => k === 'style')?.[1] ?? '')?.[1]);
  const lay = layoutDocument(doc.row, undefined, size, rtl, family);
  const pad = o.padding ?? 2;
  const zoom = Math.min(Math.max(o.zoom ?? 1, 0.25), 8);
  const w = Math.max(1, Math.ceil(lay.w) + pad * 2);
  const hgt = Math.max(1, Math.ceil(lay.a + lay.d) + pad * 2);
  const fg = safeColor(o.color, '#000000');
  const bg = o.background ? safeColor(o.background, '') : '';
  const body = itemsToSvg(lay.items, { fg, sans: "'Liberation Sans','MTX Arabic',Arial,sans-serif", arabic: family });
  const W = Math.ceil(w * zoom);
  const H = Math.ceil(hgt * zoom);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${w} ${hgt}" data-baseline="${Math.round((lay.a + pad) * zoom)}" font-family="${FONT}">` +
    (bg && bg !== 'transparent' ? `<rect width="${w}" height="${hgt}" fill="${bg}"/>` : '') +
    `<g transform="translate(${pad} ${pad})">${body}</g></svg>`;
  return { svg, width: W, height: H, baseline: Math.round((lay.a + pad) * zoom), arabic: family };
}
