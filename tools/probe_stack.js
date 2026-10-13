// compact geometry of the formula display for MathML strings (URL env = reference or ours)
// output per formula: container box and every text / line span relative to the formula origin (container left/top)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const url = process.env.URL || 'http://localhost:8099/?output=0';
  const list = process.env.LIST ? JSON.parse(fs.readFileSync(process.env.LIST, 'utf8')) : process.argv.slice(2);
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 60000 });
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const res = [];
  for (const mml of list) {
    await p.evaluate((m) => editor.setMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${m}</math>`), mml);
    await p.waitForTimeout(Number(process.env.WAIT || 1000));
    const r = await p.evaluate(() => {
      const f = document.querySelector('#editorContainer .wrs_formulaDisplay');
      const fb = f.getBoundingClientRect();
      const out = { boxes: [] };
      const R = (v) => Math.round(v * 100) / 100;
      const all = f.querySelectorAll('span, svg *, div');
      all.forEach((e) => {
        if (e.closest('.wrs_fontContainer') || e.closest('.wrs_metrics') || e.closest('.wrs_focusElementContainer') || e.closest('.wrs_ariaLiveRegion')) return;
        const cl = String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className);
        if (/wrs_caret|wrs_underlineCaret|wrs_inverseCaret|wrs_selection/.test(cl)) return;
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        const txt = e.children.length === 0 ? (e.textContent || '') : '';
        if (txt.trim()) out.boxes.push(['t', txt, R(r.left - fb.left), R(r.top - fb.top), R(r.width), R(r.height), cl.replace(/wrs_notItalic|wrs_notBold|wrs_font_inherit|absolute/g, '').trim().slice(0, 30)]);
        else if (r.width > 0 && r.height > 0 && e.tagName !== 'DIV') {
          const bg = cs.backgroundColor;
          const bt = cs.borderTopWidth !== '0px' ? 'T' + cs.borderTopWidth + cs.borderTopColor : '';
          const bb = cs.borderBottomWidth !== '0px' ? 'B' + cs.borderBottomWidth + cs.borderBottomColor : '';
          const bl = cs.borderLeftWidth !== '0px' ? 'L' + cs.borderLeftWidth : '';
          const br = cs.borderRightWidth !== '0px' ? 'R' + cs.borderRightWidth : '';
          out.boxes.push(['r', bg === 'rgba(0, 0, 0, 0)' ? '' : bg, R(r.left - fb.left), R(r.top - fb.top), R(r.width), R(r.height), bt + bb + bl + br + ' ' + cl.slice(0, 20)]);
        }
      });
      return out;
    });
    res.push({ mml, ...r });
  }
  fs.writeFileSync(process.env.OUT || '/tmp/stack_out.json', JSON.stringify(res));
  await b.close();
})();
