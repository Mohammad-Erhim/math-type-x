// Hand panel + dialogs strings of the reference in en and ar -> evidence/ref_lang_hand.json
const fs = require('fs');
const { open } = require('./lib');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const out = {};
  for (const lang of ['en', 'ar']) {
    await p.evaluate((lang) => {
      const c = document.getElementById('editorContainer'); c.innerHTML = '';
      const ed = com.wiris.jsEditor.JsEditor.newInstance({ language: lang }); ed.insertInto(c); window.editor = ed;
    }, lang);
    await p.waitForTimeout(2500);
    const grab = () => p.evaluate(() => {
      const root = document.querySelector('#editorContainer');
      const res = [];
      root.querySelectorAll('*').forEach((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const t = e.getAttribute('title'), a = e.getAttribute('aria-label'), ph = e.getAttribute('placeholder');
        const tx = e.children.length === 0 ? e.textContent.trim() : '';
        if (t || a || ph || (tx && tx.length < 80)) res.push({ tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 60), title: t, aria: a, ph, text: tx });
      });
      return res;
    });
    const st = {};
    st.main = await grab();
    await p.evaluate(() => window.editor.openHand());
    await p.waitForTimeout(2500);
    st.hand0 = await grab();
    const box = await p.locator('#editorContainer .wrs_hand').boundingBox();
    await p.mouse.move(box.x + 200, box.y + 200); await p.mouse.down();
    for (let i = 1; i <= 12; i++) await p.mouse.move(box.x + 200 + i * 10, box.y + 200 + (i % 3) * 5);
    await p.mouse.up();
    await p.waitForTimeout(2500);
    st.hand1 = await grab();
    const titles = await p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_hand .wrs_button')].map((e) => e.title));
    const idx = titles.findIndex((t) => /^(Edit|تحرير|تعديل)/.test(t));
    st.titles = titles;
    if (idx >= 0) {
      const r = await p.evaluate((i) => { const e = document.querySelectorAll('#editorContainer .wrs_hand .wrs_button')[i]; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, idx);
      await p.mouse.click(r.x, r.y); await p.waitForTimeout(800); st.hand2 = await grab();
    }
    out[lang] = st;
    await p.screenshot({ path: `${process.env.OUT}/hand_${lang}.png`, clip: { x: box.x - 5, y: box.y - 5, width: 735, height: 425 } });
    await p.evaluate(() => { try { window.editor.closeHand(); } catch (e) {} });
  }
  fs.writeFileSync('evidence/ref_lang_hand.json', JSON.stringify(out, null, 1));
  console.log(Object.keys(out.en), out.en.titles, out.ar.titles);
  await b.close();
})();
