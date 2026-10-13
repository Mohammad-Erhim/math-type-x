// Draw stroke sets in the reference's handwriting mode and record what its recogniser answers.
// usage: node tools/hand_oracle.js corpus.json out.json     corpus: [{ name, strokes: [[[x,y],…],…] }]
const fs = require('fs');
const { open } = require('./lib');
(async () => {
  const corpus = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const { b, p } = await open({ dsf: 1 });
  const bq = await p.locator('#editorContainer').boundingBox();
  const last = { req: null, res: null };
  p.on('request', (r) => { if (/hand\/recognize/.test(r.url())) last.req = r.postData(); });
  p.on('response', async (r) => { if (/hand\/recognize/.test(r.url())) { try { last.res = await r.text(); } catch (e) {} } });
  await p.mouse.click(bq.x + bq.width - 15, bq.y + 250);
  await p.waitForTimeout(2500);
  const out = [];
  for (const item of corpus) {
    // clear
    await p.evaluate(() => { const b = [...document.querySelectorAll('.wrs_hand .wrs_button')].find((e) => e.title === 'Clear'); if (b) b.click(); });
    await p.waitForTimeout(600);
    const c = await p.locator('#editorContainer canvas.wrs_canvas').first().boundingBox();
    last.req = null; last.res = null;
    for (const st of item.strokes) {
      const [x0, y0] = st[0];
      await p.mouse.move(c.x + x0, c.y + y0);
      await p.mouse.down();
      for (const [x, y] of st.slice(1)) await p.mouse.move(c.x + x, c.y + y, { steps: 2 });
      await p.mouse.up();
      await p.waitForTimeout(120);
    }
    for (let i = 0; i < 20 && !last.res; i++) await p.waitForTimeout(300);
    await p.waitForTimeout(400);
    let res = null;
    try { res = JSON.parse(last.res); } catch (e) {}
    out.push({ name: item.name, req: last.req, mathml: res && res.result ? res.result.mathml : null, raw: res && !res.result ? last.res : undefined });
    console.log(item.name, '=>', out[out.length - 1].mathml);
  }
  fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
  await b.close();
})();
