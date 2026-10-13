const { chromium } = require('playwright');
// our own page is driven in its fixed 725 x 415 form (the coordinates of the tools assume it)
function ourPage(u) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)/.test(u) && !/[?&]layout=/.test(u) ? u + (u.includes('?') ? '&' : '?') + 'layout=classic' : u;
}
async function open(opts = {}) {
  const b = await chromium.launch({ channel: 'chrome', args: process.env.NOLCD ? ['--disable-lcd-text', '--font-render-hinting=none'] : [] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: opts.dsf || 2, hasTouch: !!opts.hasTouch });
  const p = await ctx.newPage();
  await p.addInitScript(() => { const css = '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter,#ot-sdk-btn-floating{display:none !important;pointer-events:none !important}'; const add = () => { const st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st); }; if (document.head) add(); else document.addEventListener('DOMContentLoaded', add); });
  const log = { console: [], net: [], errors: [] };
  p.on('console', m => log.console.push(m.type() + ': ' + m.text().slice(0, 300)));
  p.on('pageerror', e => log.errors.push(String(e).slice(0, 300)));
  p.on('request', r => { if (!/wp-content|wp-includes|googlesyndication|google|onetrust|cookielaw|inclusif/i.test(r.url())) log.net.push(r.method() + ' ' + r.url().slice(0, 200) + (r.postData() ? ' BODY=' + r.postData().slice(0, 200) : '')); });
  await p.goto(ourPage(process.env.URL || 'https://www.wiris.com/en/mathtype/'), { waitUntil: 'load', timeout: 150000 }).catch(e => console.log('goto err', e.message));
  await p.waitForTimeout(3000);
  await p.evaluate(() => { document.querySelectorAll('#onetrust-consent-sdk, #onetrust-banner-sdk, .onetrust-pc-dark-filter').forEach(e => e.remove()); });
  await p.waitForFunction(() => window.editor && typeof editor.getMathML === 'function' && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 60000 });
  // LANGUAGE=ar: replace the editor of the page by one in that language (the reference page and our demo alike)
  if (process.env.LANGUAGE) {
    await p.evaluate((l) => {
      const c = document.getElementById('editorContainer');
      c.innerHTML = '';
      const ed = (window.MathTypeX ? MathTypeX.JsEditor : com.wiris.jsEditor.JsEditor).newInstance({ language: l });
      ed.insertInto(c);
      window.editor = ed;
    }, process.env.LANGUAGE);
    await p.waitForFunction(() => document.querySelector('#editorContainer .wrs_toolbar button'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
  }
  await p.waitForTimeout(800);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  return { b, ctx, p, log };
}
module.exports = { open };
