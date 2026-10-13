const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto('https://www.wiris.com/en/mathtype/', { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const ss of document.styleSheets) {
      let rules; try { rules = ss.cssRules; } catch (e) { continue; }
      for (const rule of rules) {
        const t = rule.cssText || '';
        if (/wrs_/.test(t) && /url\(/.test(t)) { const m = t.match(/url\([^)]*\)/g); out[rule.selectorText || t.slice(0, 40)] = (out[rule.selectorText] || []).concat(m); }
      }
    }
    return out;
  });
  const urls = new Set();
  Object.entries(r).forEach(([k, v]) => v.forEach((u) => urls.add(u)));
  console.log(JSON.stringify(r, null, 1).slice(0, 6000));
  console.log([...urls].join('\n'));
  await b.close();
})();
