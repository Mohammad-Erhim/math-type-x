const { scenario } = require('./sc');
scenario('s14_a11y_net', async (H) => {
  const { p } = H;
  const bodies = [];
  p.on('response', async r => { const u = r.url(); if (/wiris\.net\/demo\/(editor|hand)\/(mathml2accessible|mathml2internal|latex2mathml|recognize|render|tick|mathml2latex|service)/.test(u)) { try { const t = (await r.text()).slice(0, 400); bodies.push({ url: u.slice(0, 120), status: r.status(), req: (r.request().postData() || '').slice(0, 250), body: t }); } catch (e) { bodies.push({ url: u.slice(0, 120), status: r.status(), err: String(e).slice(0, 80) }); } } });
  const aria = await p.evaluate(() => {
    const w = document.querySelector('#editorContainer');
    const q = (s) => [...w.querySelectorAll(s)].map(e => e.tagName + '|' + (e.getAttribute('role') || '') + '|' + (e.getAttribute('aria-label') || e.title || '') + '|' + (e.getAttribute('aria-live') || '') + '|' + (e.getAttribute('tabindex') || ''));
    return { roles: q('[role]').slice(0, 40), live: q('[aria-live]'), tabindex: q('[tabindex]').slice(0, 30), inputs: q('input,textarea') };
  });
  require('fs').writeFileSync('sc/s14_aria.json', JSON.stringify(aria, null, 1));
  console.log(JSON.stringify(aria).slice(0, 1500));
  await H.focusEdit();
  const exprs = [['x+1', 'x+1'], ['Fraction a/b', async () => { await H.click('Fraction (Ctrl+/)'); await p.keyboard.type('a'); await p.keyboard.press('ArrowDown'); await p.keyboard.type('b'); }], ['Square root of 2', async () => { await H.reset(); await H.focusEdit(); await H.click('Square root'); await p.keyboard.type('2'); }], ['x squared', async () => { await H.reset(); await H.focusEdit(); await p.keyboard.type('x'); await p.keyboard.press('Control+ArrowUp'); await p.keyboard.type('2'); }]];
  for (const [d, a] of exprs) {
    await H.step(`Accessible text for: ${d}`, async () => { if (typeof a === 'string') { await H.reset(); await H.focusEdit(); await p.keyboard.type(a); } else await a(); await H.sleep(1200); }, { clip: 'full', extra: async () => ({ live: await p.evaluate(() => [...document.querySelectorAll('#editorContainer [aria-live], #editorContainer [role=status], #editorContainer [role=alert]')].map(e => e.textContent)), lastBodies: bodies.slice(-3) }) });
  }
  // Tab order
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); });
  await H.focusEdit();
  const order = [];
  for (let i = 0; i < 25; i++) { await p.keyboard.press('Shift+Tab'); order.push(await p.evaluate(() => { const a = document.activeElement; return a ? a.tagName + '|' + (a.title || a.getAttribute('aria-label') || '') + '|' + a.className.toString().slice(0, 30) : null; })); }
  require('fs').writeFileSync('sc/s14_taborder.json', JSON.stringify(order, null, 1));
  console.log(order.join('\n'));
  require('fs').writeFileSync('sc/s14_bodies.json', JSON.stringify(bodies, null, 1));
}, {});
