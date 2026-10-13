/** Minimal PDF / EPS writers wrapping an RGBA raster (render.pdf, render.eps); shared by the server and the browser. */

/** zlib-wrapped deflate of a byte array (Node: zlib.deflateSync, browser: CompressionStream('deflate')) */
export type Deflate = (data: Uint8Array) => Uint8Array | Promise<Uint8Array>;

const latin1 = (s: string) => {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
};
const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

export async function rgbaToPdf(rgba: Uint8Array, w: number, h: number, ptW: number, ptH: number, deflate: Deflate): Promise<Uint8Array> {
  const rgb = new Uint8Array(w * h * 3);
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3] = rgba[i * 4];
    rgb[i * 3 + 1] = rgba[i * 4 + 1];
    rgb[i * 3 + 2] = rgba[i * 4 + 2];
    alpha[i] = rgba[i * 4 + 3];
  }
  const objs: Uint8Array[] = [];
  const add = (b: Uint8Array | string) => objs.push(typeof b === 'string' ? latin1(b) : b);
  const stream = (dict: string, data: Uint8Array) => concat([latin1(`<< ${dict} /Length ${data.length} >>\nstream\n`), data, latin1('\nendstream')]);
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
  add(stream('', latin1(`q ${ptW.toFixed(2)} 0 0 ${ptH.toFixed(2)} 0 0 cm /Im0 Do Q`)));
  add(stream(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask 6 0 R`, await deflate(rgb)));
  add(stream(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, await deflate(alpha)));
  const head = latin1('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const parts: Uint8Array[] = [head];
  const offsets: number[] = [];
  let pos = head.length;
  objs.forEach((o, i) => {
    offsets.push(pos);
    const b = concat([latin1(`${i + 1} 0 obj\n`), o, latin1('\nendobj\n')]);
    parts.push(b);
    pos += b.length;
  });
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
  parts.push(latin1(xref));
  return concat(parts);
}

export function rgbaToEps(rgba: Uint8Array, w: number, h: number, ptW: number, ptH: number, background = '#ffffff'): Uint8Array {
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
  return latin1(head + lines.join('\n') + '\ngrestore\n%%EOF\n');
}
