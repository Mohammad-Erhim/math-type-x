// Draw corpus formulas with the real mouse in the handwriting mode of OUR app (URL) or the reference and compare the editor's MathML.
// usage: URL=http://localhost:8099/ node tools/hand_e2e.js tests/oracle/hand_corpus3_in.json [count] [shotDir]
const fs = require('fs');
const { open } = require('./lib');
(async () => {
  const corpus = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const count = +process.argv[3] || 8;
  const shots = process.argv[4];
  const step = Math.max(1, Math.floor(corpus.length / count));
  const items = corpus.filter((_, i) => i % step === 0).slice(0, count);
  const { b, p } = await open({ dsf: 1 });
  const bq = await p.locator('#editorContainer').boundingBox();
  await p.mouse.click(bq.x + bq.width - 15, bq.y + 250);
  await p.waitForTimeout(2500);
  let ok = 0;
  const norm = (m) => m.replace(/ xmlns="[^"]*"/, '').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
  for (const [n, it] of items.entries()) {
    await p.evaluate(() => { const b = [...document.querySelectorAll('.wrs_hand .wrs_button')].find((e) => e.title === 'Clear'); if (b) b.click(); });
    await p.waitForTimeout(500);
    const c = await p.locator('#editorContainer canvas.wrs_canvas').first().boundingBox();
    for (let s = 0; s < it.x.length; s++) {
      const xs = it.x[s], ys = it.y[s];
      await p.mouse.move(c.x + xs[0], c.y + ys[0]);
      await p.mouse.down();
      for (let i = 1; i < xs.length; i++) await p.mouse.move(c.x + xs[i], c.y + ys[i]);
      await p.mouse.up();
      await p.waitForTimeout(150);
    }
    await p.waitForTimeout(2500);
    const got = await p.evaluate(() => (window.editor ? editor.getMathML() : ''));
    const same = norm(got) === norm(it.mml);
    if (same) ok++;
    console.log(same ? 'OK  ' : 'DIFF', it.name, same ? '' : '\n   want ' + norm(it.mml) + '\n   got  ' + norm(got));
    if (shots) await p.locator('#editorContainer').screenshot({ path: `${shots}/hand_${n}.png` });
  }
  console.log(`${ok}/${items.length}`);
  await b.close();
})();
