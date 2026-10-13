// Minimal MathML helpers: parse, compact notation, description heuristics
function decode(s) {
  return s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
          .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function parse(xml) {
  if (!xml) return null;
  const re = /<(\/?)([A-Za-z0-9:]+)((?:\s+[A-Za-z0-9:_-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
  const root = { name: '#root', attrs: {}, kids: [] };
  const st = [root]; let m;
  while ((m = re.exec(xml))) {
    if (m[5] !== undefined) { st[st.length - 1].kids.push({ name: '#text', text: decode(m[5]) }); continue; }
    const [, close, name, attrs, self] = m;
    if (close) { st.pop(); continue; }
    const a = {}; attrs.replace(/([A-Za-z0-9:_-]+)="([^"]*)"/g, (_, k, v) => { a[k] = decode(v); return ''; });
    const node = { name, attrs: a, kids: [] };
    st[st.length - 1].kids.push(node);
    if (!self) st.push(node);
  }
  return root.kids[0] || null;
}
const EMPTY = '□';
function textOf(n) { return n.kids.filter(k => k.name === '#text').map(k => k.text).join(''); }
function kidsEl(n) { return n.kids.filter(k => k.name !== '#text'); }
function compact(n) {
  if (!n) return '';
  const k = kidsEl(n).map(compact);
  switch (n.name) {
    case 'math': return k.length ? k.join(' ') : '(empty)';
    case 'mrow': return k.length ? (k.length > 1 ? '(' + k.join(' ') + ')' : k[0]) : EMPTY;
    case 'mi': case 'mn': return textOf(n) || EMPTY;
    case 'mo': { const t = textOf(n); return t === ' ' ? '␣' : t; }
    case 'mtext': return '“' + textOf(n).replace(/ /g, '␣') + '”';
    case 'mfrac': return (n.attrs.bevelled === 'true' ? 'bevelledFrac' : 'frac') + (n.attrs.linethickness !== undefined ? '[linethickness=' + n.attrs.linethickness + ']' : '') + '(' + k[0] + ' ⁄ ' + k[1] + ')';
    case 'msqrt': return '√(' + (k.length ? k.join(' ') : EMPTY) + ')';
    case 'mroot': return 'root(radicand ' + k[0] + ', index ' + k[1] + ')';
    case 'msup': return k[0] + '^{' + k[1] + '}';
    case 'msub': return k[0] + '_{' + k[1] + '}';
    case 'msubsup': return k[0] + '_{' + k[1] + '}^{' + k[2] + '}';
    case 'munder': return 'under(' + k[0] + '; ' + k[1] + ')';
    case 'mover': return 'over(' + k[0] + '; ' + k[1] + ')';
    case 'munderover': return 'underover(' + k[0] + '; ' + k[1] + '; ' + k[2] + ')';
    case 'mmultiscripts': return 'multiscripts(' + k.join('; ') + ')';
    case 'mprescripts': return '⟨pre⟩';
    case 'none': return '∅';
    case 'maction': return k.length ? k.join(' ') : EMPTY;
    case 'mfenced': { const o = n.attrs.open !== undefined ? n.attrs.open : '('; const c = n.attrs.close !== undefined ? n.attrs.close : ')'; const sep = n.attrs.separators; return 'fenced' + (sep ? '[sep ' + sep + ']' : '') + ' ' + (o || '∅') + ' ' + (k.length ? k.join(', ') : EMPTY) + ' ' + (c || '∅'); }
    case 'mtable': { const rows = kidsEl(n); const cols = rows.length ? kidsEl(rows[0]).length : 0; return 'table ' + rows.length + '×' + cols + '[' + rows.map(r => kidsEl(r).map(c => compact(c)).join(' | ')).join(' ; ') + ']'; }
    case 'mtr': case 'mlabeledtr': return k.join(' | ');
    case 'mtd': return k.length ? k.join(' ') : EMPTY;
    case 'menclose': return 'enclose[' + (n.attrs.notation || 'longdiv') + '](' + (k.length ? k.join(' ') : EMPTY) + ')';
    case 'mstyle': case 'mpadded': case 'mphantom': case 'merror': return n.name + (Object.keys(n.attrs).length ? '[' + Object.entries(n.attrs).map(([a, v]) => a + '=' + v).join(',') + ']' : '') + '(' + (k.length ? k.join(' ') : EMPTY) + ')';
    case 'mspace': return 'space[' + Object.entries(n.attrs).map(([a, v]) => a + '=' + v).join(',') + ']';
    case 'mlongdiv': case 'mstack': case 'msgroup': case 'msrow': case 'mscarries': case 'mscarry': case 'msline': return n.name + '(' + k.join(' ') + ')';
    default: return n.name + '(' + k.join(' ') + ')';
  }
}
function count(n, pred) { if (!n) return 0; let c = pred(n) ? 1 : 0; for (const k of n.kids || []) c += count(k, pred); return c; }
function findPath(n, pred, path = []) {
  if (!n || n.name === '#text') return null;
  if (pred(n)) return path.concat(n);
  for (const k of n.kids) { const r = findPath(k, pred, path.concat(n)); if (r) return r; }
  return null;
}
const NAMES = { mfrac: 'fraction', msqrt: 'square root', mroot: 'root', msup: 'superscript', msub: 'subscript', msubsup: 'subscript+superscript', munder: 'under-script', mover: 'over-script', munderover: 'under+over scripts', mmultiscripts: 'left/right scripts', mfenced: 'fence', mtable: 'table', menclose: 'enclosure', mstyle: 'style group', mpadded: 'padding/position adjustment', mspace: 'space', mtext: 'regular text', mlongdiv: 'long division', mstack: 'elementary stack' };
function wherePath(path) {
  // describe slot position of leaf inside nearest structural ancestor
  for (let i = path.length - 2; i >= 0; i--) {
    const p = path[i];
    if (NAMES[p.name] && p.name !== 'mstyle') {
      const child = path[i + 1]; const idx = kidsEl(p).indexOf(child);
      const slotNames = { mfrac: ['numerator', 'denominator'], mroot: ['radicand', 'index'], msup: ['base', 'superscript'], msub: ['base', 'subscript'], msubsup: ['base', 'subscript', 'superscript'], munder: ['base', 'under-script'], mover: ['base', 'over-script'], munderover: ['base', 'under-script', 'over-script'] };
      const sn = slotNames[p.name]; if (!sn && kidsEl(p).length === 1) return 'inside the ' + NAMES[p.name]; return (sn && sn[idx] ? sn[idx] + ' of the ' : 'slot ' + (idx + 1) + ' of the ') + NAMES[p.name];
    }
  }
  return null;
}
function describeSingle(mml) {
  const t = parse(mml); if (!t) return '';
  const els = kidsEl(t);
  if (!els.length) return 'editor stays empty';
  return 'Result: ' + compact(t);
}
module.exports = { parse, compact, kidsEl, textOf, findPath, wherePath, NAMES, describeSingle, decode, count };
function sigs(n, out = []) {
  if (!n || n.name === '#text') return out;
  if (n.name !== 'math' || Object.keys(n.attrs || {}).length) {
    const a = Object.entries(n.attrs || {}).filter(([k]) => k !== 'xmlns').sort().map(([k, v]) => k + '=' + v).join(' ');
    out.push(n.name + (a ? '[' + a + ']' : ''));
  }
  for (const k of n.kids || []) sigs(k, out);
  return out;
}
function attrDiff(baseXml, afterXml) {
  const a = sigs(parse(baseXml)), b = sigs(parse(afterXml));
  const cnt = (arr) => arr.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
  const ca = cnt(a), cb = cnt(b); const add = [], rem = [];
  for (const k of Object.keys(cb)) { const d = cb[k] - (ca[k] || 0); for (let i = 0; i < d; i++) add.push(k); }
  for (const k of Object.keys(ca)) { const d = ca[k] - (cb[k] || 0); for (let i = 0; i < d; i++) rem.push(k); }
  return { add, rem };
}
function diffText(baseXml, afterXml) {
  const d = attrDiff(baseXml, afterXml);
  if (!d.add.length && !d.rem.length) return 'no change';
  const f = x => { const m = {}; x.forEach(s => m[s] = (m[s] || 0) + 1); return Object.entries(m).map(([k, v]) => v > 1 ? `${k} ×${v}` : k).join(', '); };
  return (d.add.length ? '+ ' + f(d.add) : '') + (d.add.length && d.rem.length ? '  ' : '') + (d.rem.length ? '− ' + f(d.rem) : '');
}
module.exports.attrDiff = attrDiff; module.exports.diffText = diffText;
