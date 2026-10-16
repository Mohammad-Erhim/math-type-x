// Screenshots for the README: node tools/readme_shots.js  (server on :8099, e.g. tools/serve.sh start)
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'docs', 'media');
const BASE = process.env.URL || 'http://localhost:8099/';
const N = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const mi = (x) => `<mi>${x}</mi>`;
const zl = (h) => `<mi>&#x${h};</mi>`;

async function open(browser, q, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: 940, height: 580 }, deviceScaleFactor: 2, ...o });
  const p = await ctx.newPage();
  await p.goto(BASE + q, { waitUntil: 'load' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
  await p.waitForTimeout(900);
  return p;
}
const setMml = async (p, mml) => { await p.evaluate((x) => { editor.setMathML(x); if (window.outputPanel) window.outputPanel.onChange(); }, mml); await p.waitForTimeout(1300); };
const hideCaret = (p) => p.addStyleTag({ content: '.wrs_caret{visibility:hidden!important}' });

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });

  // 1. the editor (English): quadratic formula
  let p = await open(b, '?persist=0');
  await setMml(p, `<math ${N}><mi>x</mi><mo>=</mo><mfrac><mrow><mo>-</mo><mi>b</mi><mo>&#xB1;</mo><msqrt><msup><mi>b</mi><mn>2</mn></msup><mo>-</mo><mn>4</mn><mi>a</mi><mi>c</mi></msqrt></mrow><mrow><mn>2</mn><mi>a</mi></mrow></mfrac></math>`);
  await hideCaret(p);
  await p.screenshot({ path: `${OUT}/editor-en.png`, clip: { x: 0, y: 0, width: 940, height: 580 } });
  // 2. a tab of the toolbar (Scripts & layout)
  await p.click('[title="Scripts and layout tab (Alt+6)"]');
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/toolbar-scripts.png`, clip: { x: 0, y: 0, width: 940, height: 215 } });
  await p.close();

  // 3. Arabic editor, right to left, Arabic-Indic digits
  p = await open(b, '?lang=ar&persist=0');
  await setMml(p, `<math dir="rtl" ${N}><mi>&#x635;</mi><mo>=</mo><mfrac><mrow><mo>-</mo><mi>&#x628;</mi><mo>&#xB1;</mo><msqrt><msup><mi>&#x628;</mi><mn>&#x662;</mn></msup><mo>-</mo><mn>&#x664;</mn><mi>&#x623;</mi><mi>&#x62C;</mi></msqrt></mrow><mrow><mn>&#x662;</mn><mi>&#x623;</mi></mrow></mfrac></math>`);
  await hideCaret(p);
  await p.screenshot({ path: `${OUT}/editor-ar.png`, clip: { x: 0, y: 0, width: 940, height: 580 } });

  // 4. the Arabic math letters palette
  await setMml(p, `<math dir="rtl" ${N}/>`);
  await p.click('[title="إدراج أحرف خاصة"]');
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/arabic-letters-palette.png`, clip: { x: 150, y: 0, width: 790, height: 400 } });
  await p.keyboard.press('Escape');
  await p.close();

  // 5. normal Arabic letters and their math letters, and marks above letters
  p = await open(b, '?lang=ar&persist=0');
  const map = [['ا','E152'],['ب','E151'],['ج','E150'],['د','E14F'],['ه','E14E'],['ح','E14D'],['ك','E14C'],['ر','E158'],['س','E190'],['ص','E191'],['ع','E15A'],['م','E136'],['ن','E15B'],['ق','E199'],['و','E164'],['ء','E188']];
  const nb = '<mo>&#xA0;</mo>';
  const row = map.map(([l, s]) => `${mi(l)}${zl(s)}${nb}${nb}`).join('');
  await setMml(p, `<math dir="rtl" ${N}>${row}</math>`);
  await hideCaret(p);
  await p.screenshot({ path: `${OUT}/arabic-math-letters.png`, clip: { x: 342, y: 180, width: 585, height: 38 } });
  const marks = ['E19A', 'E19B', 'E19C'];
  const over = ['E190', 'E152', 'E199', 'E191'].map((l) => marks.map((m) => `<mover>${zl(l)}${zl(m)}</mover>${nb}${nb}`).join('')).join('');
  await setMml(p, `<math dir="rtl" ${N}>${over}</math>`);
  await hideCaret(p);
  await p.screenshot({ path: `${OUT}/arabic-marks.png`, clip: { x: 566, y: 178, width: 361, height: 62 } });
  await p.close();

  // 6. exports: LaTeX / PNG / MathML panel
  p = await open(b, '?persist=0');
  await setMml(p, `<math ${N}><mi>x</mi><mo>=</mo><mfrac><mrow><mo>-</mo><mi>b</mi><mo>&#xB1;</mo><msqrt><msup><mi>b</mi><mn>2</mn></msup><mo>-</mo><mn>4</mn><mi>a</mi><mi>c</mi></msqrt></mrow><mrow><mn>2</mn><mi>a</mi></mrow></mfrac></math>`);
  await hideCaret(p);
  await p.click('#mtx-tab-latex');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/export-latex.png`, clip: { x: 0, y: 0, width: 940, height: 580 } });
  await p.close();

  // 7. a phone
  p = await open(b, '?persist=0', { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await setMml(p, `<math ${N}><mi>x</mi><mo>=</mo><mfrac><mrow><mo>-</mo><mi>b</mi><mo>&#xB1;</mo><msqrt><msup><mi>b</mi><mn>2</mn></msup><mo>-</mo><mn>4</mn><mi>a</mi><mi>c</mi></msqrt></mrow><mrow><mn>2</mn><mi>a</mi></mrow></mfrac></math>`);
  await hideCaret(p);
  await p.screenshot({ path: `${OUT}/phone.png` });
  await p.close();
  await b.close();
})();
