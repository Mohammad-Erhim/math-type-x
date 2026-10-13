const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', (m) => logs.push(m.type() + ': ' + m.text().slice(0, 300)));
  p.on('pageerror', (e) => logs.push('PAGEERROR ' + String(e).slice(0, 500)));
  p.on('requestfailed', (r) => logs.push('REQFAIL ' + r.url()));
  await p.goto(process.env.URL || 'http://localhost:8099/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: process.argv[2] || 'evidence/ui/smoke.png' });
  console.log(logs.join('\n') || 'no console output');
  console.log(await p.evaluate(() => typeof editor + ' ' + (editor && editor.getMathML && editor.getMathML())));
  await b.close();
})();
