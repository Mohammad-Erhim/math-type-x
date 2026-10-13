// dumps the contextual tab of the reference (geometry + styles of every control) for one context
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const key = process.argv[2] || 'matrix';
  const left = Number(process.argv[3] ?? 2);
  const { contexts } = require('./lib_ctx');
  const c = contexts.find((x) => x.key === key);
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
  await p.goto(process.env.URL || 'https://www.wiris.com/en/mathtype/', { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 60000 });
  const rp = p.waitForResponse((r) => /mathml2internal/.test(r.url()), { timeout: 8000 }).catch(() => null);
  await p.evaluate((m) => editor.setMathML(m), c.mml);
  await rp; await p.waitForTimeout(800);
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.mouse.click(bx.x + 600, bx.y + 330);
  await p.waitForTimeout(300);
  for (let i = 0; i < left; i++) await p.keyboard.press('ArrowLeft');
  await p.locator('#editorContainer .wrs_header button').nth(9).click();
  await p.waitForTimeout(600);
  const dump = await p.evaluate(() => {
    const cont = document.querySelector('#editorContainer');
    const cb = cont.getBoundingClientRect();
    const panel = cont.querySelector('.wrs_toolbar .wrs_contextPanel, .wrs_toolbar') || cont;
    const out = [];
    const walk = (el, depth) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const cs = getComputedStyle(el);
      const tag = el.tagName;
      if (depth > 0 && (['BUTTON', 'SELECT', 'INPUT', 'LABEL', 'SPAN'].includes(tag) || /wrs_/.test(String(el.className)))) {
        out.push({ d: depth, tag, cls: String(el.className).slice(0, 80), title: el.title || el.getAttribute('aria-label') || '', rect: [r.x - cb.x, r.y - cb.y, r.width, r.height].map((v) => Math.round(v * 10) / 10), bg: cs.backgroundImage.slice(0, 120), bgpos: cs.backgroundPosition, bgsize: cs.backgroundSize, bgcolor: cs.backgroundColor, border: cs.border, radius: cs.borderRadius, opacity: cs.opacity, text: (el.textContent || '').slice(0, 20), disabled: el.disabled || el.getAttribute('aria-disabled') });
      }
      for (const ch of el.children) walk(ch, depth + 1);
    };
    const tb = cont.querySelector('.wrs_toolbar');
    walk(tb, 0);
    return out;
  });
  fs.writeFileSync(`/tmp/ctx_${key}_${left}.json`, JSON.stringify(dump, null, 1));
  console.log(key, dump.length);
  await b.close();
})();
