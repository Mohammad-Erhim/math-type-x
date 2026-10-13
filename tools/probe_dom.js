// all visible elements of the formula display for a MathML (URL env = reference): tag, class, box, border/background
const { chromium } = require('playwright');
(async () => {
  const url = process.env.URL || 'http://localhost:8099/?output=0';
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 60000 });
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  for (const mml of process.argv.slice(2)) {
    await p.evaluate((m) => editor.setMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${m}</math>`), mml);
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const c = document.querySelector('#editorContainer');
      const cb = c.getBoundingClientRect();
      const f = c.querySelector('.wrs_formulaDisplay');
      const out = [];
      const walk = (e, d) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        const bd = ['Top', 'Right', 'Bottom', 'Left'].map((s) => cs['border' + s + 'Width'] + ' ' + cs['border' + s + 'Style'] + ' ' + cs['border' + s + 'Color']).filter((x) => !/^0px /.test(x));
        out.push(`${'  '.repeat(d)}${e.tagName.toLowerCase()}.${String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).slice(0, 40)} [${Math.round((r.left - cb.left) * 100) / 100},${Math.round((r.top - cb.top) * 100) / 100} ${Math.round(r.width * 100) / 100}x${Math.round(r.height * 100) / 100}] ${(e.children.length ? '' : (e.textContent || '').slice(0, 6))} ${bd.join('|')} ${cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? 'bg=' + cs.backgroundColor : ''} ${cs.position !== 'static' ? cs.position : ''}`);
        for (const k of e.children) walk(k, d + 1);
      };
      if (f) walk(f, 0);
      return out;
    });
    console.log('## ' + mml);
    console.log(r.slice(0, Number(process.env.MAXN || 80)).join('\n'));
  }
  await b.close();
})();
