const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const R = {};
  const rect = s => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); const o = document.querySelector('#editorContainer').getBoundingClientRect(); return [Math.round((r.x - o.x) * 10) / 10, Math.round((r.y - o.y) * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; }, s);
  const css = (s, props) => p.evaluate(([sel, props]) => { const e = document.querySelector(sel); if (!e) return null; const c = getComputedStyle(e); return Object.fromEntries(props.map(k => [k, c[k]])); }, [s, props]);
  for (const [k, s] of Object.entries({ editor: '.wrs_editor', toolbar: '.wrs_toolbar', header: '.wrs_header', tabSelected: '.wrs_header button.wrs_selected', tab2: '.wrs_header button:nth-child(2)', contextTab: '.wrs_header button.wrs_context', link: 'a.wrs_linkButton', panel: '.wrs_multipleRowPanel', formula: '.wrs_formulaDisplay', formulaWrapper: '.wrs_formulaDisplayWrapper', hand: '.wrs_handWrapper', fontSel: 'select[title="Font family"]', sizeSel: 'select[title="Font size"]', firstButton: 'button.wrs_button', expand: 'button.wrs_expandButton' })) R[k] = { rect: await rect(s), css: await css(s, ['backgroundColor', 'backgroundImage', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'borderTop', 'borderBottom', 'borderRadius', 'boxShadow', 'padding', 'margin', 'overflow', 'cursor']) };
  await p.mouse.click(...await p.evaluate(() => { const r = document.querySelector('.wrs_formulaDisplay').getBoundingClientRect(); return [r.x + 300, r.y + 150]; }));
  await p.keyboard.type('x2');
  await p.waitForTimeout(500);
  R.formulaChar = await p.evaluate(() => { const c = document.querySelector('.wrs_formulaDisplay .wrs_italic, .wrs_formulaDisplay [class*=wrs_] span'); const all = [...document.querySelectorAll('.wrs_formulaDisplay *')].filter(e => e.children.length === 0 && e.textContent.trim()).slice(0, 4).map(e => ({ cls: e.className, text: e.textContent, fs: getComputedStyle(e).fontSize, ff: getComputedStyle(e).fontFamily, fst: getComputedStyle(e).fontStyle })); return all; });
  // blink
  const blink = await p.evaluate(() => new Promise(res => { const t = []; const ob = new MutationObserver(ms => ms.forEach(m => { if (m.type === 'attributes' && /wrs_blink|wrs_caret/.test(m.target.className)) t.push(performance.now()); })); ob.observe(document.querySelector('.wrs_formulaDisplay'), { attributes: true, subtree: true, attributeFilter: ['class'] }); setTimeout(() => { ob.disconnect(); res(t); }, 4000); }));
  R.blinkTimestamps = blink.map(x => Math.round(x));
  R.caret = await css('.wrs_caret', ['borderLeft', 'height', 'zIndex']);
  // scrollbar
  R.viewport = await p.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
  fs.writeFileSync('style_probe.json', JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R).slice(0, 1500));
  await b.close();
})();
