// Contextual-tab visual audit of OUR build: for every case × caret stop (or selection extent) every control is applied
// (every option of a select) and the editor is captured before / after.  usage:
//   MODE=discover|select OUT=.cache/audit ONLY=a,b CASES=file.json node tools/ctx_audit.js
// writes OUT/<case>/<stop>/{before.png,NN_<label>.png,info.json}
const fs = require('fs');
const { chromium } = require('playwright');
const cases = process.env.CASES ? JSON.parse(fs.readFileSync(process.env.CASES, 'utf8')) : require('./ctx_cases').cases;
const MODE = process.env.MODE || 'discover';
const URL = process.env.URL || (process.env.REF ? 'https://www.wiris.com/en/mathtype/' : 'http://localhost:8099/?output=0&layout=classic');
const OUT = process.env.OUT || '.cache/audit';
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const REF = URL.includes('wiris.com');
const WAIT = +(process.env.WAIT || (REF ? 700 : 250));
const CX = REF ? 600 : 400;
const CY = REF ? 330 : 250;
const MAXSTOPS = +(process.env.STEPS || 14);
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';

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
const slug = (s) => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: URL.includes('wiris.com') ? { width: 1920, height: 1080 } : { width: 760, height: 450 }, deviceScaleFactor: 1 })).newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)));
  await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
  if (REF) await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(REF ? 2500 : 800);
  if (REF) await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  else await p.addStyleTag({ content: 'body{margin:0}' });
  const selTab = () => p.evaluate(() => (typeof editor.selectTab === 'function' ? editor.selectTab(9) : document.querySelectorAll('#editorContainer .wrs_header button')[9].click()));
  const TABS = JSON.parse(fs.readFileSync(__dirname + '/toolbar_tabs.json', 'utf8'));
  const box = await p.locator('#editorContainer').boundingBox();
  const clip = { x: box.x, y: box.y, width: Math.min(725, box.width), height: Math.min(415, box.height) };
  const caretCss = (hide) => p.evaluate((h) => {
    let s = document.getElementById('__hc');
    if (!s) { s = document.createElement('style'); s.id = '__hc'; document.head.appendChild(s); }
    s.textContent = h ? '.wrs_caret,.wrs_underlineCaret,.wrs_handle{visibility:hidden !important}' : '';
  }, hide);
  const shot = async (path, hide) => { await caretCss(hide); await p.screenshot({ path, clip }); await caretCss(false); };

  const runFlow = async (flow) => {
    await p.mouse.click(box.x + CX, box.y + CY);
    for (const st of flow) {
      if (st.startsWith('type:')) { await p.keyboard.type(st.slice(5), { delay: 40 }); continue; }
      if (st.startsWith('key:')) { await p.keyboard.press(st.slice(4)); continue; }
      const tab = TABS[st];
      if (tab === undefined) throw new Error('no tab for ' + st);
      await p.locator('#editorContainer .wrs_header button').nth(tab).click();
      await p.locator(`#editorContainer .wrs_toolbar button[title="${st}"]:visible`).first().click({ timeout: 4000 });
      await p.waitForTimeout(150);
    }
  };
  const open = async (c) => {
    await p.keyboard.press('Escape').catch(() => {});
    await p.evaluate((m) => editor.setMathML(m), `<math ${NS}>${c.flow ? '' : c.mml}</math>`);
    await p.waitForTimeout(WAIT + (REF ? 300 : 0));
    if (c.flow) await runFlow(c.flow);
    await selTab();
    await p.mouse.click(box.x + CX, box.y + CY);
    await p.keyboard.press('Home');
    await p.waitForTimeout(100);
    for (let j = 0; j < (c.start || 0); j++) await p.keyboard.press('ArrowRight');
  };
  const goStop = async (c, i) => {
    await open(c);
    for (let j = 0; j < i; j++) await p.keyboard.press(MODE === 'select' ? 'Shift+ArrowRight' : 'ArrowRight');
    await p.waitForTimeout(WAIT);
  };
  fs.mkdirSync(OUT, { recursive: true });
  const list = cases.filter((c) => !only || only.includes(c.name));
  for (const c of list) {
    const seen = new Set();
    let prevCaret = null;
    const dir0 = `${OUT}/${c.name}`;
    fs.rmSync(dir0, { recursive: true, force: true });
    fs.mkdirSync(dir0, { recursive: true });
    let nOps = 0;
    try {
      await goStop(c, 0);
      for (let i = 0; i <= (c.steps ?? MAXSTOPS); i++) {
        const sig = await p.evaluate(SIG);
        const caret = await p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_caret, #editorContainer .wrs_underlineCaret')].map((e) => e.getBoundingClientRect()).filter((r) => r.width + r.height > 0).map((r) => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]));
        const mmlBefore = (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]*"/, '');
        const key = JSON.stringify(sig.map((x) => [x.t, x.v, x.on, x.dis])) + JSON.stringify(caret.length ? 0 : 1);
        const ckey = JSON.stringify(caret);
        if (i > 1 && ckey === prevCaret && MODE !== 'select') break;
        prevCaret = ckey;
        if (!seen.has(key) || MODE === 'select') {
          seen.add(key);
          const dir = `${dir0}/s${String(i).padStart(2, '0')}`;
          fs.mkdirSync(dir, { recursive: true });
          await shot(`${dir}/before.png`, false);
          await shot(`${dir}/before_h.png`, true);
          const ops = [];
          for (const ctl of sig) {
            if (ctl.k === 'i') continue;
            const opts = ctl.k === 's' ? ctl.o.filter((o) => o !== ctl.v).slice(0, 6) : [null];
            for (const o of opts) {
              await goStop(c, i);
              const label = ctl.t + (o !== null ? '=' + o : '');
              const op = { label, kind: ctl.k, len: !!ctl.len, dis: !!ctl.dis, on: ctl.on, from: ctl.v };
              try {
                if (ctl.k === 's') await p.locator(`#editorContainer select[title="${ctl.t}"]:visible`).first().selectOption(o, { timeout: 4000 });
                else await p.locator(`#editorContainer .wrs_toolbar button[title="${ctl.t}"]:visible`).first().click({ timeout: 4000 });
                await p.waitForTimeout(WAIT);
                op.mml = (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]*"/, '');
                op.sig = await p.evaluate(SIG);
                const f = `${dir}/${String(ops.length).padStart(2, '0')}_${slug(label)}`;
                await shot(`${f}.png`, false);
                await shot(`${f}_h.png`, true);
                op.file = f.split('/').pop();
              } catch (e) { op.err = String(e).slice(0, 100); }
              ops.push(op);
              nOps++;
              await p.keyboard.press('Escape').catch(() => {});
            }
          }
          fs.writeFileSync(`${dir}/info.json`, JSON.stringify({ case: c.name, stop: i, mml: mmlBefore, sig, caret, ops }, null, 1));
          await goStop(c, i);
        }
        await p.keyboard.press(MODE === 'select' ? 'Shift+ArrowRight' : 'ArrowRight');
        await p.waitForTimeout(WAIT / 2);
      }
    } catch (e) { console.log(c.name, 'ERR', String(e).slice(0, 200)); }
    console.log(c.name, 'stops', fs.readdirSync(dir0).length, 'ops', nOps);
  }
  await b.close();
})();
