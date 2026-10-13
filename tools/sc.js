// Scenario helper: records steps with screenshot, MathML, new network/console since last step
const { open } = require('./lib');
const fs = require('fs');
const EMPTY = '<math xmlns="http://www.w3.org/1998/Math/MathML"/>';
async function scenario(name, body, opts = {}) {
  const { b, ctx, p, log } = await open({ dsf: opts.dsf || 2, hasTouch: opts.hasTouch });
  if (opts.viewport) await p.setViewportSize(opts.viewport);
  const box0 = await p.locator('#editorContainer').boundingBox();
  const steps = [];
  let netI = log.net.length, conI = log.console.length, errI = log.errors.length;
  const sleep = ms => p.waitForTimeout(ms);
  { const kb = p.keyboard; const op = kb.press.bind(kb), ot = kb.type.bind(kb), oi = kb.insertText.bind(kb);
    kb.press = async (k, o) => { await op(k, o); await sleep(110); };
    kb.type = async (t, o) => { await ot(t, Object.assign({ delay: 60 }, o || {})); await sleep(150); };
    kb.insertText = async (t) => { await oi(t); await sleep(150); }; }
  const H = {
    p, ctx, log, sleep, steps,
    box: async () => p.locator('#editorContainer').boundingBox(),
    mml: async () => { let prev = null; for (let i = 0; i < 12; i++) { await sleep(250); const cur = (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]+"/, ''); if (cur === prev) return cur; prev = cur; } return prev; },
    reset: async (m) => { const rp = p.waitForResponse(r => /mathml2internal/.test(r.url()), { timeout: Number(process.env.RESET_WAIT || 6000) }).catch(() => null); await p.evaluate(x => editor.setMathML(x), m || EMPTY); await rp; await sleep(350); },
    focusEdit: async () => { const bx = await H.box(); await p.mouse.click(bx.x + 600, bx.y + 330); await sleep(200); },
    tab: async (i) => { await p.locator('#editorContainer .wrs_header button').nth(i).click(); await sleep(350); },
    btn: (title) => p.locator(`#editorContainer button[title="${title}"]:visible`).first(),
    click: async (title) => { await H.btn(title).click({ force: process.env.FORCE_CLICK === '1' }); await sleep(300); },
    // record a step: run action, then capture
    step: async (desc, action, o = {}) => {
      const t0 = Date.now();
      let err = null;
      try { if (action) await action(); } catch (e) { err = String(e).slice(0, 300); }
      await sleep(o.wait || 350);
      const bx0 = await H.box();
      const sc = await p.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
      const bx = { x: bx0.x + sc.x, y: bx0.y + sc.y, width: bx0.width, height: bx0.height };
      const idx = String(steps.length + 1).padStart(2, '0');
      const file = `sc/${name}_${idx}.jpg`;
      const clip = o.clip === 'full' ? { x: bx.x, y: bx.y, width: bx.width, height: bx.height }
        : o.clip === 'edit' ? { x: bx.x, y: bx.y + 98, width: 420, height: 130 }
        : o.clip && o.clip.viewport ? { x: o.clip.x + sc.x, y: o.clip.y + sc.y, width: o.clip.width, height: o.clip.height }
        : o.clip ? o.clip : { x: bx.x, y: bx.y, width: bx.width, height: 300 };
      try { await p.screenshot({ path: file, clip, type: 'jpeg', quality: 80, fullPage: true }); } catch (e) { err = (err || '') + ' shot:' + e; }
      let mathml = null; try { mathml = o.noMathml ? null : await H.mml(); } catch (e) {}
      const net = log.net.slice(netI).filter(n => new RegExp(process.env.NETPAT || 'wiris\\.net').test(n) && !/resources\/(fonts|decoration|icons)|hand\.js|hand\.css/.test(n));
      const con = log.console.slice(conI).filter(c => !/Inclusif|Tracking|403|%c/.test(c));
      const errs = log.errors.slice(errI);
      netI = log.net.length; conI = log.console.length; errI = log.errors.length;
      const rec = { n: steps.length + 1, desc, shot: file, mathml, net, console: con, errors: errs, err };
      if (o.extra) { try { rec.extra = await o.extra(); } catch (e) { rec.extra = 'ERR ' + e; } }
      steps.push(rec);
      console.log(`[${name} ${idx}] ${desc} => ${mathml ? mathml.slice(0, 110) : ''}${err ? ' ERR ' + err : ''}${net.length ? ' NET ' + net.map(x => x.slice(0, 60)).join(';') : ''}`);
      return rec;
    },
  };
  try { await body(H); } catch (e) { console.log('SCENARIO ERROR', e); steps.push({ n: steps.length + 1, desc: 'SCENARIO ABORTED', err: String(e).slice(0, 500) }); }
  fs.writeFileSync(`sc/${name}.json`, JSON.stringify({ name, steps }, null, 1));
  await b.close();
}
module.exports = { scenario, EMPTY };
