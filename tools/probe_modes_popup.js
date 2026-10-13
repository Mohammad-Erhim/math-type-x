// like probe_modes.js but for the controls inside the group pop-ups ("expand" buttons) of every tab
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.env.OUT || '/tmp/modes_popup.json';
  const modes = (process.env.MODES || 'Bold (Ctrl+B),Italic (Ctrl+I)').split(',');
  const tabs = (process.env.TABS || '0,1,2,3,4,5,6,7,8').split(',').map(Number);
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 60000 });
  const EMPTY = '<math xmlns="http://www.w3.org/1998/Math/MathML"/>';
  const res = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
  const bx = await p.locator('#editorContainer').boundingBox();
  const popupButtons = () => p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_contextPanel button.wrs_button, #editorContainer .wrs_toolbar .wrs_contextPanel button')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map((e) => e.title));
  for (const t of tabs) {
    await p.locator('#editorContainer .wrs_header button').nth(t).click();
    await p.waitForTimeout(400);
    const nExp = await p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_toolbar .wrs_expandButton')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length);
    for (let ex = 0; ex < nExp; ex++) {
      await p.locator('#editorContainer .wrs_toolbar .wrs_expandButton:visible').nth(ex).click({ force: true });
      await p.waitForTimeout(500);
      const titles = [...new Set(await popupButtons())];
      await p.keyboard.press('Escape');
      for (const title of titles) {
        if (!title) continue;
        for (const mode of modes) {
          const key = `${t}|${ex}|${title}|${mode}`;
          if (res[key] !== undefined) continue;
          try {
            await p.evaluate((m) => editor.setMathML(m), EMPTY);
            await p.waitForTimeout(250);
            await p.mouse.click(bx.x + 600, bx.y + 330);
            await p.waitForTimeout(150);
            if (mode !== 'none') {
              await p.locator('#editorContainer .wrs_header button').nth(0).click();
              await p.locator(`#editorContainer button[title="${mode}"]:visible`).first().click({ force: true, timeout: 5000 });
            }
            await p.locator('#editorContainer .wrs_header button').nth(t).click();
            await p.waitForTimeout(150);
            await p.locator('#editorContainer .wrs_toolbar .wrs_expandButton:visible').nth(ex).click({ force: true });
            await p.waitForTimeout(350);
            await p.locator(`#editorContainer .wrs_contextPanel button[title="${title.replace(/"/g, '\\"')}"]:visible, #editorContainer .wrs_toolbar .wrs_contextPanel button[title="${title.replace(/"/g, '\\"')}"]:visible`).first().click({ force: true, timeout: 5000 });
            await p.waitForTimeout(150);
            await p.keyboard.type('a');
            await p.waitForTimeout(150);
            res[key] = (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]+"/, '');
          } catch (e) {
            res[key] = 'ERR ' + String(e).slice(0, 80);
            await p.keyboard.press('Escape').catch(() => {});
          }
        }
      }
      fs.writeFileSync(out, JSON.stringify(res));
    }
  }
  fs.writeFileSync(out, JSON.stringify(res));
  console.log('done', Object.keys(res).length);
  await b.close();
})();
