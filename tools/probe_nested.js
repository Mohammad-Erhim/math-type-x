// for every structural control: insert it into a fraction numerator on the reference and record the MathML
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const cat = JSON.parse(fs.readFileSync('src/data/catalogue.json', 'utf8'));
  const { b, p } = await open({ dsf: 1 });
  const mml = async () => { await p.waitForTimeout(250); return (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]+"/, ''); };
  const out = {};
  const tabs = process.argv.slice(2).map(Number);
  for (const c of cat.controls) {
    if (c.group !== 0 || !tabs.includes(c.tab)) continue;
    if (!c.A || /Table|Matrix with/.test(c.title)) continue;
    const isStruct = /<m(frac|sqrt|root|sup|sub|under|over|enclose|table|fenced|multi|padded|stack|action|row)/.test(c.A);
    if (!isStruct) continue;
    await p.evaluate(() => editor.setMathML('<math/>')); await p.waitForTimeout(350);
    const bx = await p.locator('#editorContainer').boundingBox();
    await p.mouse.click(bx.x + 400, bx.y + 300); await p.waitForTimeout(150);
    await p.locator('#editorContainer .wrs_header button').nth(0).click(); await p.waitForTimeout(200);
    await p.locator('#editorContainer button[title="Fraction (Ctrl+/)"]:visible').first().click(); await p.waitForTimeout(200);
    await p.locator('#editorContainer .wrs_header button').nth(c.tab).click(); await p.waitForTimeout(250);
    try {
      await p.locator(`#editorContainer button[title="${c.title}"]:visible`).first().click({ timeout: 4000 });
    } catch (e) { out[c.ref] = 'ERR ' + c.title; continue; }
    await p.waitForTimeout(200);
    out[c.ref + ' ' + c.title] = await mml();
  }
  fs.writeFileSync('evidence/ref_nested_' + tabs.join('') + '.json', JSON.stringify(out, null, 1));
  console.log(Object.keys(out).length);
  await b.close();
})();
