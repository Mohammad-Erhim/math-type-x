// Crawl the toolbar of the reference in language <lang> (default ar) and en for comparison -> evidence/ref_lang_dump.json
const fs = require('fs');
const { open } = require('./lib');
const langs = (process.argv[2] || 'en,ar').split(',');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const out = {};
  for (const lang of langs) {
    await p.evaluate(async (lang) => {
      const c = document.getElementById('editorContainer');
      c.innerHTML = '';
      const ed = com.wiris.jsEditor.JsEditor.newInstance({ language: lang });
      ed.insertInto(c);
      window.editor = ed;
    }, lang);
    await p.waitForFunction(() => document.querySelector('#editorContainer .wrs_toolbar button.wrs_button, #editorContainer .wrs_toolbar button'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const box = await p.locator('#editorContainer').boundingBox();
    const res = { header: null, tabs: [], meta: null };
    res.meta = await p.evaluate(() => ({ cls: document.querySelector('#editorContainer > div').className, mml: window.editor.getMathML(), rtl: window.editor.rightToLeft }));
    const grab = () => p.evaluate(() => {
      const root = document.querySelector('#editorContainer');
      const o = root.getBoundingClientRect();
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const res = [];
      root.querySelectorAll('.wrs_toolbar .wrs_panelContainer *').forEach((e) => {
        if (!vis(e)) return;
        const tag = e.tagName.toLowerCase();
        if (!['button', 'span', 'div', 'select', 'input', 'label', 'img'].includes(tag)) return;
        const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        res.push({ tag, cls: String(e.className), title: e.getAttribute('title'), text: tag === 'label' || tag === 'span' ? (e.children.length ? '' : e.textContent.trim().slice(0, 40)) : '', x: +(r.x - o.x).toFixed(1), y: +(r.y - o.y).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), bgi: cs.backgroundImage.slice(0, 120), bgp: cs.backgroundPosition, src: tag === 'img' ? e.getAttribute('src') && e.getAttribute('src').slice(0, 100) : undefined, dir: cs.direction });
      });
      return res;
    });
    res.header = await p.evaluate(() => {
      const root = document.querySelector('#editorContainer'); const o = root.getBoundingClientRect();
      return [...root.querySelectorAll('.wrs_header > *, .wrs_linksContainer *, .wrs_handContainer *, .wrs_toolbar')].map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), cls: String(e.className), title: e.getAttribute('title'), x: +(r.x - o.x).toFixed(1), y: +(r.y - o.y).toFixed(1), w: r.width, h: r.height }; });
    });
    const tabs = p.locator('#editorContainer .wrs_header button');
    const n = await tabs.count();
    for (let i = 0; i < n; i++) {
      await tabs.nth(i).click();
      await p.waitForTimeout(500);
      const t = { items: await grab(), more: null };
      const more = p.locator('#editorContainer .wrs_toolbar .wrs_expandButton:visible');
      if (await more.count()) {
        await more.first().click();
        await p.waitForTimeout(500);
        t.more = await grab();
        await more.first().click().catch(() => {});
        await p.waitForTimeout(200);
      }
      res.tabs.push(t);
      await p.mouse.move(box.x + 700, box.y + 380);
      await p.screenshot({ path: `${process.env.OUT || '/tmp'}/lang_${lang}_tab${i}.png`, clip: { x: box.x, y: box.y, width: 725, height: 415 } });
    }
    out[lang] = res;
    console.log(lang, res.tabs.map((t) => t.items.length + (t.more ? '/' + t.more.length : '')).join(' '));
  }
  fs.writeFileSync(process.env.OUTFILE || 'evidence/ref_lang_dump.json', JSON.stringify(out));
  await b.close();
})();
