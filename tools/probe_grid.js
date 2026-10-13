// click grid over formulas: where does a click inside a structure put the caret? (URL env = reference or ours)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
  const cases = {
    frac: '<mfrac><mrow><mi>a</mi><mn>1</mn></mrow><mi>b</mi></mfrac>',
    fracIn: '<mi>x</mi><mo>+</mo><mfrac><mi>a</mi><mrow><mi>b</mi><mi>c</mi><mi>d</mi></mrow></mfrac><mo>+</mo><mi>y</mi>',
    sqrt: '<msqrt><mi>a</mi><mo>+</mo><mi>b</mi></msqrt>',
    sup: '<msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mi>y</mi>',
    under: '<munder><mrow><mi>a</mi><mi>b</mi><mi>c</mi></mrow><mi>d</mi></munder>',
    sum: '<munderover><mo>&#x2211;</mo><mrow><mi>i</mi></mrow><mi>n</mi></munderover><mi>a</mi>',
    fence: '<mfenced><mfrac><mi>a</mi><mi>b</mi></mfrac></mfenced>',
    stack: '<mstack><mn>123</mn><msrow><mo>+</mo><mn>45</mn></msrow><msline/><mn>168</mn></mstack>',
    ldiv: '<mlongdiv charalign="center" charspacing="0px" stackalign="left"><mn>3</mn><mn>12</mn><msgroup><msrow><mn>36</mn></msrow><msrow><mn>0</mn></msrow></msgroup></mlongdiv>',
    table: '<mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>bbb</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable>',
  };
  const only = (process.env.CASES || Object.keys(cases).join(',')).split(',');
  const out = {};
  const bx = await p.locator('#editorContainer').boundingBox();
  for (const k of only) {
    const rows = [];
    const legend = new Map();
    const grid = {};
    for (let y = Number(process.env.Y0 || 96); y <= Number(process.env.Y1 || 176); y += 8) {
      let line = '';
      for (let x = 4; x <= Number(process.env.X1 || 100); x += 8) {
        await p.evaluate((m) => editor.setMathML(m), `<math ${NS}>${cases[k]}</math>`);
        await p.waitForTimeout(Number(process.env.W1 || 150));
        const bb = await p.locator('#editorContainer').boundingBox();
        await p.mouse.click(bb.x + x, bb.y + y);
        await p.keyboard.type("Z"); await p.waitForTimeout(Number(process.env.W2 || 150));
        const m = await p.evaluate(() => editor.getMathML());
        const norm = m.replace(/ xmlns="[^"]+"/, '').replace(/<\/?(math|mrow)>/g, '').replace(/<(mi|mn|mo)>([^<]*)<\/\1>/g, '$2');
        if (!legend.has(norm)) legend.set(norm, String.fromCharCode(97 + legend.size));
        line += legend.get(norm);
        (grid[y] ??= []).push(norm);
      }
      rows.push(`${String(y).padStart(3)} ${line}`);
    }
    out[k] = rows;
    if (process.env.JSON) require('fs').appendFileSync(process.env.JSON, JSON.stringify({ case: k, grid }) + '\n');
    console.log('== ' + k + '\n' + rows.join('\n') + '\n' + [...legend].map(([a, b]) => b + ' ' + a).join('\n'));
  }
  await b.close();
})();
