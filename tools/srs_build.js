const fs = require('fs');
const L = require('./build_lib');
const { esc, loadJson, exists, M, B } = L;
const SRS_CSS = L.CSS + `
.req td:first-child { white-space: nowrap; font-weight: bold; font-size: 7.4pt; width: 17mm; }
.req td { font-size: 7.7pt; }
.req .ver { width: 9mm; text-align: center; }
.req .ref { width: 20mm; font-size: 7pt; color: #4a5766; }
.cat td { font-size: 6.9pt; padding: 0.7mm 1mm; }
.cat .mm { font-family: "DejaVu Sans Mono", monospace; font-size: 5.9pt; word-break: break-all; color: #223; }
.cat img.ic { width: 22px; height: 22px; border: 0.4pt solid #ccd; }
.toc a { color: #12304f; }
h2.sec1 { font-size: 17pt; }
.dc td, .dc th { font-size: 8.5pt; }
.arch { width: 100%; }
`;
function reqTable(code, [title, rows]) {
  return `<h3 id="${code}">${esc(title)}</h3><table class="req"><tr><th>ID</th><th>Requirement</th><th>Reference</th><th>Ver.</th></tr>${rows.slice().sort((a, b) => a[0].localeCompare(b[0])).map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="ref">FR-DOC ${esc(r[2])}</td><td class="ver">${r[3]}</td></tr>`).join('')}</table>`;
}
const A = require('./srs/req_a'), Bq = require('./srs/req_b'), C = require('./srs/req_c'), D = require('./srs/req_d');
const E = require('./srs/req_e');
const ALL = Object.assign({}, A, Bq, C, D, E);
const QUIRKS = require('./srs/quirks');
const TABNAMES = ['General', 'Symbols', 'Arrows', 'Greek, letters and numbers', 'Matrices and elementary', 'Scripts and layout', 'Decorations', 'Big operators', 'Calculus'];
const ORIGIN = [597.5, 665.0625];
function iconDim(id) { try { const b = fs.readFileSync(`thumbs/${id}_icon.png`); return [b.readUInt32BE(16) / 2 - 4, b.readUInt32BE(20) / 2 - 4]; } catch (e) { return null; } }
function catalogue() {
  let h = '', total = 0;
  const idMap = [];
  for (let t = 0; t < 9; t++) {
    const f = `out/tab${t}.json`; if (!exists(f)) continue;
    const j = loadJson(f);
    const main = j.results.filter(r => r.id && /_b\d+$/.test(r.id));
    h += `<h3 id="cat${t}">C.${t + 1} Tab ${t + 1} — ${esc(TABNAMES[t])} (Alt+${(t + 1) % 10})</h3>`;
    const groups = [{ name: 'Main panel', items: main, gid: '' }];
    j.results.filter(r => r.expander).forEach((e, k) => groups.push({ name: `“More” group ${k + 1}`, items: j.results.filter(r => r.id && r.id.startsWith(`t${t}_x${k}_i`)), gid: `G${k + 1}-` }));
    const inv = exists('inv1.json') ? loadJson('inv1.json') : [];
    const exps = ((inv[t] || {}).items || []).filter(e => /expand/.test(e.cls));
    groups.forEach((g, gi) => {
      if (!g.items.length) return;
      const ex = gi > 0 ? exps[gi - 1] : null;
      const exTxt = ex ? ` — expand button at ${Math.round((ex.x - ORIGIN[0]) * 10) / 10}, ${Math.round((ex.y - ORIGIN[1]) * 10) / 10}, ${ex.w}×${ex.h}` : '';
      h += `<h4>${esc(g.name)} (${g.items.length} controls)${exTxt}</h4><table class="cat"><tr><th style="width:14mm">ID</th><th style="width:7mm">Icon</th><th style="width:33mm">Tooltip / aria-label</th><th style="width:17mm">x,y,w,h (px)</th><th>Expected result (MathML) — A: empty editor · B: after “x” · C: “x” selected</th></tr>`;
      g.items.forEach((r, i) => {
        const id = `TB-${t + 1}-${g.gid}${String(i + 1).padStart(3, '0')}`; total++;
        idMap.push([id, r.id, r.title]);
        const dim = iconDim(r.id) || [33, 33];
        const x = Math.round((r.x - ORIGIN[0] - dim[0] / 2) * 10) / 10, y = Math.round((r.y - ORIGIN[1] - dim[1] / 2) * 10) / 10;
        const geo = `${x}, ${y}, ${dim[0]}, ${dim[1]}${g.gid ? ' (open pop-up)' : ''}`;
        const c = r.cases;
        let res;
        if (r.skipped) res = 'Dedicated requirements: see ' + ({ Undo: 'CLP-005', Redo: 'CLP-005' }[r.title] || (/Press Ctrl\+/.test(r.title) ? 'CLP-001..004' : /Bold|Italic|Automatic|Regular/.test(r.title) ? 'FMT-001..004' : /Color/.test(r.title) ? 'FMT-005' : /special/.test(r.title) ? 'UNI-001..005' : /Right|Arabic/.test(r.title) ? 'MOD-001..003' : 'FMT'));
        else if (B.PICKER.has(r.title)) res = 'Opens the size picker (MPK-001…009). Results: Table → <mtable>; matrices → <mfenced…><mtable>…';
        else if (c && c.A) res = `<b>A</b> ${esc(c.A.mathml)}<br><b>B</b> ${esc(c.B.mathml)}<br><b>C</b> ${esc(c.C.mathml)}`;
        else res = 'n/a';
        const note = (!r.skipped && !B.PICKER.has(r.title) && c && c.A) ? `<div style="font-family:inherit;font-size:6.2pt;color:#4a5766">${esc(B.behaviorText(r).slice(0, 2).join(' '))}</div>` : '';
        h += `<tr><td><b>${id}</b></td><td>${exists(`thumbs/${r.id}_icon.png`) ? `<img class="ic" src="thumbs/${r.id}_icon.png">` : ''}</td><td>${esc(r.title)}</td><td>${geo}</td><td class="mm">${res}${note}</td></tr>`;
      });
      h += '</table>';
    });
  }
  return { html: h, total, idMap };
}
function contextualCatalogue() {
  const { CTX } = require('./build_part5');
  let h = '<h3 id="appG">Appendix G — Contextual controls per context</h3><p class="small">Every control listed was activated in the reference; results are in FR-DOC §19–§21 and the evidence files <code>s10b_ctx_*.json</code>, <code>s23_length_fields.json</code>, <code>s16_elementary.json</code>.</p>';
  CTX.forEach(([id, t, d]) => {
    const f = `sc/s10b_ctx_${id}.json`; if (!exists(f)) return;
    const j = loadJson(f); const ctrls = (j.steps[0].extra || []);
    h += `<h4>${esc(t)} — ${ctrls.length} controls</h4><table class="cat"><tr><th style="width:12mm">#</th><th>Control</th><th style="width:20mm">Kind</th><th>Options / recorded effect</th></tr>`;
    ctrls.forEach((c, i) => {
      const steps = j.steps.filter(s => s.desc.includes(` / ${c.title} (`) && s.mathml);
      const base = j.steps[0].mathml;
      const eff = steps.slice(0, 4).map(s => `${esc(s.desc.split('->')[1] ? s.desc.split('->')[1].trim() : '')}: ${esc(M.diffText(base, s.mathml))}`).join('<br>');
      const kind = c.tag === 'SELECT' ? 'drop-down' : /length/.test(c.cls) ? 'length field' : /toggle/.test(c.cls) ? 'toggle' : 'button';
      h += `<tr><td>${id}-${String(i + 1).padStart(2, '0')}</td><td>${esc(c.title)}</td><td>${kind}</td><td class="mm">${c.opts ? esc(c.opts.join(' ')) : eff}</td></tr>`;
    });
    h += '</table>';
  });
  return h;
}
module.exports = { reqTable, ALL, QUIRKS, catalogue, contextualCatalogue, SRS_CSS, TABNAMES };
