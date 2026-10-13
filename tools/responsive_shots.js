// screenshots of the page at several screen sizes (URL env: default our build); touch devices are emulated for phones
const { chromium, devices } = require('playwright');
const OUT = process.env.OUT || '.cache/resp';
require('fs').mkdirSync(OUT, { recursive: true });
const SIZES = [
  ['desktop', { viewport: { width: 1920, height: 1080 } }],
  ['laptop', { viewport: { width: 1280, height: 720 } }],
  ['tablet-portrait', { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['tablet-narrow', { viewport: { width: 600, height: 900 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 }],
  ['phone-small', { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['phone-landscape', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 }],
];
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const [name, opt] of SIZES) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(name)) continue;
    const ctx = await b.newContext(opt);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log(name, 'PAGEERROR', String(e).slice(0, 200)));
    await p.goto(process.env.URL || 'http://localhost:8099/?output=1', { waitUntil: 'load' });
    await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
    await p.evaluate(() => editor.setMathML('<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mi>a</mi><mo>+</mo><mn>1</mn></mrow><msqrt><mi>x</mi></msqrt></mfrac><mo>=</mo><msup><mi>y</mi><mn>2</mn></msup></math>'));
    await p.waitForTimeout(800);
    const info = await p.evaluate(() => {
      const r = document.querySelector('.wrs_editor').getBoundingClientRect();
      return { layout: editor.getLayout(), editor: [r.width, r.height], scrollW: document.documentElement.scrollWidth, innerW: innerWidth };
    });
    console.log(name, JSON.stringify(info));
    await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    await ctx.close();
  }
  await b.close();
})();
