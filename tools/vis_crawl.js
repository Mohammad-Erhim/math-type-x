// Visual crawl: every toolbar control of a tab (and every item of its drop-downs) is inserted into an empty editor;
// the editor canvas and the exported PNG of the same formula are pixel-compared (ink boxes + 1 px tolerant overlap).
// usage: TAB=0 [URL=http://localhost:8099/] [LANGUAGE=ar] [RTL=1] [OUT=out_vis] [ONLY=t0_b3,..] node tools/vis_crawl.js
const { open } = require('./lib');
const fs = require('fs');
const TAB = parseInt(process.env.TAB, 10);
const OUT = process.env.OUT || 'out_vis';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const CASES = (process.env.CASES || 'A,A2,B').split(',');
fs.mkdirSync(OUT, { recursive: true });
const EMPTY = process.env.RTL ? '<math dir="rtl" xmlns="http://www.w3.org/1998/Math/MathML"/>' : '<math xmlns="http://www.w3.org/1998/Math/MathML"/>';
const SKIP = /^(Undo|Redo|Press Ctrl\+|Color|Insert special|Handwriting)|^$/;
(async () => {
  process.env.URL = process.env.URL || 'http://localhost:8099/';
  const { b, p, log } = await open({ dsf: 1 });
  await p.addStyleTag({ content: '.wrs_caret,.wrs_underlineCaret,.wrs_inverseCaret{display:none !important}' });
  const box = await p.locator('#editorContainer').boundingBox();
  const edit = { x: box.x + 400, y: box.y + 330 };
  const sleep = (ms) => p.waitForTimeout(ms);
  const tag = (process.env.LANGUAGE || 'en') + (process.env.RTL ? '_rtl' : '');
  const reset = async () => {
    await p.evaluate((m) => editor.setMathML(m), EMPTY);
    await sleep(250);
    await p.mouse.click(edit.x, edit.y);
    await sleep(120);
  };
  const tabBtn = p.locator('#editorContainer .wrs_header button').nth(TAB);
  const selectTab = async () => { await tabBtn.click(); await sleep(250); };
  const list = () => p.evaluate(() => [...document.querySelectorAll('#editorContainer button.wrs_button')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map((e) => { const r = e.getBoundingClientRect(); return { title: e.getAttribute('aria-label') || e.title, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; }));
  // ink analysis in the page
  await p.evaluate(() => {
    window.__ink = async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext('2d');
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      const m = new Uint8Array(cv.width * cv.height);
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        const i = (y * cv.width + x) * 4;
        // only dark, colourless ink: the editor draws placeholders / selections in colour
        const r = d[i], g = d[i + 1], bl = d[i + 2];
        if (r + g + bl < 450 && Math.max(r, g, bl) - Math.min(r, g, bl) < 28) { m[y * cv.width + x] = 1; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return { w: cv.width, h: cv.height, x0, y0, x1, y1, m };
    };
    window.__cmp = async (edSrc, pngSrc) => {
      const A = await window.__ink(edSrc), B = await window.__ink(pngSrc);
      if (A.x1 < 0 || B.x1 < 0) return { empty: [A.x1 < 0, B.x1 < 0], a: [A.x1 - A.x0 + 1, A.y1 - A.y0 + 1], b: [B.x1 - B.x0 + 1, B.y1 - B.y0 + 1] };
      const aw = A.x1 - A.x0 + 1, ah = A.y1 - A.y0 + 1, bw = B.x1 - B.x0 + 1, bh = B.y1 - B.y0 + 1;
      // overlap with the boxes aligned at their top-left corner (tolerance 1 px)
      const get = (I, x, y, ox, oy) => { const X = x + ox, Y = y + oy; return X >= 0 && Y >= 0 && X < I.w && Y < I.h ? I.m[Y * I.w + X] : 0; };
      const near = (I, x, y, ox, oy) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (get(I, x + dx, y + dy, ox, oy)) return true; return false; };
      let na = 0, nb = 0, ha = 0, hb = 0;
      const W = Math.max(aw, bw), H = Math.max(ah, bh);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (get(A, x, y, A.x0, A.y0)) { na++; if (near(B, x, y, B.x0, B.y0)) ha++; }
        if (get(B, x, y, B.x0, B.y0)) { nb++; if (near(A, x, y, A.x0, A.y0)) hb++; }
      }
      return { a: [aw, ah], b: [bw, bh], na, nb, recall: nb ? hb / nb : 1, precision: na ? ha / na : 1 };
    };
    window.__side = async (edSrc, pngSrc) => {
      const A = await window.__ink(edSrc), B = await window.__ink(pngSrc);
      const crop = (I, src) => new Promise((res) => { const img = new Image(); img.onload = () => res(img); img.src = src; });
      const ia = await crop(A, edSrc), ib = await crop(B, pngSrc);
      const pad = 6;
      const box = (I) => (I.x1 < 0 ? { x: 0, y: 0, w: 10, h: 10 } : { x: Math.max(0, I.x0 - pad), y: Math.max(0, I.y0 - pad), w: Math.min(I.w, I.x1 + pad) - Math.max(0, I.x0 - pad), h: Math.min(I.h, I.y1 + pad) - Math.max(0, I.y0 - pad) });
      const ba = box(A), bb = box(B);
      const Z = 3;
      const cv = document.createElement('canvas');
      const w = (ba.w + bb.w) * Z + 30, h = Math.max(ba.h, bb.h) * Z + 20;
      cv.width = Math.max(w, 60); cv.height = Math.max(h, 30);
      const cx = cv.getContext('2d');
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      cx.imageSmoothingEnabled = false;
      cx.drawImage(ia, ba.x, ba.y, ba.w, ba.h, 5, 10, ba.w * Z, ba.h * Z);
      cx.strokeStyle = '#f00'; cx.strokeRect(4.5, 9.5, ba.w * Z + 1, ba.h * Z + 1);
      cx.drawImage(ib, bb.x, bb.y, bb.w, bb.h, 25 + ba.w * Z, 10, bb.w * Z, bb.h * Z);
      cx.strokeStyle = '#00f'; cx.strokeRect(24.5 + ba.w * Z, 9.5, bb.w * Z + 1, bb.h * Z + 1);
      cx.fillStyle = '#888'; cx.font = '9px sans-serif';
      cx.fillText('editor', 5, 8); cx.fillText('PNG', 25 + ba.w * Z, 8);
      return cv.toDataURL('image/png');
    };
  });
  const results = [];
  async function snap(id, title, kind) {
    await sleep(350);
    const clip = { x: box.x + 2, y: box.y + 98, width: Math.min(box.width - 34, 700), height: 210 };
    const ed = await p.screenshot({ clip, type: 'png' });
    const mml = await p.evaluate(() => editor.getMathML());
    const png = await p.evaluate(async () => { const bl = await editor.getPNG({ zoom: 1 }); return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(bl); }); });
    const edSrc = 'data:image/png;base64,' + ed.toString('base64');
    const cmp = await p.evaluate(([a, c]) => window.__cmp(a, c), [edSrc, png]);
    const rec = { id, kind, title, mml: mml.replace(/ xmlns="[^"]+"/, ''), cmp };
    const bad = cmp.empty ? cmp.empty[0] !== cmp.empty[1] : (cmp.recall < 0.85 || cmp.precision < 0.85 || Math.abs(cmp.a[0] - cmp.b[0]) > 2 || Math.abs(cmp.a[1] - cmp.b[1]) > 2);
    rec.bad = !!bad;
    const side = await p.evaluate(([a, c]) => window.__side(a, c), [edSrc, png]);
    fs.writeFileSync(`${OUT}/${tag}_${id}_${kind}.png`, Buffer.from(side.split(',')[1], 'base64'));
    results.push(rec);
    return rec;
  }
  async function runItem(item, id, opener) {
    if (ONLY && !ONLY.includes(id)) return;
    try {
      for (const k of CASES) {
        await reset(); await selectTab();
        await p.mouse.click(edit.x, edit.y); await sleep(100);
        if (k === 'B') { await p.keyboard.type('x'); await sleep(120); }
        if (opener) { await p.mouse.click(opener.x, opener.y); await sleep(300); }
        await p.mouse.click(item.x, item.y); await sleep(250);
        if (k === 'A2' || k === 'B') { await p.keyboard.type('7'); await sleep(150); }
        const r = await snap(id, item.title, k);
        if (r.bad) console.log('BAD', id, k, item.title, JSON.stringify(r.cmp));
      }
    } catch (e) { console.log('ERR', id, String(e).slice(0, 120)); results.push({ id, title: item.title, error: String(e).slice(0, 200) }); try { await p.keyboard.press('Escape'); } catch (_) {} }
  }
  await selectTab();
  const base = await list();
  const baseKeys = new Set(base.map((x) => `${Math.round(x.x)},${Math.round(x.y)}`));
  const expanders = await p.evaluate(() => [...document.querySelectorAll('#editorContainer button.wrs_expandButton')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  console.log('TAB', TAB, 'buttons', base.length, 'expanders', expanders.length);
  for (let i = 0; i < base.length; i++) {
    if (SKIP.test(base[i].title || '')) continue;
    await runItem(base[i], `t${TAB}_b${i}`);
  }
  for (let e = 0; e < expanders.length; e++) {
    await reset(); await selectTab();
    await p.mouse.click(expanders[e].x, expanders[e].y); await sleep(450);
    const after = await list();
    const popup = after.filter((x) => !baseKeys.has(`${Math.round(x.x)},${Math.round(x.y)}`));
    console.log('expander', e, 'items', popup.length);
    await p.keyboard.press('Escape'); await sleep(200);
    for (let k = 0; k < popup.length; k++) await runItem(popup[k], `t${TAB}_x${e}_i${k}`, expanders[e]);
  }
  fs.writeFileSync(`${OUT}/${tag}_tab${TAB}.json`, JSON.stringify({ tab: TAB, results, errors: log.errors }, null, 1));
  const nbad = results.filter((r) => r.bad).length;
  console.log(`TAB ${TAB} done: ${results.length} renders, ${nbad} flagged, page errors ${log.errors.length}`);
  await b.close();
})();
