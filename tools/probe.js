// Oracle probe: run scripted editing programs against the reference (or a local build) and print MathML.
// usage: URL=<page> node probe.js programs.json [out.json]
//   programs.json: { "name": [ steps... ], ... }
//   step: {reset} {type:"abc"} {text:"é"} {press:"ArrowLeft"} {tab:3} {click:"Fraction (Ctrl+/)"} {more:<tab>,<g>}
//         {mml:1} {sel:"ShiftLeft x2"} {wait:ms} {click_xy:[x,y]} {eval:"js"} {select:"font"|"size", value:"..."}
const fs = require('fs');
const { open } = require('./lib');
(async () => {
  const progs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const { b, p } = await open({ dsf: 1 });
  const box = await p.locator('#editorContainer').boundingBox();
  const edit = { x: box.x + 400, y: box.y + 330 };
  const sleep = (ms) => p.waitForTimeout(ms);
  const mml = async () => { let prev = null; for (let i = 0; i < 10; i++) { await sleep(120); const cur = (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/, ''); if (cur === prev) return cur; prev = cur; } return prev; };
  const reset = async () => {
    await p.evaluate(() => editor.setMathML('<math xmlns="http://www.w3.org/1998/Math/MathML"/>'));
    await sleep(500);
    await p.mouse.click(edit.x, edit.y);
    await sleep(150);
  };
  const tabs = p.locator('#editorContainer .wrs_header button');
  const out = {};
  for (const [name, steps] of Object.entries(progs)) {
    const rec = [];
    try {
      await reset();
      for (const s of steps) {
        if (s.reset) await reset();
        else if (s.type !== undefined) { await p.keyboard.type(s.type, { delay: 40 }); await sleep(120); }
        else if (s.text !== undefined) { await p.keyboard.insertText(s.text); await sleep(150); }
        else if (s.press !== undefined) { for (let i = 0; i < (s.n || 1); i++) { await p.keyboard.press(s.press); await sleep(80); } }
        else if (s.tab !== undefined) { await tabs.nth(s.tab).click(); await sleep(250); }
        else if (s.click !== undefined) { await p.locator(`#editorContainer button[title="${s.click}"]:visible`).first().click(); await sleep(250); }
        else if (s.more !== undefined) { await p.locator('#editorContainer button.wrs_expandButton:visible').nth(s.more).click(); await sleep(300); }
        else if (s.item !== undefined) { await p.locator(`.wrs_editor button[title="${s.item}"]:visible`).first().click(); await sleep(250); }
        else if (s.set !== undefined) {
          const want = s.set;
          const norm = (m) => m.replace(/ xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/g, '').replace(/ xmlns:wrs="[^"]*"/g, '');
          for (let attempt = 0; attempt < 4; attempt++) {
            await p.evaluate((m) => editor.setMathML(m), want.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"'));
            let ok = false;
            for (let i = 0; i < 20 && !ok; i++) { await sleep(250); ok = norm(await p.evaluate(() => editor.getMathML())) === norm(want); }
            if (ok) break;
          }
          await sleep(300); await p.mouse.click(edit.x, edit.y); await sleep(200);
        }
        else if (s.mml) rec.push(await mml());
        else if (s.wait) await sleep(s.wait);
        else if (s.click_xy) { await p.mouse.click(box.x + s.click_xy[0], box.y + s.click_xy[1]); await sleep(200); }
        else if (s.dblclick_xy) { await p.mouse.dblclick(box.x + s.dblclick_xy[0], box.y + s.dblclick_xy[1]); await sleep(200); }
        else if (s.eval) rec.push(await p.evaluate(s.eval));
        else if (s.shot) await p.screenshot({ path: s.shot, clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
      }
    } catch (e) { rec.push('ERR ' + String(e.message).split('\n')[0]); }
    out[name] = rec;
    console.log(name.padEnd(40), JSON.stringify(rec));
  }
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
  await b.close();
})();
