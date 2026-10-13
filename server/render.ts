/** Server-side formula rendering: MathML → layout → SVG → PNG (resvg). */
import { parseMathML } from '../src/core/mathml';
import { layoutDocument } from '../src/layout/layout';
import { itemsToSvg, FONT } from '../src/layout/svg';
import { Resvg } from '@resvg/resvg-js';
import { mathFontPath, sansFontPaths } from './font';

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
}

const COLOR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|rgba?\([0-9., %]+\))$/;
export const safeColor = (c: string | undefined, d: string) => (c && COLOR.test(c) ? c : d);

export function renderSvg(mml: string, o: RenderOptions = {}): Rendered {
  const doc = parseMathML(mml);
  const size = Math.min(Math.max(o.fontSize ?? 16, 4), 128);
  const rtl = doc.attrs.some(([k, v]) => k === 'dir' && v === 'rtl');
  const lay = layoutDocument(doc.row, undefined, size, rtl);
  const pad = o.padding ?? 2;
  const zoom = Math.min(Math.max(o.zoom ?? 1, 0.25), 8);
  const w = Math.max(1, Math.ceil(lay.w) + pad * 2);
  const hgt = Math.max(1, Math.ceil(lay.a + lay.d) + pad * 2);
  const fg = safeColor(o.color, '#000000');
  const bg = o.background ? safeColor(o.background, '') : '';
  const body = itemsToSvg(lay.items, { fg, sans: "'Liberation Sans',Arial,sans-serif" });
  const W = Math.ceil(w * zoom);
  const H = Math.ceil(hgt * zoom);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${w} ${hgt}" data-baseline="${Math.round((lay.a + pad) * zoom)}" font-family="${FONT}">` +
    (bg && bg !== 'transparent' ? `<rect width="${w}" height="${hgt}" fill="${bg}"/>` : '') +
    `<g transform="translate(${pad} ${pad})">${body}</g></svg>`;
  return { svg, width: W, height: H, baseline: Math.round((lay.a + pad) * zoom) };
}

export function renderPng(mml: string, o: RenderOptions = {}): { png: Buffer; width: number; height: number; baseline: number } {
  const dpi = o.dpi ?? 96;
  const r = renderSvg(mml, { ...o, zoom: (o.zoom ?? 1) * (dpi / 96) });
  const png = new Resvg(r.svg, {
    font: { fontFiles: [...sansFontPaths(), mathFontPath()], loadSystemFonts: false, defaultFontFamily: 'Liberation Sans' },
    shapeRendering: 2,
    textRendering: 2,
  })
    .render()
    .asPng();
  return { png: Buffer.from(png), width: r.width, height: r.height, baseline: r.baseline };
}

/** raster pixels (RGBA) for PDF / EPS output */
export function renderRaster(mml: string, o: RenderOptions = {}): { rgba: Uint8Array; width: number; height: number; baseline: number; ptW: number; ptH: number } {
  const scale = 300 / 96;
  const r = renderSvg(mml, { ...o, zoom: (o.zoom ?? 1) * scale });
  const img = new Resvg(r.svg, {
    font: { fontFiles: [...sansFontPaths(), mathFontPath()], loadSystemFonts: false, defaultFontFamily: 'Liberation Sans' },
    shapeRendering: 2,
    textRendering: 2,
  }).render();
  const px = (n: number) => (n / scale) * 0.75;
  return { rgba: new Uint8Array(img.pixels), width: img.width, height: img.height, baseline: r.baseline, ptW: px(img.width), ptH: px(img.height) };
}
