// Length-field audit: for contextual length buttons (spacing, width/height/depth, table spacings) types a list of values and
// records what the panel does (stays open / closes), the MathML afterwards and the reopened value.  URL = reference or ours.
//   usage: URL=… OUT=file.json [VALUES='["1em","-1em"]'] node tools/ctx_len.js
const fs = require('fs');
const { chromium } = require('playwright');
const URL = process.env.URL || 'https://www.wiris.com/en/mathtype/';
const REF = URL.includes('wiris.com');
const WAIT = REF ? 700 : 250;
const OUT = process.env.OUT || '/tmp/ctx_len.json';
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const VALUES = process.env.VALUES ? JSON.parse(process.env.VALUES) : ['1em', '2', '0', '0.5em', '.5em', '10px', '3ex', '1.5', '-1em', '-2', '2cm', '50%', '1 em', ' 2em ', '1EM', 'abc', '', '1,5em', '1e2em', 'thin', '+1em'];
const CASES = [
  { name: 'op_spacing', mml: '<mi>a</mi><mo>+</mo><mi>b</mi>', steps: 1, buttons: ['Left spacing', 'Right spacing'] },
  { name: 'mspace', mml: '<mi>a</mi><mspace width="1em" height="3ex" depth="2ex"/><mi>b</mi>', steps: 1, buttons: ['Space width', 'Space height', 'Space depth'] },
  { name: 'table', mml: '<mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable>', steps: 1, buttons: ['Column spacing at right', 'Row spacing below', 'Horizontal frame spacing', 'Vertical frame spacing'] },
];
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: REF ? 1920 : 760, height: REF ? 1080 : 450 } })).newPage();
  await p.goto(URL, { waitUntil: 'load', timeout: 120000 });
  if (REF) await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(2000);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const bx = await p.locator('#editorContainer').boundingBox();
  const res = {};
  for (const c of CASES.filter((x) => !process.env.ONLY || process.env.ONLY.split(',').includes(x.name))) {
    for (const btn of c.buttons) {
      for (const v of VALUES) {
        const key = `${c.name}|${btn}|${JSON.stringify(v)}`;
        try {
          await p.keyboard.press('Escape').catch(() => {});
          await p.evaluate((m) => editor.setMathML(m), `<math ${NS}>${c.mml}</math>`);
          await p.waitForTimeout(WAIT + 200);
          await p.evaluate(() => (typeof editor.selectTab === 'function' ? editor.selectTab(9) : document.querySelectorAll('#editorContainer .wrs_header button')[9].click()));
          await p.mouse.click(bx.x + (REF ? 600 : 400), bx.y + (REF ? 330 : 250));
          await p.keyboard.press('Home');
          for (let j = 0; j < c.steps; j++) await p.keyboard.press('ArrowRight');
          await p.waitForTimeout(WAIT);
          const loc = p.locator(`#editorContainer .wrs_toolbar button[title="${btn}"]:visible`).first();
          await loc.click({ timeout: 3000 });
          await p.waitForTimeout(150);
          const panel = p.locator('.wrs_lengthButtonPanel:visible').first();
          const shownBefore = await panel.locator('input').first().inputValue({ timeout: 2000 }).catch(() => null);
          await panel.locator('input').first().fill(v, { timeout: 2000 });
          await p.keyboard.press('Enter');
          await p.waitForTimeout(WAIT);
          const open = await p.locator('.wrs_lengthButtonPanel:visible').count();
          const mml = (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]*"/, '');
          let reopened = null;
          if (!open) {
            await loc.click({ timeout: 3000 }).catch(() => {});
            await p.waitForTimeout(150);
            reopened = await p.locator('.wrs_lengthButtonPanel:visible input').first().inputValue({ timeout: 1500 }).catch(() => null);
          }
          res[key] = { shownBefore, open: open > 0, mml, reopened };
        } catch (e) { res[key] = { err: String(e).slice(0, 80) }; }
      }
    }
    console.log(c.name, 'done');
    fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  }
  await b.close();
})();
