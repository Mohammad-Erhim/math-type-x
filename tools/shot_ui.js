// screenshots of the toolbar of our build for tab indexes (default all): evidence/ui/tb_tab{N}.png (725x100 @dsf1)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: Number(process.env.DSF || 1) });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 400)));
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load' });
  await p.waitForTimeout(800);
  const box = await p.locator('#editorContainer').boundingBox();
  const tabs = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (const t of tabs) {
    await p.evaluate((i) => { const els = document.querySelectorAll('#editorContainer .wrs_header > button[role=tab]'); els[i] && els[i].click(); }, t);
    await p.waitForTimeout(150);
    await p.screenshot({ path: `evidence/ui/tb_tab${t}.png`, clip: { x: box.x, y: box.y, width: 725, height: 100 } });
  }
  await b.close();
})();
