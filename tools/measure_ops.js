// Measure glyph advances and operator spacing in the reference: "a <tok> b" for many tokens.
const fs = require('fs');
const { open } = require('./lib');
const cat = JSON.parse(fs.readFileSync('../src/data/catalogue.json', 'utf8'));
const esc = (s) => [...s].map((c) => { const cp = c.codePointAt(0); return cp > 126 || cp < 32 ? '&#x' + cp.toString(16).toUpperCase() + ';' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c; }).join('');
const toks = [];
const seen = new Set();
const add = (tag, attrs, text) => { const k = `${tag}|${attrs}|${text}`; if (!seen.has(k)) { seen.add(k); toks.push({ tag, attrs, text, k }); } };
for (let c = 33; c < 127; c++) { const ch = String.fromCharCode(c); add(/[A-Za-z]/.test(ch) ? 'mi' : /[0-9]/.test(ch) ? 'mn' : 'mo', '', ch); }
for (const c of cat.controls) {
  const m = c.A && /^<math><(mo|mi|mn)((?: [a-z]+="[^"]*")*)>([^<]*)<\/\1><\/math>$/.exec(c.A);
  if (m && m[3] !== '') { const dec = m[3].replace(/&#x([0-9A-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"'); add(m[1], m[2].trim(), dec); }
}
console.log('tokens', toks.length);
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const out = {};
  const CH = 60;
  for (let i = 0; i < toks.length; i += CH) {
    const slice = toks.slice(i, i + CH);
    const mml = '<math xmlns="http://www.w3.org/1998/Math/MathML">' + slice.map((t) => `<mi>a</mi><${t.tag}${t.attrs ? ' ' + t.attrs : ''}>${esc(t.text)}</${t.tag}><mi>b</mi>`).join('') + '</math>';
    await p.evaluate((m) => editor.setMathML(m), mml);
    await p.waitForTimeout(1200);
    const spans = await p.evaluate(() => {
      const fd = document.querySelector('#editorContainer .wrs_formulaDisplay');
      const res = [];
      fd.querySelectorAll('span').forEach((e) => {
        if (e.children.length) return;
        const t = e.textContent;
        if (!t || /wrs_(fontContainer|metrics)|wrs_ariaLive/.test(e.className)) return;
        if (e.closest('.wrs_fontContainer, .wrs_metrics, .wrs_ariaLiveRegion')) return;
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        res.push({ t, x: r.x, y: r.y, w: r.width, h: r.height, cls: e.className, fs: cs.fontSize, ff: cs.fontFamily.slice(0, 24), fst: cs.fontStyle, top: e.style.top, left: e.style.left });
      });
      return res;
    });
    // expected triples a tok b
    let idx = 0;
    for (const t of slice) {
      // find a: char 'a' italic ; token text may be multi-codepoint
      const a = spans[idx]; const tk = spans[idx + 1]; const bb = spans[idx + 2];
      if (!a || !tk || !bb || a.t !== 'a' || bb.t !== 'b') { out[t.k] = { err: true, got: spans.slice(idx, idx + 3).map((s) => s && s.t) }; // resync
        const j = spans.findIndex((s, k) => k > idx && s.t === 'a'); if (j < 0) break; idx = j; continue; }
      out[t.k] = { w: +tk.w.toFixed(3), h: tk.h, cls: tk.cls.replace(/wrs_(notItalic|notBold|font_inherit)\s*/g, '').trim(), fs: tk.fs, ff: tk.ff, pre: +(tk.x - (a.x + a.w)).toFixed(3), post: +(bb.x - (tk.x + tk.w)).toFixed(3), aw: +a.w.toFixed(3), top: tk.top, atop: a.top };
      idx += 3;
    }
    console.log(i, Object.keys(out).length);
  }
  fs.writeFileSync('../evidence/measure_ops.json', JSON.stringify(out));
  await b.close();
})();
