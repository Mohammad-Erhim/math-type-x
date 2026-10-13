/**
 * Formula export in the browser (no server): the shared SVG, rasterised on a canvas with the bundled fonts embedded in
 * the SVG (an SVG drawn through an image cannot see the page's fonts), and the PDF / EPS wrappers around those pixels.
 */
import { renderSvg, RenderOptions } from './svg';
import { rgbaToPdf, rgbaToEps } from './pdf';

/** directory the font files are served from (`<editor.js directory>/fonts/` unless configured) */
let assetsBase = '';
export function setAssetsBase(url: string): void {
  assetsBase = url.replace(/\/?$/, '/');
}
export function getAssetsBase(): string {
  return assetsBase;
}

type Face = { family: string; style: 'normal' | 'italic'; weight: 400 | 700; file: string; mime: string; format: string };
const LIBERATION: Record<string, Face> = {
  '400/normal': { family: 'Liberation Sans', style: 'normal', weight: 400, file: 'LiberationSans-Regular.ttf', mime: 'font/ttf', format: 'truetype' },
  '700/normal': { family: 'Liberation Sans', style: 'normal', weight: 700, file: 'LiberationSans-Bold.ttf', mime: 'font/ttf', format: 'truetype' },
  '400/italic': { family: 'Liberation Sans', style: 'italic', weight: 400, file: 'LiberationSans-Italic.ttf', mime: 'font/ttf', format: 'truetype' },
  '700/italic': { family: 'Liberation Sans', style: 'italic', weight: 700, file: 'LiberationSans-BoldItalic.ttf', mime: 'font/ttf', format: 'truetype' },
};
const STIX: Face = { family: 'STIX Two Math', style: 'normal', weight: 400, file: 'stix-two-math.woff2', mime: 'font/woff2', format: 'woff2' };

const cache = new Map<string, Promise<string>>();
function dataUri(face: Face): Promise<string> {
  const url = assetsBase + face.file;
  let p = cache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('font ' + url + ' ' + r.status);
        return r.arrayBuffer();
      })
      .then((buf) => {
        let bin = '';
        const u8 = new Uint8Array(buf);
        for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
        return `data:${face.mime};base64,${btoa(bin)}`;
      });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

/** the font faces an SVG of ours needs (only those are fetched) */
export function facesFor(svg: string): Face[] {
  const faces = new Map<string, Face>();
  let stix = false;
  for (const m of svg.matchAll(/<text\b[^>]*>/g)) {
    const t = m[0];
    const sans = /font-family="'Liberation Sans'/.test(t);
    if (!sans) {
      stix = true;
      continue;
    }
    const key = `${/font-weight="bold"/.test(t) ? 700 : 400}/${/font-style="italic"/.test(t) ? 'italic' : 'normal'}`;
    faces.set(key, LIBERATION[key]);
  }
  return [...faces.values(), ...(stix ? [STIX] : [])];
}

export async function embedFonts(svg: string): Promise<string> {
  const faces = facesFor(svg);
  if (!faces.length) return svg;
  const css = (
    await Promise.all(
      faces.map(async (f) => `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};src:url(${await dataUri(f)}) format('${f.format}')}`),
    )
  ).join('');
  return svg.replace(/^(<svg\b[^>]*>)/, `$1<defs><style>${css}</style></defs>`);
}

export interface Raster {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  baseline: number;
  blob: Blob;
}

async function rasterise(svg: string, width: number, height: number): Promise<{ canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D }> {
  const withFonts = await embedFonts(svg);
  const url = URL.createObjectURL(new Blob([withFonts], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : Object.assign(document.createElement('canvas'), { width, height });
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    // the fonts inside an SVG image load after the image is decoded and text stays invisible until then: draw until
    // two draws in a row give the same pixels
    let last = -1;
    for (let i = 0; i < 40; i++) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const px = ctx.getImageData(0, 0, width, height).data;
      let sum = 0;
      for (let k = 3; k < px.length; k += 4) sum += px[k] * ((k >> 2) % 251 + 1);
      if (sum === last) break;
      last = sum;
      await new Promise((r) => setTimeout(r, 40));
    }
    return { canvas, ctx };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** PNG of a formula at the zoom / dpi of the service call */
export async function renderPngBlob(mml: string, o: RenderOptions = {}): Promise<{ blob: Blob; width: number; height: number; baseline: number }> {
  const dpi = o.dpi ?? 96;
  const r = renderSvg(mml, { ...o, zoom: (o.zoom ?? 1) * (dpi / 96) });
  const { canvas } = await rasterise(r.svg, r.width, r.height);
  const blob = await (canvas instanceof OffscreenCanvas ? canvas.convertToBlob({ type: 'image/png' }) : new Promise<Blob>((res, rej) => (canvas as HTMLCanvasElement).toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png')));
  return { blob, width: r.width, height: r.height, baseline: r.baseline };
}

const RASTER_SCALE = 300 / 96;

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** PDF / EPS of a formula: a 300 dpi raster wrapped as the server does */
export async function renderVector(mml: string, format: 'pdf' | 'eps', o: RenderOptions = {}): Promise<Blob> {
  const r = renderSvg(mml, { ...o, zoom: (o.zoom ?? 1) * RASTER_SCALE });
  const { ctx } = await rasterise(r.svg, r.width, r.height);
  const img = ctx.getImageData(0, 0, r.width, r.height);
  const px = (n: number) => (n / RASTER_SCALE) * 0.75;
  const rgba = new Uint8Array(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  if (format === 'pdf') return new Blob([(await rgbaToPdf(rgba, r.width, r.height, px(r.width), px(r.height), deflate)) as BlobPart], { type: 'application/pdf' });
  return new Blob([rgbaToEps(rgba, r.width, r.height, px(r.width), px(r.height), o.background && /^#[0-9a-f]{6}$/i.test(o.background) ? o.background : '#ffffff') as BlobPart], { type: 'application/postscript' });
}

export { renderSvg };
