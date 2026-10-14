// does the page fit the window on phones (no page scroll, nothing cut off) for several window sizes?
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const [w, h] of [[390, 844], [360, 640], [412, 732], [844, 390], [320, 568], [390, 500], [390, 380], [390, 300]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(process.env.URL || 'http://localhost:8099/', { waitUntil: 'load' });
    await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const se = document.scrollingElement, page = document.querySelector('.page');
      const pr = page.getBoundingClientRect();
      const exp = document.querySelector('.mtx_exportBar');
      const er = exp && exp.getBoundingClientRect();
      return { inner: innerHeight, vv: Math.round(visualViewport.height), docScroll: se.scrollHeight, bodyScroll: document.body.scrollHeight, pageBottom: Math.round(pr.bottom), exportBarBottom: er && Math.round(er.bottom), canScroll: se.scrollHeight > innerHeight + 1, overflowY: getComputedStyle(document.documentElement).overflowY + '/' + getComputedStyle(document.body).overflowY };
    });
    console.log(`${w}x${h}`.padEnd(9), JSON.stringify(r));
    await ctx.close();
  }
  await b.close();
})();
