/** PDF / EPS writers for the server: the shared ones with Node's zlib. */
import { deflateSync } from 'node:zlib';
import { rgbaToPdf as pdf, rgbaToEps as eps } from '../src/render/pdf';

export async function rgbaToPdf(rgba: Uint8Array, w: number, h: number, ptW: number, ptH: number): Promise<Buffer> {
  return Buffer.from(await pdf(rgba, w, h, ptW, ptH, (d) => deflateSync(d)));
}

export function rgbaToEps(rgba: Uint8Array, w: number, h: number, ptW: number, ptH: number, background = '#ffffff'): Buffer {
  return Buffer.from(eps(rgba, w, h, ptW, ptH, background));
}
