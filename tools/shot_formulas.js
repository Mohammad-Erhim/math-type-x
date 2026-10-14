// renders a set of formulas in the formula display (URL env: reference or our build) → outdir/NN.png (display area, 2x)
const { chromium } = require('playwright');
const fs = require('fs');
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
let F = [
  '<mfrac><mi>x</mi><mn>2</mn></mfrac><mo>+</mo><msqrt><mi>y</mi></msqrt>',
  '<msup><mi>a</mi><mn>2</mn></msup><mo>+</mo><msub><mi>b</mi><mn>1</mn></msub><mo>=</mo><msubsup><mi>c</mi><mi>i</mi><mn>2</mn></msubsup>',
  '<mfenced><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd></mtr><mtr><mtd><mn>3</mn></mtd><mtd><mn>4</mn></mtd></mtr></mtable></mfenced>',
  '<munderover><mo>&#x2211;</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover><msup><mi>i</mi><mn>2</mn></msup>',
  '<msubsup><mo>&#x222B;</mo><mn>0</mn><mn>1</mn></msubsup><mi>x</mi><mi>dx</mi><mo>=</mo><mfrac><mn>1</mn><mn>2</mn></mfrac>',
  '<mroot><mi>x</mi><mn>3</mn></mroot><mo>&#xB1;</mo><mi>&#x3B1;</mi><mo>&#x2264;</mo><mi>&#x3C0;</mi>',
  '<mover><mi>x</mi><mo>&#xAF;</mo></mover><mo>+</mo><mover><mi>v</mi><mo>&#x2192;</mo></mover><mo>=</mo><mi>sin</mi><mfenced><mi>x</mi></mfenced>',
  '<mfrac><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow><mrow><mi>c</mi><mo>-</mo><mi>d</mi></mrow></mfrac><mspace linebreak="newline"/><mn>12</mn><mo>+</mo><mn>345</mn>',
  '<mi>sin</mi><mfenced><mi>x</mi></mfenced><mo>=</mo><mfenced open="[" close="]"><mfrac><mn>1</mn><mn>2</mn></mfrac></mfenced>',
  '<mfenced open="{" close=""><mtable><mtr><mtd><mi>x</mi></mtd></mtr><mtr><mtd><mi>y</mi></mtd></mtr><mtr><mtd><mi>z</mi></mtd></mtr></mtable></mfenced>',
  '<mfenced open="|" close="|"><mfrac><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow><mi>c</mi></mfrac></mfenced><mo>=</mo><mfenced><mfrac><mn>1</mn><mn>2</mn></mfrac></mfenced>',
  '<mfenced open="[" close="]"><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd></mtr><mtr><mtd><mn>3</mn></mtd><mtd><mn>4</mn></mtd></mtr><mtr><mtd><mn>5</mn></mtd><mtd><mn>6</mn></mtd></mtr></mtable></mfenced>',
];
if (process.env.FORMULAS) F = JSON.parse(fs.readFileSync(process.env.FORMULAS, 'utf8'));
(async () => {
  const out = process.argv[2];
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })).newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important} .wrs_caret,.wrs_underlineCaret,.wrs_inverseCaret{visibility:hidden !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 60000 });
  if (process.env.LANGUAGE) {
    await p.evaluate((l) => {
      const c = document.getElementById('editorContainer');
      c.innerHTML = '';
      const ed = com.wiris.jsEditor.JsEditor.newInstance({ language: l });
      ed.insertInto(c);
      window.editor = ed;
    }, process.env.LANGUAGE);
    await p.waitForFunction(() => document.querySelector('#editorContainer .wrs_toolbar button'), null, { timeout: 30000 });
  }
  await p.waitForTimeout(1500);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  for (let i = 0; i < F.length; i++) {
    await p.evaluate((m) => editor.setMathML(m), F[i].startsWith('@rtl') ? `<math dir="rtl" ${NS}>${F[i].slice(4)}</math>` : `<math ${NS}>${F[i]}</math>`);
    await p.waitForTimeout(Number(process.env.WAIT || 1200));
    await p.mouse.click(1, 1);
    const bx = await p.locator('#editorContainer').boundingBox();
    const leaves = await p.evaluate(() => {
      const c = document.querySelector('#editorContainer');
      const cb = c.getBoundingClientRect();
      const f = c.querySelector('.wrs_formulaDisplay') || c;
      const out = [];
      f.querySelectorAll('span,text').forEach((e) => {
        if (e.tagName !== 'text' && e.children.length) return;
        if (!(e.textContent || '').trim()) return;
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.top - cb.top > 90) out.push([e.textContent.slice(0, 3), +(r.left - cb.left).toFixed(2), +(r.top - cb.top - 100).toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2)]);
      });
      return out;
    });
    fs.writeFileSync(`${out}/${String(i).padStart(2, '0')}.json`, JSON.stringify({ cb: bx, leaves }));
    await p.screenshot({ path: `${out}/${String(i).padStart(2, '0')}.png`, clip: { x: process.env.CLIPRIGHT ? bx.x + bx.width - Number(process.env.CLIPW || 300) : bx.x, y: bx.y + 100, width: Number(process.env.CLIPW || 300), height: 110 } });
  }
  await b.close();
})();
