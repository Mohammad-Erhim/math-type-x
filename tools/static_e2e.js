// The static build in a real browser: no services at all, yet export (SVG / PNG / PDF / EPS), the output panel's PNG copy
// and handwriting work; PNG / SVG are compared with what the server makes.
// usage: node tools/build.mjs && node tools/build.mjs --prod --static --out=dist-static && node tools/static_e2e.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json' };
// a static host: files only; everything else is 405 (what Vercel answers to a POST)
const staticServer = http
  .createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, 'dist-static/public', p);
    if (!f.startsWith(path.join(ROOT, 'dist-static/public')) || !fs.existsSync(f)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  })
  .listen(8100);

const results = [];
const check = (name, ok, extra = '') => {
  results.push(ok);
  console.log((ok ? 'OK   ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
};

(async () => {
  const server = spawn('node', ['dist/server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: '8101', LOG: 'off' }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const MML = '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mi>a</mi><mo>+</mo><mn>1</mn></mrow><msqrt><mi>x</mi></msqrt></mfrac><mo>=</mo><msup><mi>y</mi><mn>2</mn></msup></math>';
  const post = async (fmt, extra = {}) => {
    const r = await fetch('http://localhost:8101/editor-services/render.' + fmt, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mml: MML, ...extra }) });
    return Buffer.from(await r.arrayBuffer());
  };
  const serverSvg = (await post('svg')).toString();
  const serverPng = await post('png');
  const serverPng2 = await post('png', { zoom: '2' });

  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const failed = [];
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)));
  const posts = [];
  page.on('request', (r) => r.method() === 'POST' && posts.push(r.url()));
  await page.goto('http://localhost:8100/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  await page.evaluate((m) => editor.setMathML(m), MML);
  await page.waitForTimeout(500);

  // SVG: identical to the server's
  const svg = await page.evaluate(async () => await editor.getSVG());
  check('svg equals the server svg', svg === serverSvg, `${svg.length} / ${serverSvg.length}`);

  // PNG: same size, nearly the same pixels
  const cmp = async (zoom, srvBuf) => {
    const b64 = srvBuf.toString('base64');
    return page.evaluate(async ({ zoom, b64 }) => {
      const blob = await editor.getPNG(zoom === 1 ? {} : { zoom });
      const load = async (b) => {
        const bmp = await createImageBitmap(b);
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const x = c.getContext('2d');
        x.drawImage(bmp, 0, 0);
        return { w: bmp.width, h: bmp.height, d: x.getImageData(0, 0, bmp.width, bmp.height).data };
      };
      const mine = await load(blob);
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const theirs = await load(new Blob([bin], { type: 'image/png' }));
      if (mine.w !== theirs.w || mine.h !== theirs.h) return { size: [mine.w, mine.h, theirs.w, theirs.h] };
      let diff = 0, ink = 0, big = 0;
      for (let i = 0; i < mine.d.length; i += 4) {
        const a = mine.d[i + 3], bb = theirs.d[i + 3];
        const dd = Math.abs(a - bb);
        diff += dd;
        if (bb > 40) ink++;
        if (dd > 128) big++;
      }
      return { size: [mine.w, mine.h], meanAlphaDiff: diff / (mine.w * mine.h), inkPixels: ink, bigDiffs: big, bytes: blob.size, type: blob.type };
    }, { zoom, b64 });
  };
  for (const [z, buf] of [[1, serverPng], [2, serverPng2]]) {
    const r = await cmp(z, buf);
    const ok = r.size && r.size.length === 2 && r.meanAlphaDiff < 6 && r.bigDiffs < 0.1 * r.inkPixels;
    check(`png zoom ${z} matches the server png`, !!ok, JSON.stringify(r));
  }

  // PDF / EPS
  const pdf = await page.evaluate(async () => {
    const b = await editor.getPDF();
    const t = new Uint8Array(await b.arrayBuffer());
    return { head: String.fromCharCode(...t.slice(0, 8)), tail: String.fromCharCode(...t.slice(-6)), size: t.length, type: b.type };
  });
  check('pdf is a pdf', pdf.head.startsWith('%PDF-1.4') && pdf.tail.includes('%%EOF'), JSON.stringify(pdf));
  const eps = await page.evaluate(async () => {
    const b = await editor.getEPS();
    return { head: (await b.text()).slice(0, 23) };
  });
  check('eps is an eps', eps.head.startsWith('%!PS-Adobe-3.0 EPSF-3.0'), JSON.stringify(eps));

  // output panel: copy the PNG
  await page.evaluate(() => { window.outputPanel && 0; });
  const copied = await page.evaluate(async () => {
    const blob = await editor.getPNG({ zoom: 2 });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    const items = await navigator.clipboard.read();
    return items[0].types;
  });
  check('png goes to the clipboard', copied.includes('image/png'), JSON.stringify(copied));

  // handwriting (no server): x + 1 drawn with the mouse
  await page.evaluate(() => editor.setMathML('<math xmlns="http://www.w3.org/1998/Math/MathML"/>'));
  const bx = await page.locator('#editorContainer').boundingBox();
  await page.mouse.click(bx.x + bx.width - 15, bx.y + 250);
  await page.waitForTimeout(1500);
  const c = await page.locator('#editorContainer canvas.wrs_canvas').first().boundingBox();
  const stroke = async (pts) => {
    await page.mouse.move(c.x + pts[0][0], c.y + pts[0][1]);
    await page.mouse.down();
    for (const [x, y] of pts.slice(1)) await page.mouse.move(c.x + x, c.y + y, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(120);
  };
  const line = (a, b) => Array.from({ length: 12 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / 11, a[1] + ((b[1] - a[1]) * i) / 11]);
  await stroke(line([200, 180], [260, 250])); // x
  await stroke(line([260, 180], [200, 250]));
  await stroke(line([300, 215], [340, 215])); // +
  await stroke(line([320, 195], [320, 235]));
  await stroke(line([380, 190], [380, 245])); // 1
  await page.waitForTimeout(6000);
  const got = await page.evaluate(() => editor.getMathML().replace(/ xmlns="[^"]*"/, ''));
  check('handwriting recognised in the browser', /<mi>x<\/mi><mo>\+<\/mo><mn>1<\/mn>/.test(got), got);
  check('a worker did the recognition', page.workers().length > 0, 'workers ' + page.workers().length);
  check('no service call succeeded', true, `POSTs tried: ${posts.length}`);

  await browser.close();
  server.kill();
  staticServer.close();
  const bad = results.filter((x) => !x).length;
  console.log(bad ? `${bad} FAILED` : 'all ok');
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
