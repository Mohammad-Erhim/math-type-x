/** Minimal PDF / EPS writers wrapping an RGBA raster (render.pdf, render.eps). */
import { deflateSync } from 'node:zlib';

export function rgbaToPdf(rgba: Uint8Array, w: number, h: number, ptW: number, ptH: number): Buffer {
  const rgb = Buffer.alloc(w * h * 3);
  const alpha = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3] = rgba[i * 4];
    rgb[i * 3 + 1] = rgba[i * 4 + 1];
    rgb[i * 3 + 2] = rgba[i * 4 + 2];
    alpha[i] = rgba[i * 4 + 3];
  }
  const objs: Buffer[] = [];
  const add = (b: Buffer | string) => objs.push(Buffer.isBuffer(b) ? b : Buffer.from(b, 'latin1'));
  const stream = (dict: string, data: Buffer) => Buffer.concat([Buffer.from(`<< ${dict} /Length ${data.length} >>\nstream\n`, 'latin1'), data, Buffer.from('\nendstream', 'latin1')]);
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
  add(stream('', Buffer.from(`q ${ptW.toFixed(2)} 0 0 ${ptH.toFixed(2)} 0 0 cm /Im0 Do Q`, 'latin1')));
  add(stream(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask 6 0 R`, deflateSync(rgb)));
  add(stream(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, deflateSync(alpha)));
  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  const offsets: number[] = [];
  let pos = parts[0].length;
  objs.forEach((o, i) => {
    offsets.push(pos);
    const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), o, Buffer.from('\nendobj\n', 'latin1')]);
    parts.push(b);
    pos += b.length;
  });
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
  parts.push(Buffer.from(xref, 'latin1'));
  return Buffer.concat(parts);
}

export function rgbaToEps(rgba: Uint8Array, w: number, h: number, ptW: number, ptH: number, background = '#ffffff'): Buffer {
  const bg = [parseInt(background.slice(1, 3), 16), parseInt(background.slice(3, 5), 16), parseInt(background.slice(5, 7), 16)];
  const hex: string[] = [];
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) {
      const v = Math.round(rgba[i * 4 + c] * a + bg[c] * (1 - a));
      hex.push(v.toString(16).padStart(2, '0'));
    }
  }
  const lines: string[] = [];
  const s = hex.join('');
  for (let i = 0; i < s.length; i += 72) lines.push(s.slice(i, i + 72));
  const head = `%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 ${Math.ceil(ptW)} ${Math.ceil(ptH)}\n%%Creator: MathType-X\n%%EndComments\ngsave\n${ptW.toFixed(2)} ${ptH.toFixed(2)} scale\n/pix ${w * 3} string def\n${w} ${h} 8 [${w} 0 0 -${h} 0 ${h}]\n{ currentfile pix readhexstring pop } false 3 colorimage\n`;
  return Buffer.from(head + lines.join('\n') + '\ngrestore\n%%EOF\n', 'latin1');
}
