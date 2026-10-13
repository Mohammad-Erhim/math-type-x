// usage: node behav.js <tabIndex>
const { open } = require('./lib');
const fs = require('fs');
const TAB = parseInt(process.argv[2], 10);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const PARTIAL = `out/tab${TAB}.partial.json`;
const DONE = {};
if (process.env.RESUME && require('fs').existsSync(PARTIAL)) { JSON.parse(require('fs').readFileSync(PARTIAL)).forEach(r => { if (r.id) DONE[r.id] = r; }); }
const EMPTY = '<math xmlns="http://www.w3.org/1998/Math/MathML"/>';
const SKIP = /^(Undo|Redo|Press Ctrl\+|Bold|Color|Italic|Insert special|Automatic italic|Regular text|Right to left|Arabic ligature)/;
(async () => {
  const { b, p, log } = await open({ dsf: 2 });
  const box = await p.locator('#editorContainer').boundingBox();
  const edit = { x: box.x + 600, y: box.y + 330 };
  const sleep = ms => p.waitForTimeout(ms);
  { const kb = p.keyboard; const op = kb.press.bind(kb), ot = kb.type.bind(kb);
    kb.press = async (k, o) => { await op(k, o); await sleep(110); };
    kb.type = async (t, o) => { await ot(t, Object.assign({ delay: 60 }, o || {})); await sleep(150); }; }
  const mml = async () => { let prev = null; for (let i = 0; i < 12; i++) { await sleep(250); const cur = (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]+"/, ''); if (cur === prev) return cur; prev = cur; } return prev; };
  const reset = async () => {
    const rp = p.waitForResponse(r => /mathml2internal/.test(r.url()), { timeout: 6000 }).catch(() => null);
    await p.evaluate(m => editor.setMathML(m), EMPTY);
    await rp;
    await sleep(350);
    await p.mouse.click(edit.x, edit.y);
    await sleep(200);
  };
  const tabBtn = p.locator('#editorContainer .wrs_header button').nth(TAB);
  const selectTab = async () => { await tabBtn.click(); await sleep(350); };
  const prep = async () => { await reset(); await selectTab(); await p.mouse.click(edit.x, edit.y); await sleep(200); };
  const clipEdit = { x: box.x, y: box.y + 98, width: 420, height: 120 };
  const clipAll = { x: box.x, y: box.y, width: box.width, height: 300 };
  const shot = async (name, clip) => { await p.screenshot({ path: `out/${name}.jpg`, clip, type: 'jpeg', quality: 78 }); };
  const listButtons = async () => p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_toolbar button.wrs_button, #editorContainer button.wrs_button')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map(e => { const r = e.getBoundingClientRect(); return { title: e.getAttribute('aria-label') || e.title, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, cls: e.className, disabled: e.classList.contains('wrs_disabled') }; }));
  const results = [];
  await selectTab();
  const tabTitle = await tabBtn.getAttribute('title');
  const base = await listButtons();
  const baseKeys = new Set(base.map(x => `${Math.round(x.x)},${Math.round(x.y)}`));
  const expanders = await p.evaluate(() => [...document.querySelectorAll('#editorContainer button.wrs_expandButton')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map(e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  console.log('TAB', TAB, tabTitle, 'buttons', base.length, 'expanders', expanders.length);

  async function runCases(item, id, openPopup) {
    if (ONLY && !ONLY.includes(id)) return;
    if (DONE[id]) { results.push(DONE[id]); return; }
    const rec = { id, tab: TAB, tabTitle, title: item.title, x: item.x, y: item.y, cases: {} };
    // icon crop
    await p.screenshot({ path: `out/${id}_icon.png`, clip: { x: item.x - item.w / 2 - 2, y: item.y - item.h / 2 - 2, width: item.w + 4, height: item.h + 4 } });
    const press = async () => { await selectTab(); if (openPopup) { await p.mouse.click(openPopup.x, openPopup.y); await sleep(350); } await p.mouse.click(item.x, item.y); await sleep(300); };
    try {
      // Case A: empty editor, click, type 7
      await prep();
      const errs0 = log.errors.length;
      if (openPopup) { await p.mouse.click(openPopup.x, openPopup.y); await sleep(350); }
      await p.mouse.click(item.x, item.y); await sleep(300);
      rec.cases.A = { desc: 'Empty editor, click button', mathml: await mml() };
      await shot(`${id}_A`, clipAll);
      await p.keyboard.type('7'); 
      rec.cases.A2 = { desc: 'Then type "7" (shows where the caret lands)', mathml: await mml() };
      await shot(`${id}_A2`, clipEdit);
      // Case B: typed x, caret at end, click
      await prep();
      await p.keyboard.type('x'); await sleep(200);
      if (openPopup) { await p.mouse.click(openPopup.x, openPopup.y); await sleep(350); }
      await p.mouse.click(item.x, item.y); await sleep(300);
      rec.cases.B = { desc: 'Typed "x" (caret after it), click button', mathml: await mml() };
      await shot(`${id}_B`, clipEdit);
      // Case C: typed x, selected (Shift+Left), click
      await prep();
      await p.keyboard.type('x'); await sleep(150);
      await p.keyboard.press('Shift+ArrowLeft'); await sleep(200);
      if (openPopup) { await p.mouse.click(openPopup.x, openPopup.y); await sleep(350); }
      await p.mouse.click(item.x, item.y); await sleep(300);
      rec.cases.C = { desc: 'Typed "x", selected it (Shift+Left), click button', mathml: await mml() };
      await shot(`${id}_C`, clipEdit);
      rec.errors = log.errors.slice(errs0);
    } catch (e) { rec.error = String(e).slice(0, 300); }
    results.push(rec);
    try { fs.writeFileSync(PARTIAL, JSON.stringify(results)); } catch (e) {}
    console.log(id, rec.title, '|', rec.cases.A && rec.cases.A.mathml.slice(0, 90));
  }

  for (let i = 0; i < base.length; i++) {
    const it = base[i];
    if (ONLY && !ONLY.includes(`t${TAB}_b${i}`)) continue;
    if (SKIP.test(it.title || '')) { results.push({ id: `t${TAB}_b${i}`, tab: TAB, tabTitle, title: it.title, skipped: 'handled in dedicated tests', x: it.x, y: it.y }); continue; }
    await runCases(it, `t${TAB}_b${i}`);
  }
  for (let e = 0; e < expanders.length; e++) {
    await reset(); await selectTab();
    await p.mouse.click(expanders[e].x, expanders[e].y); await sleep(450);
    await shot(`t${TAB}_x${e}_popup`, { x: box.x, y: box.y, width: box.width, height: 330 });
    const after = await listButtons();
    const popup = after.filter(x => !baseKeys.has(`${Math.round(x.x)},${Math.round(x.y)}`));
    console.log('expander', e, 'items', popup.length, popup.map(x => x.title).join(' | '));
    await p.keyboard.press('Escape'); await sleep(200);
    for (let k = 0; k < popup.length; k++) await runCases(popup[k], `t${TAB}_x${e}_i${k}`, expanders[e]);
    results.push({ id: `t${TAB}_x${e}`, expander: true, popupItems: popup.map(x => x.title) });
  }
  let finalResults = results;
  if (ONLY) { const old = JSON.parse(fs.readFileSync(`out/tab${TAB}.json`)); const byId = Object.fromEntries(results.filter(r => r.id).map(r => [r.id, r])); finalResults = old.results.map(r => (r.id && byId[r.id] && byId[r.id].cases) ? byId[r.id] : r); }
  fs.writeFileSync(`out/tab${TAB}.json`, JSON.stringify({ tab: TAB, tabTitle, results: finalResults, console: log.console.filter(c => !/Inclusif|Tracking|403/.test(c)), errors: log.errors, net: log.net.filter(n => /wiris\.net/.test(n) && !/resources\/fonts|decoration/.test(n)) }, null, 1));
  await b.close();
})();
