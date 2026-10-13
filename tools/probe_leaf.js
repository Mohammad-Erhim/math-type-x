// lists the leaf boxes of the formula display for a MathML (URL env: reference or our build) – positions relative to #editorContainer
const { chromium } = require('playwright');
(async () => {
  const url = process.env.URL || 'http://localhost:8099/?output=0';
  const mmls = process.argv.slice(2);
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 60000 });
  for (const mml of mmls) {
  await p.evaluate((m) => editor.setMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${m}</math>`), mml);
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const c = document.querySelector('#editorContainer');
    const cb = c.getBoundingClientRect();
    const f = c.querySelector('.wrs_formulaDisplay') || c;
    const out = [];
    f.querySelectorAll('span,text,div').forEach((e) => {
      if (e.tagName !== 'text' && e.children.length) return;
      if (!(e.textContent || '').trim()) return;
      const r = e.getBoundingClientRect();
      if (r.width > 0 && r.top - cb.top > 90 && r.top - cb.top < 320) out.push([e.tagName, e.textContent.slice(0, 3), Math.round((r.left - cb.left) * 10) / 10, Math.round((r.top - cb.top) * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]);
    });
    return out;
  });
  console.log('## ' + mml);
  console.log(r.map((x) => x.join(' ')).join('\n'));
  }
  await b.close();
})();
