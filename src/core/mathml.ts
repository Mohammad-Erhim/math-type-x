/**
 * Presentation-MathML parser and serialiser for the document model.
 *
 * Serialisation rules (SRS 7.2): no whitespace between elements, empty elements self-closed,
 * non-ASCII characters as upper-case numeric references, the five XML specials escaped
 * (apostrophe literal), empty slots serialised as <mrow/>.
 */
import { El, Row, Attr, TOKENS, getAttr, newGroup } from './model';

export const MML_NS = 'http://www.w3.org/1998/Math/MathML';
export const WRS_NS = 'http://www.wiris.com/xml/mathml-extension';

/** slot style: 'a' = argument (wrapped in <mrow> unless exactly one element), 'i' = inline children */
type Style = 'a' | 'i';

export const SPEC: Record<string, Style[]> = {
  mfrac: ['a', 'a'],
  mroot: ['a', 'a'],
  msup: ['a', 'a'],
  msub: ['a', 'a'],
  msubsup: ['a', 'a', 'a'],
  munder: ['a', 'a'],
  mover: ['a', 'a'],
  munderover: ['a', 'a', 'a'],
  mfenced: ['a'],
  maction: ['a'],
  msqrt: ['i'],
  menclose: ['i'],
  mstyle: ['i'],
  mpadded: ['i'],
  mrow: ['i'],
  merror: ['i'],
  mphantom: ['i'],
  mstack: ['i'],
  msrow: ['i'],
  msgroup: ['i'],
  mscarries: ['i'],
  mlongdiv: ['a', 'a', 'i'],
};

/** children of mstack / msgroup that are rows themselves (never wrapped into an msrow) */
const STACK_ITEMS = new Set(['msrow', 'msline', 'mscarries', 'msgroup', 'mlongdiv', 'mstack']);
const STACK_CONTAINERS = new Set(['mstack', 'msgroup']);

export class MathMLError extends Error {}

export interface Limits {
  maxDepth: number;
  maxNodes: number;
}
export const DEFAULT_LIMITS: Limits = { maxDepth: 64, maxNodes: 20000 };

/* ------------------------------------------------------------------ XML */

interface XNode {
  name: string;
  attrs: Attr[];
  children: (XNode | string)[];
}

const ENT: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s: string): string {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, g: string) => {
    if (g[0] === '#') {
      const cp = g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) throw new MathMLError('bad character reference');
      return String.fromCodePoint(cp);
    }
    const r = ENT[g];
    if (r === undefined) throw new MathMLError('unknown entity &' + g + ';');
    return r;
  });
}

export function parseXml(src: string, limits: Limits = DEFAULT_LIMITS): XNode {
  if (/<!DOCTYPE|<!ENTITY/i.test(src)) throw new MathMLError('DOCTYPE/ENTITY declarations are not allowed');
  let i = 0;
  const n = src.length;
  let nodes = 0;
  const stack: XNode[] = [];
  let root: XNode | null = null;
  const fail = (m: string): never => {
    throw new MathMLError(m + ' at ' + i);
  };
  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt < 0) {
      const t = src.slice(i);
      if (t.trim() !== '') {
        if (!stack.length) fail('text outside root');
        stack[stack.length - 1].children.push(decodeEntities(t));
      }
      break;
    }
    if (lt > i) {
      const t = src.slice(i, lt);
      if (stack.length) stack[stack.length - 1].children.push(decodeEntities(t));
      else if (t.trim() !== '') fail('text outside root');
    }
    i = lt;
    if (src.startsWith('<!--', i)) {
      const e = src.indexOf('-->', i + 4);
      if (e < 0) fail('unterminated comment');
      i = e + 3;
      continue;
    }
    if (src.startsWith('<![CDATA[', i)) {
      const e = src.indexOf(']]>', i + 9);
      if (e < 0) fail('unterminated CDATA');
      if (stack.length) stack[stack.length - 1].children.push(src.slice(i + 9, e));
      i = e + 3;
      continue;
    }
    if (src.startsWith('<?', i)) {
      const e = src.indexOf('?>', i + 2);
      if (e < 0) fail('unterminated PI');
      i = e + 2;
      continue;
    }
    if (src.startsWith('</', i)) {
      const e = src.indexOf('>', i);
      if (e < 0) fail('unterminated end tag');
      const name = src.slice(i + 2, e).trim();
      const top = stack.pop();
      if (!top || top.name !== name) fail('mismatched end tag </' + name + '>');
      i = e + 1;
      continue;
    }
    // start tag
    let j = i + 1;
    const m = /^[A-Za-z_][\w:.\-]*/.exec(src.slice(j, j + 128));
    if (!m) fail('bad tag name');
    const name = m![0];
    j += name.length;
    const attrs: Attr[] = [];
    let selfClose = false;
    for (;;) {
      while (j < n && /\s/.test(src[j])) j++;
      if (j >= n) fail('unterminated start tag');
      if (src[j] === '/') {
        if (src[j + 1] !== '>') fail('bad tag');
        selfClose = true;
        j += 2;
        break;
      }
      if (src[j] === '>') {
        j++;
        break;
      }
      const am = /^([A-Za-z_][\w:.\-]*)\s*=\s*("([^"]*)"|'([^']*)')/.exec(src.slice(j, j + 4096));
      if (!am) fail('bad attribute');
      attrs.push([am![1], decodeEntities(am![3] !== undefined ? am![3] : am![4])]);
      j += am![0].length;
    }
    if (++nodes > limits.maxNodes) fail('too many nodes');
    const node: XNode = { name, attrs, children: [] };
    if (stack.length) stack[stack.length - 1].children.push(node);
    else if (root) fail('multiple roots');
    else root = node;
    if (!selfClose) {
      stack.push(node);
      if (stack.length > limits.maxDepth) fail('document too deep');
    }
    i = j;
  }
  if (stack.length) fail('unclosed element');
  if (!root) fail('no root element');
  return root!;
}

/* ------------------------------------------------------------- document */

export interface MathDoc {
  /** root element attributes except xmlns* (style, dir …) */
  attrs: Attr[];
  /** namespace declarations present on the root (xmlns:wrs) */
  row: Row;
}

function elChildren(x: XNode): XNode[] {
  return x.children.filter((c): c is XNode => typeof c !== 'string');
}

function textOf(x: XNode): string {
  return x.children.map((c) => (typeof c === 'string' ? c : textOf(c))).join('');
}

function stripPrefix(name: string): string {
  const k = name.indexOf(':');
  return k >= 0 && name.slice(0, k) !== 'xmlns' && name.slice(0, k) !== 'wrs' ? name.slice(k + 1) : name;
}

function parseAttrs(x: XNode): Attr[] {
  return x.attrs.filter(([k]) => k !== 'xmlns' && !k.startsWith('xmlns:'));
}

function parseRowChildren(x: XNode, out: Row): void {
  const styled = stripPrefix(x.name) === 'mstyle' && x.children.filter((c) => typeof c !== 'string').length > 1;
  for (const c of x.children) {
    if (typeof c === 'string') {
      if (c.trim() !== '') out.push({ t: 'mtext', a: [], x: c.trim() });
      continue;
    }
    // the argument group of a styled bracket pair (mstyle: mo, mrow, mo) is kept as a group
    if (styled && stripPrefix(c.name) === 'mrow' && parseAttrs(c).length === 0 && c.children.length > 0) {
      const inner: Row = [];
      parseRowChildren(c, inner);
      out.push({ t: 'mrow', a: [], c: [inner] });
      continue;
    }
    parseInto(c, out);
  }
}

/** parse element `x` and append the resulting element(s) to `out` */
function parseInto(x: XNode, out: Row): void {
  const name = stripPrefix(x.name);
  const attrs = parseAttrs(x);
  if (name === 'mrow' && attrs.length === 0) {
    // an empty group after an operator stays (e.g. the empty argument of a styled bracket); between other elements the
    // reference shows nothing and keeps no room for it
    if (x.children.length === 0 && out.length > 0) {
      if (out[out.length - 1].t === 'mo') out.push({ t: 'mrow', a: [], c: [[]] });
      return;
    }
    parseRowChildren(x, out);
    return;
  }
  if (name === 'semantics') {
    const first = elChildren(x).find((c) => stripPrefix(c.name) !== 'annotation' && stripPrefix(c.name) !== 'annotation-xml');
    if (first) parseInto(first, out);
    return;
  }
  if (TOKENS.has(name)) {
    const text = name === 'mtext' || name === 'ms' ? textOf(x) : textOf(x).replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
    if (name === 'mo' && getAttr({ t: 'mo', a: attrs }, 'largeop') === 'true' && text === '') {
      out.push({ t: 'mo', a: attrs, c: [[]] });
      return;
    }
    const chars = Array.from(text);
    if (chars.length > 1 && name !== 'mspace' && name !== 'none') {
      const g = newGroup();
      for (const ch of chars) out.push({ t: name, a: attrs.map(([k, v]) => [k, v] as Attr), x: ch, g });
      return;
    }
    out.push({ t: name, a: attrs, x: text, g: text === '' ? undefined : newGroup() });
    return;
  }
  if (name === 'mtable') {
    const rows = elChildren(x).filter((c) => /^(mtr|mlabeledtr)$/.test(stripPrefix(c.name)));
    const cells: Row[][] = rows.map((r) =>
      elChildren(r)
        .filter((c) => stripPrefix(c.name) === 'mtd')
        .map((td) => {
          const r2: Row = [];
          parseRowChildren(td, r2);
          return r2;
        }),
    );
    const cols = Math.max(1, ...cells.map((r) => r.length));
    const flat: Row[] = [];
    for (const r of cells) for (let k = 0; k < cols; k++) flat.push(r[k] ?? []);
    out.push({ t: 'mtable', a: attrs, c: flat, cols });
    return;
  }
  if (name === 'mmultiscripts') {
    // children: base, (sub sup)*, [mprescripts, (sub sup)*]
    const kids = elChildren(x);
    const slots: Row[] = [];
    let pre = -1;
    kids.forEach((k, idx) => {
      if (stripPrefix(k.name) === 'mprescripts') pre = idx;
    });
    const toRow = (k: XNode | undefined): Row => {
      const r: Row = [];
      if (!k || stripPrefix(k.name) === 'none') return r;
      parseInto(k, r);
      return r;
    };
    const noneMark = (k: XNode | undefined) => !!k && stripPrefix(k.name) === 'none';
    slots.push(toRow(kids[0]));
    const post = pre < 0 ? kids.slice(1) : kids.slice(1, pre);
    const prescr = pre < 0 ? [] : kids.slice(pre + 1);
    const nones: number[] = [];
    [...post, ...prescr].forEach((k, idx) => {
      if (noneMark(k)) nones.push(idx);
    });
    for (const k of post) slots.push(toRow(k));
    for (const k of prescr) slots.push(toRow(k));
    const el: El = { t: 'mmultiscripts', a: attrs, c: slots, cols: post.length };
    // remember which script positions were <none/> (empty and not editable placeholders)
    if (nones.length) el.x = nones.join(',');
    out.push(el);
    return;
  }
  let spec = SPEC[name];
  if (name === 'mfenced') {
    const n = Math.max(1, elChildren(x).length);
    spec = Array(n).fill('a') as Style[];
  }
  const kids = x.children.filter((c) => typeof c !== 'string' || c.trim() !== '');
  if (!spec) {
    // unknown element: generic inline container (best effort, element preserved)
    const r: Row = [];
    parseRowChildren(x, r);
    out.push({ t: name, a: attrs, c: [r] });
    return;
  }
  const slots: Row[] = [];
  if (spec.length === 1 && spec[0] === 'i') {
    const r: Row = [];
    if (STACK_CONTAINERS.has(name)) {
      for (const c of x.children) {
        if (typeof c === 'string') continue;
        const tmp: Row = [];
        parseInto(c, tmp);
        const cn = stripPrefix(c.name);
        if (STACK_ITEMS.has(cn) || cn === 'none') r.push(...tmp);
        else r.push({ t: 'msrow', a: [], c: [tmp] });
      }
    } else parseRowChildren(x, r);
    slots.push(r);
  } else {
    const ch = kids.filter((c): c is XNode => typeof c !== 'string');
    for (let s = 0; s < spec.length; s++) {
      const r: Row = [];
      if (spec[s] === 'a') {
        const k = ch[s];
        if (k) {
          const kn = stripPrefix(k.name);
          if (kn === 'mrow' && parseAttrs(k).length === 0) parseRowChildren(k, r);
          else parseInto(k, r);
        }
        slots.push(r);
      } else {
        // inline slot swallows the remaining children
        for (const k of ch.slice(s)) parseInto(k, r);
        slots.push(r);
        break;
      }
    }
    while (slots.length < spec.length) slots.push([]);
  }
  out.push({ t: name, a: attrs, c: slots });
}

export function parseMathML(src: string, limits: Limits = DEFAULT_LIMITS): MathDoc {
  const root = parseXml(src, limits);
  const name = stripPrefix(root.name);
  if (name !== 'math') throw new MathMLError('root element must be <math>');
  const row: Row = [];
  parseRowChildren(root, row);
  // a whole-equation mstyle (font size, alignment of the lines) is a style of the document, not an element: the lines of
  // the formula stay lines of the document. It is kept as pseudo attributes of the root (see serializeMathML)
  const attrs = parseAttrs(root);
  let r = row;
  while (r.length === 1 && r[0].t === 'mstyle' && r[0].c && r[0].c.length === 1 && r[0].a.length > 0 && r[0].a.every(([k]) => DOC_STYLE_KEYS.includes(k)) && !r[0].a.some(([k]) => attrs.some(([q]) => q === DOC_STYLE_PREFIX + k))) {
    for (const [k, v] of r[0].a) attrs.push([DOC_STYLE_PREFIX + k, v]);
    r = r[0].c[0];
  }
  return { attrs, row: r };
}

/* ----------------------------------------------------------- serialiser */

export function escText(s: string): string {
  let o = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (ch === '&') o += '&amp;';
    else if (ch === '<') o += '&lt;';
    else if (ch === '>') o += '&gt;';
    else if (ch === '"') o += '&quot;';
    else if (cp > 0x7e || cp < 0x20) o += '&#x' + cp.toString(16).toUpperCase() + ';';
    else o += ch;
  }
  return o;
}

function attrStr(a: Attr[]): string {
  let o = '';
  for (const [k, v] of a) o += ' ' + k + '="' + escText(v) + '"';
  return o;
}

function ser(e: El): string {
  // the reference always writes the alignment of a stack (right when it was not given)
  const a = attrStr(e.t === 'mstack' && !e.a.some(([k]) => k === 'stackalign') ? [...e.a, ['stackalign', 'right'] as Attr] : e.a);
  if (e.c === undefined) {
    const x = e.x ?? '';
    if (x === '' && !(e.t === 'mo' || e.t === 'mi' || e.t === 'mn' || e.t === 'mtext')) return `<${e.t}${a}/>`;
    return x === '' ? `<${e.t}${a}></${e.t}>` : `<${e.t}${a}>${escText(x)}</${e.t}>`;
  }
  if (e.t === 'mo' && e.c.length === 1 && e.a.some(([k, v]) => k === 'largeop' && v === 'true')) {
    // editable big operator: its slot holds the symbol text
    const text = e.c[0].map((t) => t.x ?? '').join('');
    return `<mo${a}>${escText(text)}</mo>`;
  }
  if (e.t === 'mtable') {
    const cols = e.cols ?? 1;
    const rows = Math.max(0, Math.ceil(e.c.length / cols));
    if (rows === 0) return `<mtable${a}/>`;
    let o = `<mtable${a}>`;
    for (let r = 0; r < rows; r++) {
      o += '<mtr>';
      for (let c = 0; c < cols; c++) {
        const cell = e.c[r * cols + c] ?? [];
        o += cell.length ? '<mtd>' + serRow(cell) + '</mtd>' : '<mtd/>';
      }
      o += '</mtr>';
    }
    return o + '</mtable>';
  }
  if (e.t === 'mmultiscripts') {
    const post = e.cols ?? 0;
    const nones = new Set((e.x ?? '').split(',').filter(Boolean).map(Number));
    let o = `<mmultiscripts${a}>` + serArg(e.c[0]);
    const scr = e.c.slice(1);
    let k = 0;
    const emit = (r: Row) => {
      o += nones.has(k) && r.length === 0 ? '<none/>' : serArg(r);
      k++;
    };
    scr.slice(0, post).forEach(emit);
    if (scr.length > post || (e.x !== undefined && post === 0) || true) {
      o += '<mprescripts/>';
      scr.slice(post).forEach(emit);
    }
    return o + `</mmultiscripts>`;
  }
  const spec = e.t === 'mfenced' ? (Array(Math.max(1, e.c.length)).fill('a') as Style[]) : SPEC[e.t];
  if (spec && !(spec.length === 1 && spec[0] === 'i')) {
    let o = `<${e.t}${a}>`;
    e.c.forEach((r, s) => {
      o += spec[s] === 'i' ? serRow(r) : serArg(r);
    });
    return o + `</${e.t}>`;
  }
  if (e.t === 'msrow' && e.a.length === 0) {
    const it = serItems(e.c[0] ?? []);
    if (it.length === 1 && !(e.c[0].length === 1 && STACK_ITEMS.has(e.c[0][0].t))) return it[0];
  }
  // inline container (single slot)
  const body = serRow(e.c[0] ?? []);
  return body === '' ? `<${e.t}${a}/>` : `<${e.t}${a}>${body}</${e.t}>`;
}

const attrSig = (a: Attr[]) => a.map(([k, v]) => k + '=' + v).join(';');

function serItems(r: Row): string[] {
  const o: string[] = [];
  for (let i = 0; i < r.length; i++) {
    const e = r[i];
    if (e.c === undefined && e.g !== undefined && e.x !== undefined && e.x !== '' && e.t !== 'mspace' && e.t !== 'none') {
      // merge a run of token characters of one group into a single element
      const sig = attrSig(e.a);
      let text = e.x;
      let k = i + 1;
      while (k < r.length && r[k].c === undefined && r[k].g === e.g && r[k].t === e.t && r[k].x !== undefined && attrSig(r[k].a) === sig) {
        text += r[k].x;
        k++;
      }
      let a = e.a;
      if (e.t === 'mi' && k - i === 1 && e.up && getAttr(e, 'mathvariant') === undefined) a = [['mathvariant', 'normal'], ...a];
      o.push(`<${e.t}${attrStr(a)}>${escText(text)}</${e.t}>`);
      i = k - 1;
      continue;
    }
    o.push(ser(r[i]));
  }
  return o;
}

function serRow(r: Row): string {
  return serItems(r).join('');
}

function serArg(r: Row): string {
  const it = serItems(r);
  if (it.length === 0) return '<mrow/>';
  if (it.length === 1) return it[0];
  return '<mrow>' + it.join('') + '</mrow>';
}

export function serializeRow(r: Row): string {
  return serRow(r);
}

/**
 * Serialise a document.
 * @param attrs root attributes (style, dir …); xmlns declarations are generated.
 */
/** pseudo attributes of the root: the whole equation's `mstyle` (mathsize, indentalign) as a style of the document */
export const DOC_STYLE_PREFIX = 'wrs-doc:';
export const DOC_STYLE_KEYS = ['mathsize', 'indentalign'];
export function docStyleOf(attrs: Attr[] | undefined): { mathsize?: string; indentalign?: string } {
  const out: { mathsize?: string; indentalign?: string } = {};
  for (const [k, v] of attrs ?? []) if (k.startsWith(DOC_STYLE_PREFIX)) (out as Record<string, string>)[k.slice(DOC_STYLE_PREFIX.length)] = v;
  return out;
}

export function serializeMathML(row: Row, attrs: Attr[] = [], opts: { xmlns?: boolean } = {}): string {
  const xmlns = opts.xmlns !== false;
  // the document style is written back as the wrapping mstyle (one element holding all of its attributes)
  const doc = attrs.filter(([k]) => k.startsWith(DOC_STYLE_PREFIX));
  if (doc.length) {
    row = [{ t: 'mstyle', a: doc.map(([k, v]) => [k.slice(DOC_STYLE_PREFIX.length), v] as Attr), c: [row] }];
    attrs = attrs.filter(([k]) => !k.startsWith(DOC_STYLE_PREFIX));
  }
  const body = serRow(row);
  const hasWrs = attrs.some(([k]) => k.startsWith('wrs:')) || /\bwrs:[a-z]+="/.test(body);
  const head =
    '<math' +
    attrStr(attrs) +
    (hasWrs ? ` xmlns:wrs="${WRS_NS}"` : '') +
    (xmlns ? ` xmlns="${MML_NS}"` : '');
  return body === '' ? head + '/>' : head + '>' + body + '</math>';
}
