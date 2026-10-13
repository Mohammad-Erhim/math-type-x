// DOM geometry of the contextual tab for several (formula, caret) pairs, in the format of evidence/ref_ctx_dump.json
// (consumed by tools/gen/ctx_layout.py). usage: CASES=file.json OUT=file.json node tools/ctx_dump2.js   cases: [{name, mml, k, sel}] (k caret steps from the start, sel = Shift+ArrowRight count)
const fs = require('fs');
const { chromium } = require('playwright');
const cases = JSON.parse(fs.readFileSync(process.env.CASES, 'utf8'));
const URL = process.env.URL || 'https://www.wiris.com/en/mathtype/';
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
  await p.goto(URL, { waitUntil: 'load', timeout: 150000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const steps = [];
  for (const c of cases) {
    await p.evaluate((m) => editor.setMathML(m), `<math xmlns="http://www.w3.org/1998/Math/MathML">${c.mml}</math>`);
    await p.waitForTimeout(1000);
    await p.locator('#editorContainer .wrs_header button').nth(9).click();
    await p.waitForTimeout(300);
    const bx = await p.locator('#editorContainer').boundingBox();
    await p.mouse.click(bx.x + 600, bx.y + 330);
    await p.waitForTimeout(200);
    await p.keyboard.press('Home');
    for (let i = 0; i < (c.k || 0); i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150); }
    for (let i = 0; i < (c.sel || 0); i++) { await p.keyboard.press('Shift+ArrowRight'); await p.waitForTimeout(150); }
    await p.waitForTimeout(600);
    const extra = await p.evaluate(() => {
      const cont = document.querySelector('#editorContainer');
      const cb = cont.getBoundingClientRect();
      const out = [];
      const panel = cont.querySelector('.wrs_panelContainer .wrs_multipleRowPanel.wrs_selected') || cont.querySelector('.wrs_panelContainer');
      const walk = (el, depth) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        out.push({ d: depth, tag: el.tagName, cls: String(el.className).slice(0, 100), title: el.title || el.getAttribute('aria-label') || '', rect: [r.x - cb.x, r.y - cb.y, r.width, r.height].map((v) => Math.round(v * 100) / 100), bg: cs.backgroundImage.slice(0, 160), bgpos: cs.backgroundPosition, bgsize: cs.backgroundSize, bgcolor: cs.backgroundColor, border: cs.border, radius: cs.borderRadius, opacity: cs.opacity, text: (el.tagName === 'SELECT' ? el.value : (el.children.length ? '' : el.textContent || '')).slice(0, 24), opts: el.tagName === 'SELECT' ? [...el.options].map((o) => [o.value, o.text]) : undefined, disabled: el.disabled || el.getAttribute('aria-disabled'), src: el.tagName === 'IMG' ? el.src.slice(-100) : undefined, style: el.getAttribute('style') });
        for (const ch of el.children) walk(ch, depth + 1);
      };
      walk(panel, 0);
      return out;
    });
    steps.push({ desc: c.name, extra });
    console.log(c.name, extra.length);
  }
  fs.writeFileSync(process.env.OUT, JSON.stringify({ name: 'ctx_dump2', steps }));
  await b.close();
})();
