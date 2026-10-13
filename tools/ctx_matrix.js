// Contextual-tab differential. Modes (MODE env):
//   discover  : for every formula, walk the caret Home → End and record the controls of the contextual tab at every stop
//   effects   : for every distinct (formula, stop) with controls, click each control (every option of a select) and record
//               the resulting MathML and the controls afterwards
//   select    : like discover, but extends a selection with Shift+ArrowRight from the start of the formula
// URL env: reference (default) or our app.  usage: MODE=discover OUT=file.json [ONLY=a,b] node tools/ctx_matrix.js
const fs = require('fs');
const { chromium } = require('playwright');
const cases = process.env.CASES ? JSON.parse(fs.readFileSync(process.env.CASES, 'utf8')) : require('./ctx_cases').cases;
const MODE = process.env.MODE || 'discover';
const URL = process.env.URL || 'https://www.wiris.com/en/mathtype/';
const OUT = process.env.OUT || `/tmp/ctx_${MODE}.json`;
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const WAIT = +(process.env.WAIT || (URL.includes('wiris.com') ? 700 : 250));

const SIG = () => {
  const cont = document.querySelector('#editorContainer');
  const out = [];
  for (const e of cont.querySelectorAll('.wrs_toolbar *')) {
    if (e.closest('.wrs_header') || !/^(BUTTON|SELECT|INPUT)$/.test(e.tagName)) continue;
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (e.tagName === 'SELECT') out.push({ k: 's', t: e.title, v: e.value, o: [...e.options].map((o) => o.value) });
    else if (e.tagName === 'INPUT') out.push({ k: 'i', t: e.title || e.name || e.className, v: e.value });
    else out.push({ k: 'b', t: e.title, on: /wrs_toggled/.test(e.className), dis: e.disabled || /wrs_disabled/.test(e.className), len: /wrs_lengthButton/.test(e.className) });
  }
  return out;
};

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)));
  await p.goto(URL, { waitUntil: 'load', timeout: 150000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
  const TABS = JSON.parse(fs.readFileSync(__dirname + '/toolbar_tabs.json', 'utf8'));
  /** insertion through the toolbar: ['<button title>', 'type:abc', 'key:ArrowLeft', …] */
  const runFlow = async (flow) => {
    const bx = await p.locator('#editorContainer').boundingBox();
    await p.mouse.click(bx.x + 600, bx.y + 330);
    await p.waitForTimeout(150);
    for (const st of flow) {
      if (st.startsWith('type:')) { await p.keyboard.type(st.slice(5), { delay: 40 }); await p.waitForTimeout(150); continue; }
      if (st.startsWith('key:')) { await p.keyboard.press(st.slice(4)); await p.waitForTimeout(150); continue; }
      const tab = TABS[st];
      if (tab === undefined) throw new Error('no tab for ' + st);
      await p.locator('#editorContainer .wrs_header button').nth(tab).click();
      await p.waitForTimeout(150);
      await p.locator(`#editorContainer .wrs_toolbar button[title="${st}"]:visible`).first().click({ timeout: 4000 });
      await p.waitForTimeout(250);
    }
  };
  const open = async (c) => {
    await p.keyboard.press('Escape').catch(() => {});
    await p.evaluate((m) => editor.setMathML(m), `<math ${NS}>${c.flow ? '' : c.mml}</math>`);
    await p.waitForTimeout(WAIT + 300);
    if (c.flow) await runFlow(c.flow);
    await p.locator('#editorContainer .wrs_header button').nth(9).click();
    await p.waitForTimeout(250);
    const bx = await p.locator('#editorContainer').boundingBox();
    await p.mouse.click(bx.x + 600, bx.y + 330);
    await p.waitForTimeout(150);
    await p.keyboard.press('Home');
    await p.waitForTimeout(150);
    for (let j = 0; j < (c.start || 0); j++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(WAIT / 2); }
  };
  const key = async (k) => { await p.keyboard.press(k); await p.waitForTimeout(WAIT / 2); };
  const result = {};
  const list = cases.filter((c) => !only || only.includes(c.name));
  for (const c of list) {
    const rec = { mml: c.mml, flow: c.flow, stops: [] };
    result[c.name] = rec;
    try {
      await open(c);
      const max = c.steps ?? 14;
      let prev = null;
      for (let i = 0; i <= max; i++) {
        const sig = await p.evaluate(SIG);
        const mml = await p.evaluate(() => editor.getMathML());
        const caret = await p.evaluate(() => {
          const c = document.querySelector('#editorContainer').getBoundingClientRect();
          return [...document.querySelectorAll('#editorContainer .wrs_caret, #editorContainer .wrs_underlineCaret')].map((e) => e.getBoundingClientRect()).filter((r) => r.width + r.height > 0).map((r) => [Math.round(r.left - c.left), Math.round(r.top - c.top), Math.round(r.width), Math.round(r.height)]);
        });
        const st = { i, sig, caret, mml: i === 0 ? mml.replace(/ xmlns="[^"]*"/, '') : undefined };
        const sigKey = JSON.stringify(sig.map((c) => [c.t, c.v]));
        rec.seen ??= new Set();
        const fresh = process.env.NODEDUPE ? true : !rec.seen.has(sigKey);
        rec.seen.add(sigKey);
        if (MODE === 'effects' && sig.length && fresh) {
          st.fx = {};
          for (const ctl of sig) {
            if (ctl.k === 'i' || ctl.len) continue;
            const opts = ctl.k === 's' ? ctl.o.filter((o) => o !== ctl.v).slice(0, 5) : [null];
            for (const o of opts) {
              await open(c);
              for (let j = 0; j < i; j++) await key(MODE === 'select' ? 'Shift+ArrowRight' : 'ArrowRight');
              const label = ctl.t + (o !== null ? '=' + o : '');
              try {
                if (ctl.k === 's') await p.locator(`#editorContainer select[title="${ctl.t}"]:visible`).first().selectOption(o, { timeout: 4000 });
                else await p.locator(`#editorContainer .wrs_toolbar button[title="${ctl.t}"]:visible`).first().click({ timeout: 4000 });
                await p.waitForTimeout(WAIT);
                st.fx[label] = { mml: await p.evaluate(() => editor.getMathML()).then((m) => m.replace(/ xmlns="[^"]*"/, '')), sig: await p.evaluate(SIG) };
              } catch (e) { st.fx[label] = { err: String(e).slice(0, 80) }; }
              await p.keyboard.press('Escape').catch(() => {});
            }
          }
          await open(c);
          for (let j = 0; j < i; j++) await key(MODE === 'select' ? 'Shift+ArrowRight' : 'ArrowRight');
        }
        rec.stops.push(st);
        const before = JSON.stringify(caret);
        if (before === prev && i > 1 && MODE !== 'select') break;
        await key(MODE === 'select' ? 'Shift+ArrowRight' : 'ArrowRight');
        prev = before;
      }
    } catch (e) { rec.err = String(e).slice(0, 200); }
    delete rec.seen;
    console.log(c.name, rec.stops.length, rec.err || '');
    fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  }
  await b.close();
})();
