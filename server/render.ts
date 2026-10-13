/** Server-side formula rendering: the shared SVG (src/render) rasterised with resvg. */
import { Resvg } from '@resvg/resvg-js';
import { mathFontPath, sansFontPaths, arabicFacePaths } from './font';
import './arabic';
import { renderSvg, safeColor } from '../src/render/svg';
import type { RenderOptions, Rendered } from '../src/render/svg';

export { renderSvg, safeColor };
export type { RenderOptions, Rendered };

export function renderPng(mml: string, o: RenderOptions = {}): { png: Buffer; width: number; height: number; baseline: number } {
  const dpi = o.dpi ?? 96;
  const r = renderSvg(mml, { ...o, zoom: (o.zoom ?? 1) * (dpi / 96) });
  const png = new Resvg(r.svg, {
    font: { fontFiles: [...sansFontPaths(), ...arabicFacePaths(r.arabic), mathFontPath()], loadSystemFonts: false, defaultFontFamily: 'Liberation Sans' },
    shapeRendering: 2,
    textRendering: 2,
  })
    .render()
    .asPng();
  return { png: Buffer.from(png), width: r.width, height: r.height, baseline: r.baseline };
}

/** raster pixels (RGBA) for PDF / EPS output */
export function renderRaster(mml: string, o: RenderOptions = {}): { rgba: Uint8Array; width: number; height: number; baseline: number; ptW: number; ptH: number } {
  const scale = RASTER_SCALE;
  const r = renderSvg(mml, { ...o, zoom: (o.zoom ?? 1) * scale });
  const img = new Resvg(r.svg, {
    font: { fontFiles: [...sansFontPaths(), ...arabicFacePaths(r.arabic), mathFontPath()], loadSystemFonts: false, defaultFontFamily: 'Liberation Sans' },
    shapeRendering: 2,
    textRendering: 2,
  }).render();
  const px = (n: number) => (n / scale) * 0.75;
  return { rgba: new Uint8Array(img.pixels), width: img.width, height: img.height, baseline: r.baseline, ptW: px(img.width), ptH: px(img.height) };
}

const RASTER_SCALE = 300 / 96;
