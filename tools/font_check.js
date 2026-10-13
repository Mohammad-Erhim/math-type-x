// Font list of the Arabic faces: for each face the same Arabic formula is set in the editor (through the Font select), the
// canvas is screenshotted and compared with the PNG export (ink boxes, 1 px tolerant overlap).
// usage: [URL=http://localhost:8099/] [OUT=out_fonts] node tools/font_check.js
const { open } = require('./lib');
const fs = require('fs');
const OUT = process.env.OUT || 'out_fonts';
fs.mkdirSync(OUT, { recursive: true });
const N = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const BODY = '<mi>س</mi><mo>=</mo><mn>٣</mn><mi>x</mi><mtext>مرحبا بالعالم</mtext><mfrac><mi>ب</mi><mn>2</mn></mfrac><msqrt><mi>ج</mi></msqrt>';
(async () => {
  process.env.URL = process.env.URL || 'http://localhost:8099/';
  const { b, p, log } = await open({ dsf: 1 });
  await p.addStyleTag({ content: '.wrs_caret,.wrs_underlineCaret,.wrs_inverseCaret{display:none !important}' });
  const box = await p.locator('#editorContainer').boundingBox();
  await p.evaluate(() => {
    window.__ink = async (src) => {
      const img = new Image(); img.src = src; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; const m = new Uint8Array(cv.width * cv.height);
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        const i = (y * cv.width + x) * 4; const r = d[i], g = d[i + 1], bl = d[i + 2];
        if (r + g + bl < 450 && Math.max(r, g, bl) - Math.min(r, g, bl) < 28) { m[y * cv.width + x] = 1; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return { w: cv.width, h: cv.height, x0, y0, x1, y1, m };
    };
    window.__cmp = async (a, c) => {
      const A = await window.__ink(a), B = await window.__ink(c);
      const aw = A.x1 - A.x0 + 1, ah = A.y1 - A.y0 + 1, bw = B.x1 - B.x0 + 1, bh = B.y1 - B.y0 + 1;
      const get = (I, x, y) => { const X = x + I.x0, Y = y + I.y0; return X >= 0 && Y >= 0 && X < I.w && Y < I.h ? I.m[Y * I.w + X] : 0; };
      const near = (I, x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (get(I, x + dx, y + dy)) return true; return false; };
      let na = 0, nb = 0, ha = 0, hb = 0;
      for (let y = 0; y < Math.max(ah, bh); y++) for (let x = 0; x < Math.max(aw, bw); x++) {
        if (get(A, x, y)) { na++; if (near(B, x, y)) ha++; }
        if (get(B, x, y)) { nb++; if (near(A, x, y)) hb++; }
      }
      return { a: [aw, ah], b: [bw, bh], recall: nb ? hb / nb : 1, precision: na ? ha / na : 1 };
    };
  });
  const faces = ['', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Noto Kufi Arabic', 'Tajawal'];
  const out = [];
  for (const rtl of [false, true]) for (const f of faces) {
    // through the Font select, like a user (the formula first, then the choice)
    await p.evaluate(([m]) => editor.setMathML(m), [`<math ${N}${rtl ? ' dir="rtl"' : ''}>${BODY}</math>`]);
    await p.waitForTimeout(300);
    if (f) {
      await p.locator('#editorContainer .wrs_select select').first().selectOption(f);
    }
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(900);
    const mml = await p.evaluate(() => editor.getMathML());
    const clip = { x: box.x + 2, y: box.y + 98, width: box.width - 4, height: 210 };
    const ed = await p.screenshot({ clip, type: 'png' });
    const png = await p.evaluate(async () => { const bl = await editor.getPNG({ zoom: 1 }); return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(bl); }); });
    const edSrc = 'data:image/png;base64,' + ed.toString('base64');
    const cmp = await p.evaluate(([a, c]) => window.__cmp(a, c), [edSrc, png]);
    const name = (f || 'default').replace(/\W+/g, '') + (rtl ? '_rtl' : '');
    fs.writeFileSync(`${OUT}/${name}_editor.png`, ed);
    fs.writeFileSync(`${OUT}/${name}_png.png`, Buffer.from(png.split(',')[1], 'base64'));
    const row = { face: f || 'default', rtl, style: /style="[^"]*"/.exec(mml)?.[0], cmp };
    out.push(row);
    console.log(JSON.stringify(row));
  }
  console.log('page errors', log.errors.length, log.errors.slice(0, 3));
  await b.close();
})();
