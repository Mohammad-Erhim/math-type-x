// harvests the reference special-characters panel: category lists and the Code field behaviour
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  await p.locator('#editorContainer .wrs_formulaDisplay').click({ position: { x: 300, y: 100 } }).catch(() => {});
  await p.locator('#editorContainer button[title="Insert special characters"]').click(); await p.waitForTimeout(800);
  const titles = () => p.evaluate(() => [...document.querySelectorAll('.wrs_unicodeChooserPanel .wrs_unicodeButton')].map((d) => parseInt(d.title.slice(2, 8), 16)));
  const out = { cats: {}, codes: {} };
  for (const c of ['S', 'P', 'L', 'M', 'N', 'F', 'C']) {
    await p.locator('.wrs_unicodeChooserPanel select').selectOption(c); await p.waitForTimeout(500);
    out.cats[c] = await titles();
  }
  await p.locator('.wrs_unicodeChooserPanel select').selectOption('S'); await p.waitForTimeout(300);
  const inp = p.locator('.wrs_unicodeChooserPanel input').first();
  for (const v of ['198', 'zzzz', 'z', '12', '1', 'a', 'A', '41', '4', '03B1', 'u+03b1', 'U+03B1', '0x3b1', '945', '10FFFF', '110000', 'abcd', '-1', ' ', '0', '00', '000', '0000', '00000', 'ffff', 'FFFFF', '1234567', '3b1', '3B', 'U+', 'u+3b1', '&#945;', '1F600', '210F']) {
    await inp.fill(v); await p.waitForTimeout(450);
    out.codes[v] = await titles();
  }
  await inp.fill(''); await p.waitForTimeout(300);
  out.afterClear = (await titles()).length;
  fs.writeFileSync('evidence/ref_unicode.json', JSON.stringify(out));
  console.log(Object.fromEntries(Object.entries(out.cats).map(([k, v]) => [k, v.length])), JSON.stringify(out.codes).slice(0, 1500));
  await b.close();
})();
