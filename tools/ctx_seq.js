// Sequences of contextual actions: for every case {name, mml, steps:[keys], seq:[[title, value?]…]} the caret is put where `steps`
// says (keys pressed after Home: "ArrowRight" … or "Shift+ArrowRight"), the controls are applied one after the other and the MathML
// after each is recorded.  URL = reference or ours.  usage: URL=… CASES=file.json OUT=file.json node tools/ctx_seq.js
const fs = require('fs');
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8099/?output=0&layout=classic';
const REF = URL.includes('wiris.com');
const WAIT = +(process.env.WAIT || (REF ? 700 : 250));
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const cases = JSON.parse(fs.readFileSync(process.env.CASES, 'utf8'));
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: REF ? { width: 1920, height: 1080 } : { width: 760, height: 450 } })).newPage();
  await p.goto(URL, { waitUntil: 'load', timeout: 120000 });
  if (REF) await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(REF ? 2500 : 800);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const bx = await p.locator('#editorContainer').boundingBox();
  const sel = () => p.evaluate(() => (typeof editor.selectTab === 'function' ? editor.selectTab(9) : document.querySelectorAll('#editorContainer .wrs_header button')[9].click()));
  const out = {};
  for (const c of cases) {
    const rec = { steps: [] };
    out[c.name] = rec;
    try {
      await p.keyboard.press('Escape').catch(() => {});
      await p.evaluate((m) => editor.setMathML(m), `<math ${NS}>${c.mml}</math>`);
      await p.waitForTimeout(WAIT + 400);
      await sel();
      await p.mouse.click(bx.x + (REF ? 600 : 400), bx.y + (REF ? 330 : 250));
      await p.keyboard.press('Home');
      for (const k of c.steps || []) { await p.keyboard.press(k); await p.waitForTimeout(WAIT / 3); }
      await p.waitForTimeout(WAIT);
      for (const [title, value] of c.seq) {
        if (title.startsWith('key:')) {
          for (const k of title.slice(4).split(' ')) { await p.keyboard.press(k); await p.waitForTimeout(WAIT / 3); }
          await p.waitForTimeout(WAIT / 2);
          continue;
        }
        try {
          if (value !== undefined) await p.locator(`#editorContainer select[title="${title}"]:visible`).first().selectOption(value, { timeout: 4000 });
          else await p.locator(`#editorContainer .wrs_toolbar button[title="${title}"]:visible`).first().click({ timeout: 4000 });
          await p.waitForTimeout(WAIT);
          rec.steps.push({ title, value, mml: (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]*"/, '') });
        } catch (e) { rec.steps.push({ title, value, err: String(e).slice(0, 80) }); }
        await p.keyboard.press('Escape').catch(() => {});
      }
    } catch (e) { rec.err = String(e).slice(0, 100); }
    console.log(c.name, rec.steps.map((s) => s.mml || s.err).join('\n   '));
  }
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  await b.close();
})();
