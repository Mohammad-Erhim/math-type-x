// DOM of the formula display for a MathML (URL env: reference or ours): element tags, boxes and styles of the drawn parts
const { chromium } = require('playwright');
(async () => {
  const mmls = process.argv.slice(2);
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'https://www.wiris.com/en/mathtype/', { waitUntil: 'load', timeout: 150000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  for (const mml of mmls) {
  await p.evaluate((m) => editor.setMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${m}</math>`), mml);
  await p.waitForTimeout(1500);
  console.log('## ' + mml);
  const out = await p.evaluate(() => {
    const c = document.querySelector('#editorContainer').getBoundingClientRect();
    const f = document.querySelector('#editorContainer .wrs_formulaDisplay') || document.querySelector('#editorContainer');
    const res = [];
    f.querySelectorAll('*').forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const cs = getComputedStyle(e);
      res.push([e.tagName, String(e.className).slice(0, 30), Math.round((r.left - c.left) * 10) / 10, Math.round((r.top - c.top) * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10, Array.from(e.textContent || '').slice(0, 6).map((ch) => ch.codePointAt(0).toString(16)).join(','), e.tagName === 'DIV' || e.tagName === 'SPAN' ? cs.backgroundImage.slice(0, 50) + ' ' + cs.fontFamily.slice(0, 20) + ' ' + cs.fontSize : '']);
    });
    return res.filter((x) => x[3] > 100 && x[3] < 330);
  });
  console.log(out.map((x) => x.join(' | ')).join('\n'));
  }
  await b.close();
})();
