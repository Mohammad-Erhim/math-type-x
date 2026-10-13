const fs = require('fs');
const M = require('./mml');
const els = {}, attrs = {};
function walk(n, ex) {
  if (!n || n.name === '#text') return;
  const e = els[n.name] = els[n.name] || { count: 0, attrs: new Set(), example: ex };
  e.count++;
  for (const [k, v] of Object.entries(n.attrs || {})) {
    e.attrs.add(k);
    const key = k; const a = attrs[key] = attrs[key] || { count: 0, values: new Set(), on: new Set() };
    a.count++; if (a.values.size < 14) a.values.add(v); a.on.add(n.name);
  }
  for (const k of n.kids) walk(k, ex);
}
let n = 0;
function scanStr(s) { if (typeof s === 'string' && s.startsWith('<math')) { n++; const t = M.parse(s); walk(t, s.slice(0, 220)); } }
function scan(o) { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(scan); for (const [k, v] of Object.entries(o)) { if (k === 'mathml' || k === 'typedZ_result') scanStr(v); else scan(v); } }
for (const d of ['out', 'out_rtl', 'out_noitalic', 'sc']) { if (!fs.existsSync(d)) continue; for (const f of fs.readdirSync(d).filter(f => f.endsWith('.json') && !/partial|bak/.test(f))) { try { scan(JSON.parse(fs.readFileSync(d + '/' + f))); } catch (e) {} } }
const out = { documents: n, elements: Object.fromEntries(Object.entries(els).map(([k, v]) => [k, { count: v.count, attrs: [...v.attrs], example: v.example }])), attributes: Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, { count: v.count, values: [...v.values], on: [...v.on] }])) };
fs.writeFileSync('mathml_profile.json', JSON.stringify(out, null, 1));
console.log(n, Object.keys(out.elements).length, Object.keys(out.attributes).length);
console.log(Object.entries(out.elements).map(([k, v]) => k + ':' + v.count).join(' '));
console.log(Object.entries(out.attributes).map(([k, v]) => k + '=' + v.values.slice(0, 5).join('|')).join('\n'));
