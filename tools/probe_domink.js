const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })).newPage();
  await p.goto(process.env.URL, { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important} .wrs_caret,.wrs_underlineCaret,.wrs_inverseCaret{visibility:hidden !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  await p.evaluate((m) => editor.setMathML(m), process.env.MML);
  await p.waitForTimeout(1500);
  const f = await p.evaluate(() => { const d = document.querySelector('#editorContainer .wrs_formulaDisplay').getBoundingClientRect(); const out = []; document.querySelectorAll('#editorContainer .wrs_formulaDisplay span').forEach((e) => { if (e.children.length || !e.textContent.trim() || e.closest('.wrs_fontContainer') || e.closest('.wrs_metrics')) return; const r = e.getBoundingClientRect(); out.push([e.textContent, r.left - d.left, r.top - d.top, r.width, r.height]); }); return { d: [d.left, d.top], out }; });
  console.log(JSON.stringify(f.out));
  await p.screenshot({ path: process.env.OUTP, clip: { x: f.d[0], y: f.d[1], width: 120, height: 120 } });
  await b.close();
})();
