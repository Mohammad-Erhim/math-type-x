// Visible texts of the pop-ups / dialogs of the editor (LANGUAGE=ar node tools/probe_popups_lang.js out.json)
const fs = require('fs');
const { open } = require('./lib');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const grab = () => p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.wrs_editor *, .wrs_modal_dialogContainer *, [class*=wrs_] *').forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none') return;
      const t = e.getAttribute('title'), a = e.getAttribute('aria-label'), ph = e.getAttribute('placeholder');
      const tx = e.children.length === 0 ? (e.textContent || '').trim() : '';
      if (t || a || ph || (tx && tx.length < 120)) out.push({ cls: String(e.className).slice(0, 50), title: t, aria: a, ph, text: tx });
    });
    return out;
  });
  const res = {};
  const closeAll = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.mouse.click(5, 5); await p.waitForTimeout(300); };
  const tabs = p.locator('#editorContainer .wrs_header button');
  const clickByIndex = async (sel, i) => { const r = await p.evaluate(([s, i]) => { const e = document.querySelectorAll(s)[i]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, [sel, i]); if (r) { await p.mouse.click(r.x, r.y); await p.waitForTimeout(700); } return !!r; };
  const findBtn = (re) => p.evaluate((src) => { const r = new RegExp(src); return [...document.querySelectorAll('#editorContainer .wrs_toolbar button')].map((e, i) => [i, e.title]).filter(([, t]) => r.test(t)).map(([i]) => i); }, re.source);
  // tab 0: color, special characters
  await tabs.nth(0).click(); await p.waitForTimeout(400);
  res.base = await grab();
  // buttons by position in the first tab: find those whose English or Arabic title is known through index of class
  const idx = await p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_toolbar button')].map((e, i) => [i, e.className, e.title, e.getBoundingClientRect().width > 0]));
  res.buttons = idx.filter((x) => x[3]).map((x) => [x[0], x[1], x[2]]);
  const pick = (cls) => idx.filter((x) => x[3] && new RegExp(cls).test(x[1])).map((x) => x[0]);
  const all = 'document.querySelectorAll("#editorContainer .wrs_toolbar button")';
  for (const [name, cls] of [['color', 'wrs_colorChooser'], ['special', 'wrs_unicode'], ['matrix', 'wrs_matrixButton']]) {
    for (const i of pick(cls).slice(0, 1)) {
      await closeAll();
      if (name === 'matrix') { await tabs.nth(4).click(); await p.waitForTimeout(400); }
      const idx2 = await p.evaluate(([c]) => [...document.querySelectorAll('#editorContainer .wrs_toolbar button')].findIndex((e) => new RegExp(c).test(e.className) && e.getBoundingClientRect().width > 0), [cls]);
      await clickByIndex('#editorContainer .wrs_toolbar button', idx2);
      res[name] = await grab();
    }
  }
  await closeAll();
  fs.writeFileSync(process.argv[2], JSON.stringify(res));
  console.log(Object.keys(res).map((k) => k + ':' + res[k].length).join(' '));
  await b.close();
})();
