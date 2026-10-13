/**
 * Layout engine: turns the document model into positioned drawing items.
 *
 * Pure TypeScript (no DOM) so that it is shared by the browser renderer, the icon generator and the
 * server-side image renderer. Coordinates are CSS px, y grows downwards, the baseline of a box is y = 0.
 * Constants were calibrated against the measured geometry of the reference editor (16 px base size,
 * integer pixel grid, Arial advances) — see evidence/measure_*.json and tests/layout.test.ts.
 */
import { El, Row, getAttr } from '../core/model';
import { glyphText } from './glyphs';
import { tokenInfo, FontKind, isBigOp, isIntegral } from './metrics';
import rtlMirror from '../data/rtl-mirror.json';

/* ---------------------------------------------------------------- items */

export type Item =
  | { k: 'g'; x: number; y: number; text: string; size: number; font: FontKind; italic?: boolean; bold?: boolean; color?: string; w?: number; flip?: boolean }
  | { k: 'f'; x: number; y: number; ch: string; w: number; a: number; d: number; size: number; color?: string; close?: boolean; dy?: number }
  | { k: 'r'; x: number; y: number; w: number; h: number; color?: string; ui?: boolean }
  | { k: 'p'; x: number; y: number; d: string; color?: string; fill?: boolean; sw?: number; ui?: boolean; flip?: boolean }
  | { k: 's'; x: number; y: number; w: number; h: number; small?: boolean };

export interface Placed {
  b: Box;
  x: number;
  y: number;
}

export interface Box {
  w: number;
  a: number;
  d: number;
  items?: Item[];
  kids?: Placed[];
  row?: {
    key: string;
    path: [number, number][];
    xs: number[];
    a: number;
    d: number;
    size: number;
    /** per caret position baselines (rows whose positions lie on different lines: the stack level of an elementary stack) */
    ys?: number[];
    /** caret positions that can be reached (all when absent) */
    stops?: boolean[];
    /** caret rectangle of every position: top relative to the row baseline and height */
    ct?: number[];
    ch?: number[];
    /** 1 when the row holds a symbol-font glyph (its line is a pixel taller above the baseline) */
    lift?: number;
    /** depth below the baseline the underline caret goes by (the row's own depth when absent) */
    uld?: number;
    /** x positions a mouse click snaps to (stack rows: the left edges of the cells) when they differ from xs */
    hx?: number[];
    /** merged runs of characters [from, to): the underline of a caret inside one covers just the run */
    runs?: [number, number][];
    /** underline caret per position (stack levels): x0, x1 relative to the row origin, y relative to the baseline */
    ul?: ({ x0: number; x1: number; y: number } | null)[];
  };
  /** a single italic letter at the end: the row gets +1 px italic correction */
  italicEnd?: boolean;
  /** the row consists of exactly one structure element */
  kidsOnly?: boolean;
  /** the line holds symbol-font operator glyphs (they sit a pixel higher inside a radical) */
  lift?: number;
}

export interface Layout {
  w: number;
  a: number;
  d: number;
  items: Item[];
  rows: Map<
    string,
    {
      path: [number, number][];
      x: number;
      y: number;
      a: number;
      d: number;
      xs: number[];
      size: number;
      ys?: number[];
      stops?: boolean[];
      ct?: number[];
      ch?: number[];
      lift?: number;
      uld?: number;
      hx?: number[];
      runs?: [number, number][];
      ul?: ({ x0: number; x1: number; y: number } | null)[];
      /** root row: which elements are structures (hit testing) */
      structs?: boolean[];
    }
  >;
}

/* ------------------------------------------------------------ constants */

export const K = {
  /** ascent of the sans font box (em); the row container adds PAD above it */
  asc: 0.905,
  pad: 2,
  /** row container height of an empty row (caret height) */
  slotW: 7,
  slotBoxH: 12,
  axis: 8.0, // centre of a table above the baseline (px at 16)
  fracShift: 13, // numerator / denominator baseline offset from the row baseline (px at 16)
  fracRuleTop: -7.5, // rule top relative to the baseline
  fracPad: 2,
  supShift: 8.64,
  rootIndexShift: 7.64, // index of a radical above the baseline
  subShift: 3.38,
  subSupExtra: 2,
  radW: 13,
  radTop: 4,
  scriptScale: 0.75,
  /** big operators: glyph drop and script / limit drop below the baseline (fractions of the operator size) */
  /** space between the lines of a multi-line formula */
  lineGap: 5,
  bigDrop: 0.1,
  bigScriptDrop: 0.15,
  scriptScale2: 0.625,
  minScript: 10,
};

/** line box height of the sans font for a size (px) – the reference reports 14 @12, 18 @16, 27 @24 */
export function boxH(size: number): number {
  const t: Record<number, number> = { 8: 9, 9: 10, 10: 11, 11: 13, 12: 14, 14: 16, 16: 18, 18: 20, 20: 22, 22: 25, 24: 27, 26: 29, 28: 32, 32: 36, 36: 41, 48: 54, 72: 81 };
  return t[Math.round(size)] ?? Math.round(size * 1.12);
}

export interface Env {
  size: number;
  /** 0 = text, 1 = script, 2 = scriptscript */
  level: number;
  display: boolean;
  color?: string;
  rtl?: boolean;
  /** number of enclosing fractions whose numerator / denominator the element sits in (not reset by brackets or roots) */
  fracDepth?: number;
  /** the line of this structure holds a symbol-font glyph: its baseline is a pixel lower, scripts keep their place */
  lineLift?: number;
  /** mathvariant inherited from an enclosing mstyle */
  variant?: string;
}

export function scriptEnv(e: Env): Env {
  const level = e.level + 1;
  // script sizes of the reference: 12, 10, then 8 px (at a 16 px text size)
  const size = level >= 3 ? 8 : level >= 2 ? Math.max(K.minScript, 16 * K.scriptScale2) : Math.max(K.minScript, e.size * K.scriptScale);
  return { ...e, level, size, display: false };
}

const sc = (e: Env) => e.size / 16;

/* -------------------------------------------------------------- helpers */

const mk = (w: number, a: number, d: number, items?: Item[], kids?: Placed[]): Box => ({ w, a, d, items, kids });

/** row ascent / descent of a text row at `size` */
/** space above the glyph box: 2 px, 1 px for the smallest script sizes (measured on the reference) */
function padOf(size: number): number {
  return size >= 11 ? K.pad : K.pad - 1;
}

function textAsc(size: number): number {
  return K.asc * size + padOf(size);
}
function textDesc(size: number): number {
  return boxH(size) - K.asc * size;
}

function emptySlot(env: Env): Box {
  const s = sc(env);
  const a = textAsc(env.size) + 0.5;
  const d = textDesc(env.size) - 0.5;
  const h = K.slotBoxH * s;
  return mk(K.slotW * s, a, d, [{ k: 's', x: 0, y: -h - 0.5 * s, w: K.slotW * s, h, small: env.level > 0 }]);
}

export const pathKey = (p: [number, number][]): string => p.map(([i, s]) => i + ':' + s).join('/');

/* ----------------------------------------------------------- row layout */

interface Atom {
  /** element index range [from, to) */
  from: number;
  to: number;
  box: Box;
  tag: string;
  lpad: number;
  rpad: number;
  /** italic letters: +1 before non-letters */
  italic: boolean;
  /** caret x offsets inside a merged run (relative to atom left), for from+1 .. to-1 */
  inner?: number[];
}

/** 1 when the row holds an operator glyph of the symbol font (its line is a pixel taller above the baseline) */
function rowLift(row: Row, env: Env, stack = false): number {
  return env.size >= 15.5 &&
    row.some((el) => {
      if (stack && el.c === undefined && (el.t === 'none' || (el.t === 'mn' && el.x && !/^\p{Nd}$/u.test(el.x)))) return true;
      if (el.c !== undefined || !el.x || el.t === 'mspace' || el.t === 'none' || el.t === 'mprescripts') return false;
      const cp = el.x.codePointAt(0) ?? 0;
      if (el.t === 'mo' && (isBigOp(cp) || getAttr(el, 'largeop') === 'true')) return false;
      const mv = getAttr(el, 'mathvariant') ?? '';
      return tokenInfo(el.t, mv, el.x, env.size).font === 'math' && !(mv && mv !== 'normal' && mv !== 'italic' && mv !== 'bold' && mv !== 'bold-italic');
    })
    ? 1
    : 0;
}

/** layout one row (a slot or the root) */
export function layoutRow(row: Row, env: Env, path: [number, number][] = [], base = 0): Box {
  if (row.length === 0) {
    const e = emptySlot(env);
    const b = mk(e.w, e.a, e.d, e.items);
    b.row = { key: pathKey(path), path, xs: [e.w / 2, e.w / 2], a: e.a, d: e.d, size: env.size };
    return b;
  }
  // a line holding an operator glyph of the symbol font is a pixel taller above its baseline (see tokenAtom)
  const lineLift = rowLift(row, env);
  const atoms: Atom[] = [];
  let i = 0;
  while (i < row.length) {
    const el = row[i];
    if (el.c === undefined && el.x !== undefined && el.x !== '' && el.t !== 'mspace' && el.t !== 'none' && el.t !== 'mprescripts' && el.g !== undefined) {
      // merged run of token characters
      let j = i + 1;
      const sig = el.a.map(([k, v]) => k + v).join(';');
      while (j < row.length && row[j].c === undefined && row[j].g === el.g && row[j].t === el.t && row[j].x !== undefined && row[j].a.map(([k, v]) => k + v).join(';') === sig) j++;
      atoms.push(tokenAtom(row, i, j, env));
      i = j;
      continue;
    }
    if (el.c === undefined) {
      atoms.push(tokenAtom(row, i, i + 1, env));
      i++;
      continue;
    }
    const b = layoutEl(el, lineLift ? { ...env, lineLift } : env, path, base + i);
    atoms.push({ from: i, to: i + 1, box: b, tag: el.t, lpad: 0, rpad: 0, italic: false });
    i++;
  }
  // stretchy delimiters (mo stretchy="true") grow to the height of the other atoms of the row
  const STRETCH = /^[()[\]{}|\u2016\u27e8\u27e9\u2308\u2309\u230a\u230b<>]$/;
  const isStretchy = (at: Atom) => at.tag === 'mo' && at.to - at.from === 1 && getAttr(row[at.from], 'stretchy') === 'true' && STRETCH.test(row[at.from].x ?? '');
  if (atoms.some(isStretchy)) {
    const others = atoms.filter((at) => !isStretchy(at));
    if (others.length) {
      const a0 = Math.max(...others.map((at) => at.box.a));
      const d0 = Math.max(...others.map((at) => at.box.d));
      const tall0 = a0 + d0 > textAsc(env.size) + textDesc(env.size) + 2;
      const s0 = sc(env);
      const firstOther = atoms.findIndex((at) => !isStretchy(at));
      atoms.forEach((at, n) => {
        if (!isStretchy(at)) return;
        const ch0 = row[at.from].x ?? '';
        const closing = /^[)\]}\u27e9\u2309\u230b>]$/.test(ch0) || (/^[|\u2016]$/.test(ch0) && n > firstOther);
        const ch = ch0 === '\u2016' ? '||' : ch0;
        const gw0 = tall0 ? 4.69 * s0 : ch === '|' ? 3.75 * s0 : ch === '{' || ch === '}' ? 5.34 * s0 : 4.25 * s0;
        at.box = fenceBox(ch, closing, a0, d0, env, tall0, gw0);
        // like the brackets of mfenced: one pixel in front of the opening one, one more before a tall closing one
        at.lpad = closing ? (tall0 && !/^(\||\|\||\{|\})$/.test(ch) ? 1 : 0) : Math.round(1 * s0);
        at.rpad = 0;
      });
    }
  }
  // place atoms
  const kids: Placed[] = [];
  const xs: number[] = new Array(row.length + 1).fill(0);
  let x = 0;
  let a = textAsc(env.size);
  let d = textDesc(env.size);
  let prev: Atom | null = null;
  // script sizes are laid out with fractional advances and paddings (the root size snaps to whole pixels)
  const whole = env.size >= 15.5;
  const icor = whole ? 1 : env.size / 16;
  atoms.forEach((at, n) => {
    // a sign (+, −, ±) at the start or the end of a line has no operator spacing (measured on the reference);
    // in front of an operand it takes no space after it either
    if (at.tag === 'mo' && (n === 0 || n === atoms.length - 1) && /^[+\-\u2212\u00b1\u2213]$/.test(row[at.from].x ?? '')) {
      at.lpad = 0;
      if (n === 0) at.rpad = 0;
    }
    let gap = at.lpad;
    if (prev) {
      gap += prev.rpad;
      if (prev.italic && !at.italic && at.tag !== 'mspace') gap += icor;
    }
    x += gap;
    if (!whole) x = Math.round(x); // script sizes: scaled (fractional) paddings, positions snap to whole pixels
    const adv = Math.round(at.box.w);
    kids.push({ b: at.box, x, y: 0 });
    // caret positions: before the atom
    xs[at.from] = x;
    if (at.inner) at.inner.forEach((ox, k) => (xs[at.from + 1 + k] = x + ox));
    a = Math.max(a, at.box.a);
    d = Math.max(d, at.box.d);
    x += adv;
    prev = at;
    void n;
  });
  // trailing italic correction and right padding
  const last = atoms[atoms.length - 1];
  if (last) x += last.rpad + (last.italic ? icor : 0);
  xs[row.length] = x - (last && last.italic ? icor : 0) - last.rpad;
  const box = mk(x, a, d, undefined, kids);
  // caret rectangle of every position: the element to its left (the first one at the start of the row) sets it
  const ct: number[] = new Array(row.length + 1).fill(0);
  const ch: number[] = new Array(row.length + 1).fill(0);
  const atomOf = (idx: number) => atoms.find((q) => idx >= q.from && idx < q.to);
  for (let q = 0; q <= row.length; q++) {
    const idx = q > 0 ? q - 1 : 0;
    const at = atomOf(idx);
    // before a script structure the caret is as tall as the text of its base
    const scriptFirst = q === 0 && row.length > 0 && ['msup', 'msub', 'msubsup', 'mmultiscripts'].includes(row[0].t);
    const r = at && !scriptFirst ? elementCaret(row[idx], at.box, env, lineLift) : [-(textAsc(env.size) + lineLift), boxH(env.size) + padOf(env.size)];
    ct[q] = r[0];
    ch[q] = r[1];
  }
  // the underline caret goes below fences and subscripts a little further than the boxes reach (measured on the reference)
  let uld = d;
  for (const q of atoms) {
    const t = row[q.from].t;
    if (row[q.from].c === undefined) continue;
    if (t === 'mfenced') uld = Math.max(uld, q.box.d + 4);
    else if (t === 'msub' || t === 'msubsup' || t === 'munder' || t === 'munderover' || t === 'mmultiscripts') uld = Math.max(uld, q.box.d + 2);
  }
  box.row = { key: pathKey(path), path, xs, a, d, size: env.size, ct, ch, lift: lineLift, uld, runs: atoms.filter((q) => q.to - q.from > 1).map((q) => [q.from, q.to] as [number, number]) };
  box.italicEnd = !!(last && last.italic);
  box.kidsOnly = atoms.length === 1 && row[0].c !== undefined;
  box.lift = lineLift;
  return box;
}

/** caret rectangle next to an element: [top relative to the baseline, height] (measured on the reference) */
function elementCaret(el: El, box: Box, env: Env, lift: number): [number, number] {
  if (el.c !== undefined) {
    // the placeholder of an empty argument: the caret is as tall as its green box
    if (el.t === 'maction' && box.items && box.items.some((q) => q.k === 's')) {
      const s = env.size / 16;
      return [-box.a + 1 * s, box.a + box.d - 3 * s];
    }
    return [-box.a, box.a + box.d];
  }
  const size = env.size;
  const whole = size >= 15.5;
  const g = box.items && box.items[0] && box.items[0].k === 'g' ? box.items[0] : null;
  // enlarged operator glyphs (sums, integrals) carry their own box
  if (g && g.size > size * 1.01) return [-box.a, box.a + box.d];
  const padC = whole ? 2 : 1;
  const top = -(K.asc * size + padC + (whole ? lift : 0));
  let h = boxH(size) + padC;
  if (g && g.font === 'math') h = boxH(size);
  if (el.t === 'mo' && (el.x === '(' || el.x === ')')) h = boxH(size) + 1;
  return [top, h];
}

function tokenAtom(row: Row, from: number, to: number, env: Env, noLift = false): Atom {
  const el = row[from];
  const tag = el.t;
  let text = '';
  for (let k = from; k < to; k++) text += row[k].x ?? '';
  const mv = getAttr(el, 'mathvariant') ?? env.variant ?? '';
  const color = getAttr(el, 'mathcolor') ?? env.color;
  const up = row[from].up && to - from === 1 && !mv;
  let variant = mv || (up ? 'normal' : '');
  if (tag === 'mspace') {
    const w = lenPx(getAttr(el, 'width'), env);
    const h = lenPx(getAttr(el, 'height'), env);
    const dd = lenPx(getAttr(el, 'depth'), env);
    if (getAttr(el, 'linebreak') === 'newline') return { from, to, box: mk(0, 0, 0), tag, lpad: 0, rpad: 0, italic: false };
    return { from, to, box: mk(w, h, dd), tag, lpad: 0, rpad: 0, italic: false };
  }
  if (tag === 'none' || tag === 'mprescripts') return { from, to, box: mk(0, 0, 0), tag, lpad: 0, rpad: 0, italic: false };
  const largeop = tag === 'mo' && getAttr(el, 'largeop') === 'true';
  let size = env.size;
  const cp = text.codePointAt(0) ?? 0;
  const big = tag === 'mo' && (isBigOp(cp) || largeop) && to - from === 1;
  if (big && env.level === 0) size = isIntegral(cp) ? env.size * 2 : env.size * 1.5;
  // per-character info (merged runs sum up)
  const info = tokenInfo(tag, mv, text, size);
  const italicDefault = tag === 'mi' && (variant === '' || variant === 'italic') && to - from >= 1 && Array.from(text).length === 1;
  const bold = variant === 'bold' || variant === 'bold-italic';
  const italicFlag = tag === 'mi' ? (variant === '' ? Array.from(text).length === 1 : variant === 'italic' || variant === 'bold-italic') : variant === 'italic';
  let font = info.font;
  let drawn = tag === 'mo' ? text.replace(/-/g, '\u2212') : text;
  if (font === 'fraktur' || font === 'script' || font === 'double' || (font === 'math' && mv && mv !== 'normal' && mv !== 'italic' && mv !== 'bold' && mv !== 'bold-italic')) {
    drawn = glyphText(tag, text, mv);
    if (mv === 'script') font = 'script';
    else if (mv === 'fraktur') font = 'fraktur';
    else if (mv === 'double-struck') font = 'double';
  }
  if (font === 'sans' && mv === 'normal' && tag === 'mi') variant = 'normal';
  const h = boxH(size);
  // big operators: the reference's glyph box has a smaller ascent (0.1 em): the glyph hangs lower on the baseline
  const drop = big && env.level === 0 ? K.bigDrop * size : 0;
  // operator glyphs of the symbol font have a one pixel taller box above the baseline (measured on the reference):
  // letters of a line holding one sit a pixel lower; the glyph itself keeps its place
  const lift = !noLift && font === 'math' && !big && env.size >= 15.5 && size <= env.size * 1.01 ? 1 : 0;
  const asc = K.asc * size + padOf(size) - drop + lift;
  const desc = h - K.asc * size + drop;
  const items: Item[] = [{ k: 'g', x: 0, y: drop - lift, text: drawn, size, font, italic: italicFlag && font === 'sans', bold, color, w: info.w }];
  // caret positions inside a merged run
  let inner: number[] | undefined;
  if (to - from > 1) {
    inner = [];
    let acc = 0;
    const chars = Array.from(text);
    for (let k = 0; k < chars.length - 1; k++) {
      acc += tokenInfo(tag, mv, chars[k], size).w;
      inner.push(acc);
    }
  }
  void italicDefault;
  const box = mk(info.w, asc, desc, items);
  const rnd = env.size >= 15.5 ? Math.round : (v: number) => v;
  return { from, to, box, tag, lpad: rnd(info.lpad), rpad: rnd(info.rpad), italic: italicFlag && tag === 'mi' && font === 'sans', inner };
}

function lenPx(v: string | undefined, env: Env): number {
  if (!v) return 0;
  const m = /^(-?[\d.]+)\s*(px|em|ex)?$/.exec(v.trim());
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const u = m[2] ?? 'px';
  return u === 'em' ? n * env.size : u === 'ex' ? n * env.size * 0.5 : n;
}

function withColor(el: El, env: Env): Env {
  const c = getAttr(el, 'mathcolor');
  return c ? { ...env, color: c } : env;
}

/* ------------------------------------------------------------- elements */

export function layoutEl(el: El, envIn: Env, path: [number, number][], index: number): Box {
  const env = withColor(el, envIn);
  const here = (s: number) => [...path, [index, s] as [number, number]];
  const R = (s: number, e: Env = env) => layoutRow(el.c![s], e, here(s));
  switch (el.t) {
    case 'mfrac':
      return fraction(el, env, R);
    case 'msqrt': {
      const body = R(0);
      return radical(body, null, env);
    }
    case 'mroot': {
      const body = R(0);
      const idx = R(1, scriptEnv(env));
      return radical(body, idx, env);
    }
    case 'msup':
    case 'msub':
    case 'msubsup':
      return scripts(el, env, R);
    case 'munder':
    case 'mover':
    case 'munderover':
      return underOver(el, env, R);
    case 'mmultiscripts':
      return multiscripts(el, env, R);
    case 'mfenced':
      return fenced(el, env, R);
    case 'mtable':
      return table(el, env, here);
    case 'mstack':
      return elementaryStack(el, env, here);
    case 'mlongdiv':
      return longDivision(el, env, here);
    case 'menclose':
      return enclose(el, env, R(0));
    case 'mstyle': {
      const ms = getAttr(el, 'mathsize');
      const ds = getAttr(el, 'displaystyle');
      let e2 = env;
      if (ms && /px$/.test(ms)) e2 = { ...e2, size: parseFloat(ms) };
      if (ds) e2 = { ...e2, display: ds === 'true' };
      const mvs = getAttr(el, 'mathvariant');
      if (mvs) e2 = { ...e2, variant: mvs };
      return R(0, e2);
    }
    case 'mpadded':
      return padded(el, env, R(0));
    case 'mo':
      if (el.c && el.c.length === 1) return R(0, env); // empty big-operator text slot
      return mk(0, 0, 0);
    default:
      return R(0);
  }
}

function round(n: number): number {
  return Math.floor(n + 0.5);
}

function fraction(el: El, env: Env, R: (s: number, e?: Env) => Box): Box {
  const bevelled = getAttr(el, 'bevelled') === 'true';
  const s = sc(env);
  const nested = env.level > 0 || (env.size < 16);
  // fractions in a slot of a fraction keep the size of the surrounding text but are set at 75 % (observed)
  // a fraction nested in the numerator / denominator of another one is set at 3/4 of the size of its surroundings
  const depth = env.fracDepth ?? 0;
  const innerEnv: Env = { ...env, fracDepth: depth + 1 };
  if (depth > 0 && env.level === 0) innerEnv.size = Math.max(K.minScript, Math.round(env.size * K.scriptScale));
  const num = R(0, innerEnv);
  const den = R(1, innerEnv);
  void nested;
  if (bevelled) {
    // a/b with a slash: numerator raised, denominator lowered
    const gap = 1;
    const slashW = Math.round(10 * s);
    const w = round(num.w) + slashW + round(den.w) + gap * 2;
    const raise = 6 * s;
    const kids: Placed[] = [
      { b: num, x: 0, y: -raise },
      { b: den, x: round(num.w) + slashW + gap, y: raise * 0.6 },
    ];
    const h = num.a + num.d + raise;
    const slash: Item = { k: 'p', x: round(num.w) + gap, y: -(num.a + raise - 4), d: `M0 ${h * 0.95} L${slashW} 0`, sw: 1, color: env.color };
    return mk(w, num.a + raise, den.d + raise * 0.6, [slash], kids);
  }
  const shift = K.fracShift * s;
  const ruleW = Math.max(round(num.w), round(den.w)) + 4;
  const w = ruleW + 4;
  const numBase = -Math.max(shift, num.d + (num.italicEnd ? 0 : 0) + 6.5 * s - 1 + 1);
  const denBase = Math.max(shift, den.a + 0.5 * s - 0.5);
  void numBase;
  // measured: numerator baseline = rule top − 2 − num.desc ; denominator baseline = rule bottom + 1 + den.asc
  const ruleTop = K.fracRuleTop * s;
  const nb = ruleTop - (num.kidsOnly ? 1 : 2) - num.d;
  const db = ruleTop + 1 + 1 + den.a;
  const numY = Math.min(nb, -shift);
  const denY = Math.max(db, shift - 2 * s);
  const items: Item[] = [{ k: 'r', x: 2, y: ruleTop, w: ruleW, h: 1, color: env.color }];
  const kids: Placed[] = [
    { b: num, x: 2 + round((ruleW - round(num.w)) / 2), y: numY },
    { b: den, x: 2 + round((ruleW - round(den.w)) / 2), y: denY },
  ];
  return mk(w, -numY + num.a, denY + den.d, items, kids);
}


function radical(body: Box, index: Box | null, env: Env): Box {
  const s = sc(env);
  const signW = K.radW * s;
  const top = K.radTop * s;
  const contentW = round(body.w);
  const idxW = index ? round(index.w) : 0;
  const x0 = idxW > 7 * s ? idxW - 7 * s : 0;
  const barW = contentW + 4;
  const bodyX = x0 + signW + 2;
  const asc = top + body.a;
  const items: Item[] = [];
  // radical sign: small tick, long down stroke, up stroke to the bar
  const h = body.a + body.d;
  // a radicand with operator glyphs: the bar and the sign sit one more pixel up (measured on the reference)
  const y0 = -body.a - (body.lift ? 1 : 0);
  items.push({
    k: 'p',
    x: x0,
    y: y0,
    d: `M0 ${h * 0.55} L${2.2 * s} ${h * 0.5} L${5.2 * s} ${h + 0.5} L${signW} 0`,
    sw: 1,
    color: env.color,
  });
  items.push({ k: 'r', x: x0 + signW, y: y0, w: barW, h: 1, color: env.color });
  const kids: Placed[] = [{ b: body, x: bodyX, y: 0 }];
  let a = asc;
  if (index) {
    const iy = -(K.rootIndexShift * s);
    kids.push({ b: index, x: 1 * s, y: iy });
    a = Math.max(a, -iy + index.a);
  }
  return mk(x0 + signW + barW, a, body.d, items, kids);
}

function singleGlyph(b: Box): Extract<Item, { k: 'g' }> | null {
  let cur: Box | undefined = b;
  for (let i = 0; i < 4 && cur; i++) {
    if (cur.items && cur.items.length === 1 && cur.items[0].k === 'g') return cur.items[0] as Extract<Item, { k: 'g' }>;
    if (cur.items && cur.items.length) return null;
    if (!cur.kids || cur.kids.length !== 1) return null;
    cur = cur.kids[0].b;
  }
  return null;
}

function opSizeOf(base: Box): number {
  return singleGlyph(base)?.size ?? 16;
}

function bigOpBase(base: Box): boolean {
  const it = singleGlyph(base);
  return !!it && isBigOp(it.text.codePointAt(0) ?? 0);
}

function scripts(el: El, env: Env, R: (s: number, e?: Env) => Box): Box {
  const s = sc(env);
  const se = scriptEnv(env);
  const base = R(0);
  const hasSub = el.t === 'msub' || el.t === 'msubsup';
  const hasSup = el.t === 'msup' || el.t === 'msubsup';
  const sub = hasSub ? R(1, se) : null;
  const sup = hasSup ? R(el.t === 'msup' ? 1 : 2, se) : null;
  const big = bigOpBase(base);
  const bx = round(base.w); // the base row already carries its italic correction
  const kids: Placed[] = [{ b: base, x: 0, y: 0 }];
  let a = base.a;
  let d = base.d;
  let subX = bx;
  let supX = bx;
  // whole-pixel script offsets keep nested scripts on the pixel grid like the reference
  let supY = -Math.round(K.supShift * s);
  let subY = Math.round(K.subShift * s + (sup ? K.subSupExtra * s : 0));
  if (big) {
    const os = opSizeOf(base);
    subX = Math.round(base.w * 0.64);
    supX = Math.round(base.w * 1.15);
    supY = (-0.753 + K.bigScriptDrop) * os;
    subY = (0.278 + K.bigScriptDrop) * os;
  } else {
    if (sup) supY = Math.min(supY, -(sup.d + 3.5 * s) + 0);
    if (sub) subY = Math.max(subY, sub.a - 12 * s);
  }
  // the scripts keep their place when the line is lifted (their base sits a pixel lower)
  const ll = 0; // (a lifted line keeps the scripts where the base row puts them)
  if (sup) {
    kids.push({ b: sup, x: supX, y: supY - ll });
    a = Math.max(a, -(supY - ll) + sup.a);
  }
  if (sub) {
    kids.push({ b: sub, x: subX, y: subY - ll });
    d = Math.max(d, subY - ll + sub.d);
  }
  const right = Math.max(subX + (sub ? round(sub.w) : 0), supX + (sup ? round(sup.w) : 0));
  return mk(Math.max(right, bx), a, d, undefined, kids);
}

function multiscripts(el: El, env: Env, R: (s: number, e?: Env) => Box): Box {
  const s = sc(env);
  const se = scriptEnv(env);
  const post = el.cols ?? 0;
  const base = R(0);
  const total = el.c!.length;
  const kids: Placed[] = [];
  let x = 0;
  let a = base.a;
  let d = base.d;
  const pair = (boxes: Box[], x0: number): number => {
    let cx = x0;
    for (let i = 0; i < boxes.length; i += 2) {
      const sub = boxes[i];
      const sup = boxes[i + 1];
      const w = Math.max(sub ? round(sub.w) : 0, sup ? round(sup.w) : 0);
      if (sub) {
        kids.push({ b: sub, x: cx, y: K.subShift * s + 2 * s });
        d = Math.max(d, K.subShift * s + 2 * s + sub.d);
      }
      if (sup) {
        kids.push({ b: sup, x: cx, y: -K.supShift * s });
        a = Math.max(a, K.supShift * s + sup.a);
      }
      cx += w;
    }
    return cx;
  };
  const pre: Box[] = [];
  for (let k = 1 + post; k < total; k++) pre.push(R(k, se));
  x = pair(pre, 0);
  kids.push({ b: base, x, y: 0 });
  x += round(base.w) + (base.italicEnd ? 1 : 0);
  const posts: Box[] = [];
  for (let k = 1; k <= post; k++) posts.push(R(k, se));
  x = pair(posts, x);
  return mk(x, a, d, undefined, kids);
}

const ACC_BAR = new Set(['\u00AF', '\u203E', '\u02C9']);
const ACC_ARROW = new Set(['\u2192', '\u2190', '\u2194', '\u21C0', '\u21BC', '\u21C1', '\u21BD', '\u21A6', '\u21D2']);

function leafText(r: Row): string {
  return r.map((e) => (e.c === undefined ? e.x ?? '' : e.c.map(leafText).join(''))).join('');
}

/** accents over / under a short base (bar, arrow, hat, tilde, dot): measured on the reference */
function accentLayout(el: El, env: Env, R: (s: number, e?: Env) => Box): Box | null {
  if ((el.t !== 'mover' && el.t !== 'munder') || !el.c || el.c.length !== 2) return null;
  const acc = el.c[1];
  if (acc.length !== 1 || acc[0].c !== undefined || acc[0].t !== 'mo') return null;
  const ch = acc[0].x ?? '';
  const kind = ACC_BAR.has(ch) ? 'bar' : ACC_ARROW.has(ch) ? 'arrow' : ch === '^' ? 'hat' : ch === '~' || ch === '\u223C' ? 'tilde' : ch === '\u02D9' ? 'dot' : ch === '\u00A8' ? 'dia' : null;
  if (!kind) return null;
  const baseRow = el.c[0];
  const text = leafText(baseRow);
  if (!text || baseRow.some((e) => e.c !== undefined && !(e.t === 'mrow'))) return null; // only token bases
  const s = sc(env);
  const base = R(0);
  const bw = round(base.w);
  const tall = /[A-Zb-dfh-lt0-9()\[\]{}|\/]/.test(text);
  const hasDesc = /[gjpqy]/.test(text);
  const lastIt = baseRow[baseRow.length - 1];
  const italic = !!lastIt && lastIt.t === 'mi' && getAttr(lastIt, 'mathvariant') === undefined && !lastIt.up;
  const fs = 12 * s;
  const color = env.color;
  const items: Item[] = [];
  let w = bw;
  let bx = 0;
  let a = base.a;
  let d = base.d;
  if (el.t === 'mover') {
    const cy = -(tall ? 15.95 : 11.5) * s; // centre line of the accent above the baseline
    if (kind === 'bar') {
      const n = Math.max(1, Math.round(bw / 4));
      const W = 4 * n + 1;
      const x0 = Math.max(0, Math.floor((bw - W) / 2 + (italic ? 1 : 0)));
      w = Math.max(bw, x0 + W);
      items.push({ k: 'r', x: x0, y: Math.round(cy - 0.5), w: W, h: 1, color });
      a = Math.max(a, -cy + 1.5);
    } else if (kind === 'arrow') {
      const aw = Math.max(Math.round(12 * s), 1);
      w = Math.max(bw, aw);
      bx = Math.floor((w - bw) / 2) + (bw < aw ? 0 : 0);
      items.push({ k: 'g', x: 0, y: cy + 3.5 * s, text: ch, size: fs, font: 'math', color });
      a = Math.max(a, -cy + 4);
    } else if (kind === 'hat') {
      const hw = 9;
      w = Math.max(bw, hw + 1);
      const x0 = Math.max(0, Math.floor((bw - hw) / 2 + (italic ? 1 : 0)));
      const top = -(tall ? 14.5 : 10.5) * s;
      items.push({ k: 'p', x: x0, y: top, d: `M0 3L4.5 0L9 3`, sw: 1, color });
      a = Math.max(a, -top + 1);
    } else {
      const gw = 10 * s;
      w = Math.max(bw, Math.round(gw));
      bx = Math.floor((w - bw) / 2);
      const gy = cy + (kind === 'tilde' ? 3.5 : kind === 'dia' ? 6 : 7) * s;
      items.push({ k: 'g', x: Math.max(0, Math.floor((w - gw) / 2)), y: gy, text: kind === 'dot' ? '.' : kind === 'dia' ? '\u2025' : '\u223C', size: fs, font: 'math', color });
      a = Math.max(a, -cy + 4);
    }
  } else {
    // under accents
    const cy = (hasDesc ? 7 : tall ? 3 : 5) * s + base.d * 0;
    if (kind === 'bar') {
      const n = Math.max(1, Math.round(bw / 4));
      const W = 4 * n + 1;
      const x0 = Math.max(0, Math.floor((bw - W) / 2 + (italic ? 1 : 0)));
      w = Math.max(bw, x0 + W);
      items.push({ k: 'r', x: x0, y: Math.round(cy - 0.5), w: W, h: 1, color });
      d = Math.max(d, cy + 1.5);
    } else {
      return null;
    }
  }
  const kids: Placed[] = [{ b: base, x: bx, y: 0 }];
  // the accent is a slot of its own (the caret can enter it): an invisible row at the glyph keeps its geometry
  {
    const r1 = R(1);
    const g0 = items[0];
    const ax = g0 && g0.k !== 'p' ? g0.x : 0;
    const ay = g0 && g0.k === 'g' ? g0.y : el.t === 'mover' ? -11.5 * s : 5 * s;
    const meta = mk(r1.w, r1.a, r1.d);
    meta.row = r1.row;
    kids.push({ b: meta, x: ax, y: ay });
  }
  // an accented base: the reference's accent box adds two pixels above the base (the accent itself only moves one);
  // an arrow group hangs one pixel below the line baseline
  if (el.t === 'mover') {
    if (kind === 'arrow') {
      a += 2;
      kids[0].y = 1;
    } else if (kind !== 'dot') {
      a += tall ? 3 : 2;
      items.forEach((it) => {
        if (it.k === 'r' || it.k === 'g' || it.k === 'p') it.y -= 1;
      });
    }
  }
  return mk(w, a, d, items, kids);
}

function underOver(el: El, env: Env, R: (s: number, e?: Env) => Box): Box {
  const acc = accentLayout(el, env, R);
  if (acc) return acc;
  const s = sc(env);
  const se = scriptEnv(env);
  const base = R(0);
  const hasUnder = el.t === 'munder' || el.t === 'munderover';
  const hasOver = el.t === 'mover' || el.t === 'munderover';
  const under = hasUnder ? R(1, se) : null;
  const over = hasOver ? R(el.t === 'mover' ? 1 : 2, se) : null;
  const bw = round(base.w);
  const big = bigOpBase(base);
  const inline = !env.display && big;
  const os = opSizeOf(base);
  // inline big operators carry their limits as scripts at the right (measured: sum_inline)
  if (inline) {
    const kids: Placed[] = [{ b: base, x: 0, y: 0 }];
    let a = base.a;
    let d = base.d;
    if (over) {
      const y = -0.66 * os;
      kids.push({ b: over, x: bw, y });
      a = Math.max(a, -y + over.a);
    }
    if (under) {
      const y = 0.09 * os;
      kids.push({ b: under, x: bw, y });
      d = Math.max(d, y + under.d);
    }
    return mk(bw + Math.max(over ? round(over.w) : 0, under ? round(under.w) : 0), a, d, undefined, kids);
  }
  const w = Math.max(bw, under ? round(under.w) : 0, over ? round(over.w) : 0);
  const kids: Placed[] = [{ b: base, x: Math.floor((w - bw) / 2), y: 0 }];
  let a = base.a;
  let d = base.d;
  if (over) {
    // big operators: limit baseline 1.036 op-size above; accents: 8.1 px above the base row top line
    const y = big ? (-1.0358 + K.bigScriptDrop) * os : -(base.a - 2 + 1.5 * s);
    kids.push({ b: over, x: Math.floor((w - round(over.w)) / 2), y });
    a = Math.max(a, -y + over.a + (big ? 2 : 0));
  }
  if (under) {
    const y = big ? (0.506 + K.bigScriptDrop) * os : base.d + under.a - 2.5 * s;
    kids.push({ b: under, x: Math.floor((w - round(under.w)) / 2), y });
    d = Math.max(d, y + under.d);
  }
  return mk(w, a, d, undefined, kids);
}

/** one delimiter of height a + d: a plain glyph when short, an assembled stretchy piece set when tall */
function fenceBox(ch: string, isClose: boolean, a: number, d: number, env: Env, tall: boolean, gw: number, dy = 0): Box {
  const s = sc(env);
  if (ch === '') return mk(0, 0, 0);
  // tall bars are assembled from narrow pieces, braces from wider ones (measured on the reference)
  const tallAdv = ch === '|' ? (isClose ? 3 : 2) : ch === '||' ? (isClose ? 6 : 5) : ch === '{' ? 7 : ch === '}' ? 8 : 6;
  const adv = tall ? tallAdv * s : Math.round(gw);
  // delimiters around a table hang one pixel lower than around other content (measured on the reference)
  return mk(adv, a, d, [{ k: 'f', x: 0, y: 0, ch, w: gw, a: a - 1, d, size: env.size, color: env.color, close: isClose, dy }]);
}

function fenced(el: El, env: Env, R: (s: number, e?: Env) => Box): Box {
  const open = getAttr(el, 'open') ?? '(';
  const close = getAttr(el, 'close') ?? ')';
  const seps = (getAttr(el, 'separators') ?? ',').replace(/\s+/g, '');
  const s = sc(env);
  const n = el.c!.length;
  const inner: Box[] = [];
  for (let k = 0; k < n; k++) inner.push(R(k));
  let a = Math.max(...inner.map((b) => b.a));
  let d = Math.max(...inner.map((b) => b.d));
  const tall = a + d > textAsc(env.size) + textDesc(env.size) + 2;
  const gw = tall ? 4.69 * s : open === '|' || close === '|' ? 3.75 * s : open === '{' || close === '{' ? 5.34 * s : 4.25 * s;
  const dyTable = el.c!.length === 1 && el.c![0].length === 1 && el.c![0][0].t === 'mtable' ? 1 : 0;
  const mkFence = (ch: string, isClose: boolean): Box => fenceBox(ch, isClose, a, d, env, tall, gw, dyTable);
  const kids: Placed[] = [];
  let x = Math.round(1 * s);
  const fo = mkFence(open, false);
  kids.push({ b: fo, x, y: 0 });
  x += Math.round(fo.w);
  inner.forEach((b, k) => {
    kids.push({ b, x, y: 0 });
    x += round(b.w);
    if (k < n - 1) {
      const sepc = seps.length ? seps[Math.min(k, seps.length - 1)] : '';
      if (sepc) {
        const info = tokenInfo('mo', '', sepc, env.size);
        const lift = info.font === 'math' && env.size >= 15.5 ? 1 : 0;
        const sbox = mk(info.w, textAsc(env.size) + lift, textDesc(env.size), [{ k: 'g', x: 0, y: -lift, text: sepc, size: env.size, font: info.font }]);
        x += 2;
        kids.push({ b: sbox, x, y: 0 });
        x += round(info.w) + 2;
      }
    }
  });
  if (tall && !/^(\||\|\||\{|\})$/.test(open) && !/^(\||\|\||\{|\})$/.test(close)) x += 1;
  const fc = mkFence(close, true);
  kids.push({ b: fc, x, y: 0 });
  x += Math.ceil(fc.w);
  return mk(x, a, d, undefined, kids);
}

function enclose(el: El, env: Env, body: Box): Box {
  const notation = (getAttr(el, 'notation') ?? 'longdiv').trim().split(/\s+/);
  const has = (n: string) => notation.includes(n);
  // room the reference leaves on each side (measured with tools/ctx_matrix.js on every notation): a side that carries a
  // line has 2 px (left / right) or 1 px (top / bottom); the strikes alone need none; the long division sign 7 px on the left
  const boxed = has('box') || has('roundedbox');
  const circle = has('circle');
  const padL = circle ? 6 : has('longdiv') ? 7 : boxed || has('left') || has('horizontalstrike') ? 2 : 0;
  const padR = circle ? 6 : boxed || has('right') || has('horizontalstrike') || has('madruwb') || has('actuarial') ? 2 : 0;
  const padT = circle ? 5 : boxed || has('top') || has('verticalstrike') || has('actuarial') || has('longdiv') ? 1 : 0;
  const padB = circle ? 5 : boxed || has('bottom') || has('verticalstrike') || has('madruwb') ? 1 : 0;
  const w = round(body.w) + padL + padR;
  const top = body.a + padT;
  const bot = body.d + padB;
  const h = top + bot;
  const items: Item[] = [];
  const R = (x: number, y: number, ww: number, hh: number): Item => ({ k: 'r', x, y, w: ww, h: hh, color: env.color });
  if (circle) items.push({ k: 'p', x: 0, y: -top, d: ellipsePath(w, h), sw: 1, color: env.color });
  else
    for (const nn of notation) {
      if (nn === 'box') items.push(R(0, -top, w, 1), R(0, bot - 1, w, 1), R(0, -top, 1, h), R(w - 1, -top, 1, h));
      else if (nn === 'roundedbox') items.push({ k: 'p', x: 0, y: -top, d: roundedRect(w - 1, h - 1, 4), sw: 1, color: env.color });
      else if (nn === 'top') items.push(R(0, -top, w, 1));
      else if (nn === 'bottom') items.push(R(0, bot - 1, w, 1));
      else if (nn === 'left') items.push(R(0, -top, 1, h));
      else if (nn === 'right') items.push(R(w - 1, -top, 1, h));
      else if (nn === 'madruwb') items.push(R(0, bot - 1, w, 1), R(w - 1, -top, 1, h));
      else if (nn === 'updiagonalstrike') items.push({ k: 'p', x: 0, y: -top, d: `M0 ${h} L${w} 0`, sw: 1, color: env.color });
      else if (nn === 'downdiagonalstrike') items.push({ k: 'p', x: 0, y: -top, d: `M0 0 L${w} ${h}`, sw: 1, color: env.color });
      else if (nn === 'horizontalstrike') items.push(R(0, -(top - h / 2), w, 1));
      else if (nn === 'verticalstrike') items.push(R(Math.floor(w / 2), -top, 1, h));
      else if (nn === 'actuarial') items.push(R(0, -top, w, 1), R(w - 1, -top, 1, h));
      else if (nn === 'longdiv') items.push(R(0, -top, w, 1), { k: 'p', x: 0, y: -top, d: `M${padL - 2} 0 Q${padL - 7} ${h / 2} ${padL - 2} ${h}`, sw: 1, color: env.color });
    }
  return mk(w, top, bot, items, [{ b: body, x: padL, y: 0 }]);
}

function roundedRect(w: number, h: number, r: number): string {
  return `M${r} 0 H${w - r} Q${w} 0 ${w} ${r} V${h - r} Q${w} ${h} ${w - r} ${h} H${r} Q0 ${h} 0 ${h - r} V${r} Q0 0 ${r} 0Z`;
}

function ellipsePath(w: number, h: number): string {
  const rx = w / 2 - 0.5;
  const ry = h / 2 - 0.5;
  return `M0.5 ${h / 2} A${rx} ${ry} 0 1 0 ${w - 0.5} ${h / 2} A${rx} ${ry} 0 1 0 0.5 ${h / 2}Z`;
}

function padded(el: El, env: Env, body: Box): Box {
  const len = (v: string | undefined) => {
    if (!v) return 0;
    const m = /^([+-]?[\d.]+)\s*(px|em|ex)?$/.exec(v.trim());
    return m ? parseFloat(m[1]) * (m[2] === 'em' ? env.size : m[2] === 'ex' ? env.size / 2 : 1) : 0;
  };
  const dx = len(getAttr(el, 'lspace'));
  const dy = len(getAttr(el, 'voffset'));
  return mk(body.w + Math.max(dx, 0), body.a + Math.max(dy, 0), body.d + Math.max(-dy, 0), undefined, [{ b: body, x: Math.max(dx, 0), y: -dy }]);
}

function table(el: El, env: Env, here: (s: number) => [number, number][]): Box {
  const s = sc(env);
  const cols = el.cols ?? 1;
  const rows = Math.ceil(el.c!.length / cols);
  const cells = el.c!.map((r, k) => layoutRow(r, env, here(k)));
  const colW = Array.from({ length: cols }, (_, c) => Math.max(...Array.from({ length: rows }, (_, r) => round(cells[r * cols + c].w))));
  const rowA = Array.from({ length: rows }, (_, r) => Math.max(...cells.slice(r * cols, r * cols + cols).map((b) => b.a)));
  const rowD = Array.from({ length: rows }, (_, r) => Math.max(...cells.slice(r * cols, r * cols + cols).map((b) => b.d)));
  const align = (getAttr(el, 'columnalign') ?? 'center').split(/\s+/);
  const kids: Placed[] = [];
  const cellPadX = 4 * s;
  const cellPadY = 2.5 * s;
  let x = 0;
  const colX: number[] = [];
  for (let c = 0; c < cols; c++) {
    colX.push(x);
    x += colW[c] + cellPadX * 2;
  }
  let y = 0;
  const rowBase: number[] = [];
  for (let r = 0; r < rows; r++) {
    y += cellPadY + rowA[r];
    rowBase.push(y);
    y += rowD[r] + cellPadY;
  }
  const totalH = y;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const b = cells[r * cols + c];
      const al = align[Math.min(c, align.length - 1)];
      const cw = colW[c];
      const dx = al === 'left' ? 0 : al === 'right' ? cw - round(b.w) : Math.floor((cw - round(b.w)) / 2);
      kids.push({ b, x: Math.floor(colX[c] + cellPadX) + dx, y: rowBase[r] });
    }
  }
  const items: Item[] = [];
  const frame = getAttr(el, 'frame');
  const rl = (getAttr(el, 'rowlines') ?? 'none').split(/\s+/);
  const cl = (getAttr(el, 'columnlines') ?? 'none').split(/\s+/);
  const shift = totalH / 2 - K.axis * s; // centre the table on the math axis
  const lift = totalH - shift; // the table's top sits this far above the baseline (its centre on the math axis)
  kids.forEach((k) => (k.y -= lift));
  const top = -lift;
  if (frame && frame !== 'none') {
    items.push({ k: 'r', x: 0, y: top, w: x, h: 1 }, { k: 'r', x: 0, y: top + totalH - 1, w: x, h: 1 }, { k: 'r', x: 0, y: top, w: 1, h: totalH }, { k: 'r', x: x - 1, y: top, w: 1, h: totalH });
  }
  for (let r = 0; r < rows - 1; r++) if (rl[Math.min(r, rl.length - 1)] !== 'none') items.push({ k: 'r', x: 0, y: top + rowBase[r] + rowD[r] + cellPadY, w: x, h: 1 });
  for (let c = 0; c < cols - 1; c++) if (cl[Math.min(c, cl.length - 1)] !== 'none') items.push({ k: 'r', x: colX[c + 1], y: top, w: 1, h: totalH });
  const box = mk(x, totalH - shift, shift, items, kids);
  return box;
}

/* ------------------------------------------------------ elementary stacks */

const STACK_FRAME = '#cddce3';
const NONE_COLOR = '#dddddd';

/** one cell (column position) of a stack row: a digit / symbol, a name or a structure */
interface SCell {
  from: number;
  to: number;
  box: Box;
  /** contribution to the column width */
  w: number;
  /** a sign (+ - × ÷) centred on its column without widening it */
  sign: boolean;
  none: boolean;
  inner?: number[];
}

function stackCells(r: Row, env: Env, path: [number, number][]): SCell[] & { lift?: number } {
  if (r.length === 0) {
    const e = emptySlot(env);
    return [{ from: 0, to: 0, box: mk(e.w, e.a - 0.5, e.d + 0.5, e.items), w: Math.round(e.w), sign: false, none: false }];
  }
  const cells: SCell[] = [];
  const sig = (e: El) => e.a.map(([k, v]) => k + v).join(';');
  // the symbols of a row lower its text by a pixel; a row of symbols and structures alone keeps its baseline
  const hasText = r.some((e) => e.c === undefined && (e.t === 'mi' || e.t === 'mtext' || (e.t === 'mn' && /^\p{Nd}$/u.test(e.x ?? ''))));
  const lift = rowLift(r, env, true) && hasText ? 1 : 0;
  let i = 0;
  while (i < r.length) {
    const el = r[i];
    if (el.c !== undefined) {
      const b = layoutEl(el, lift ? { ...env, lineLift: lift } : env, path, i);
      // an empty argument placeholder keeps the baseline of the row (its box is a half pixel taller above)
      if (el.t === 'maction' && b.items && b.items.some((q) => q.k === 's')) {
        b.a -= 0.5;
        b.d += 0.5;
      }
      cells.push({ from: i, to: i + 1, box: b, w: Math.round(b.w), sign: false, none: false });
      i++;
      continue;
    }
    let j = i + 1;
    if (el.g !== undefined && (el.t === 'mi' || el.t === 'mtext' || el.t === 'ms')) {
      while (j < r.length && r[j].c === undefined && r[j].g === el.g && r[j].t === el.t && sig(r[j]) === sig(el)) j++;
    }
    // a separator written inside a number (decimal point, comma) is a symbol-font glyph of its own column
    const sepAsOp = el.t === 'mn' && !/^\p{Nd}$/u.test(el.x ?? '0');
    const at = sepAsOp ? tokenAtom([{ ...el, t: 'mo', g: undefined }], 0, 1, env, !lift) : tokenAtom(r, i, j, env, !lift);
    const sign = el.t === 'mo' && /^[+\-×÷]$/.test(el.x ?? '');
    const none = el.t === 'none';
    const w = none ? Math.round(0.2778 * env.size) : sign ? Math.round(9 * (env.size / 16)) : Math.round(at.box.w);
    cells.push({ from: i, to: j, box: none ? mk(0.2778 * env.size, textAsc(env.size) + (env.size >= 15.5 ? 1 : 0), textDesc(env.size)) : at.box, w, sign, none, inner: at.inner });
    i = j;
  }
  return Object.assign(cells, { lift });
}

interface StackLevel {
  path: [number, number][];
  n: number;
  /** item index → entry index (rows, lines, carries) */
  entryOf: Map<number, number>;
}

type SEntry =
  | { k: 'row'; cells: SCell[]; path: [number, number][]; n: number; level: StackLevel | null; item: number; env: Env; src: Row }
  | { k: 'line'; level: StackLevel; item: number }
  | { k: 'carry'; cells: SCell[]; path: [number, number][]; n: number; loc: string; level: StackLevel; item: number; env: Env };

/** flatten the items (rows, lines, carries, groups) of a stack slot into entries */
function stackEntries(items: Row, slotPath: [number, number][], env: Env, levels: StackLevel[], out: SEntry[]): void {
  const level: StackLevel = { path: slotPath, n: items.length, entryOf: new Map() };
  levels.push(level);
  items.forEach((it, k) => {
    const rowPath: [number, number][] = [...slotPath, [k, 0]];
    switch (it.t) {
      case 'msrow':
        level.entryOf.set(k, out.length);
        out.push({ k: 'row', cells: stackCells(it.c![0], env, rowPath), path: rowPath, n: it.c![0].length, level, item: k, env, src: it.c![0] });
        break;
      case 'msline':
        level.entryOf.set(k, out.length);
        out.push({ k: 'line', level, item: k });
        break;
      case 'mscarries': {
        const e2 = scriptEnv(env);
        level.entryOf.set(k, out.length);
        out.push({ k: 'carry', cells: stackCells(it.c![0], e2, rowPath), path: rowPath, n: it.c![0].length, loc: getAttr(it, 'location') ?? 'n', level, item: k, env: e2 });
        break;
      }
      case 'msgroup':
        stackEntries(it.c![0], rowPath, env, levels, out);
        break;
      default: {
        // anything else is a row of its own holding one cell
        const b = it.c !== undefined ? layoutEl(it, env, slotPath, k) : tokenAtom(items, k, k + 1, env).box;
        level.entryOf.set(k, out.length);
        out.push({ k: 'row', cells: [{ from: k, to: k + 1, box: b, w: Math.round(b.w), sign: false, none: false }], path: slotPath, n: 0, level: null, item: k, env, src: [] });
      }
    }
  });
}

interface StackOpts {
  stackalign: string;
  charalign: string;
  spacing: number;
}

interface StackBlock {
  w: number;
  h: number;
  /** placed in block coordinates (top-left origin) */
  kids: Placed[];
  items: Item[];
  /** top and baseline of every text row, in entry order */
  rowTop: number[];
  rowBase: number[];
  rowH: number[];
  /** the first / second text row (long division) */
  textRows: number[];
}

function stackOpts(el: El, s: number): StackOpts {
  const sp = getAttr(el, 'charspacing');
  let spacing = 3 * s;
  if (sp && sp !== 'medium') {
    const m = /^(-?[\d.]+)\s*(px|em|ex)?$/.exec(sp.trim());
    if (m) spacing = parseFloat(m[1]) * (m[2] === 'em' ? 16 * s : m[2] === 'ex' ? 8 * s : 1);
  }
  return { stackalign: getAttr(el, 'stackalign') ?? 'right', charalign: getAttr(el, 'charalign') ?? 'right', spacing };
}

/** lay out entries as a grid of columns (digits right aligned by default) */
function stackBlock(entries: SEntry[], levels: StackLevel[], env: Env, o: StackOpts): StackBlock {
  const s = sc(env);
  const rows = entries.filter((e): e is Extract<SEntry, { k: 'row' }> => e.k === 'row');
  const ncols = Math.max(1, ...rows.map((r) => r.cells.length));
  const startOf = (n: number) => (o.stackalign === 'left' ? 0 : o.stackalign === 'center' ? Math.ceil((ncols - n) / 2) : ncols - n);
  const colW = new Array(ncols).fill(0);
  for (const r of rows) {
    const st = startOf(r.cells.length);
    r.cells.forEach((c, k) => (colW[st + k] = Math.max(colW[st + k], c.w)));
  }
  const colX: number[] = [];
  let x = 0;
  for (let c = 0; c < ncols; c++) {
    colX.push(x);
    x += colW[c] + (c < ncols - 1 ? o.spacing : 0);
  }
  const W = x;
  // vertical order: carries above / below the row they belong to, side carries inside it, trailing ones at the end
  type Slot = { e: SEntry; carryKind?: 'above' | 'below' | 'trail' | 'side'; host?: number };
  const order: Slot[] = [];
  const below = new Map<number, Slot[]>();
  const side = new Map<number, Slot[]>();
  const trailing: Slot[] = [];
  entries.forEach((e, idx) => {
    if (e.k !== 'carry') {
      order.push({ e });
      const b = below.get(idx);
      if (b) order.push(...b);
      return;
    }
    let f = -1;
    for (let q = idx + 1; q < entries.length; q++) if (entries[q].k === 'row') { f = q; break; }
    if (f < 0) {
      trailing.push({ e, carryKind: 'trail' });
      return;
    }
    if (/^s/.test(e.loc)) below.set(f, [...(below.get(f) ?? []), { e, carryKind: 'below', host: f }]);
    else if (e.loc === 'w' || e.loc === 'e') side.set(f, [...(side.get(f) ?? []), { e, carryKind: 'side', host: f }]);
    else order.push({ e, carryKind: 'above', host: f });
  });
  order.push(...trailing);
  const kids: Placed[] = [];
  const items: Item[] = [];
  const rowTop: number[] = [];
  const rowBase: number[] = [];
  const rowH: number[] = [];
  const textRows: number[] = [];
  const pos = new Map<number, { top: number; base: number; a: number; d: number }>();
  const lineY = new Map<SEntry, number>();
  const carryAt = new Map<SEntry, { glyphTop: number; hostTop?: number }>();
  let y = 0;
  const pad = padOf(env.size);
  void pad;
  const textA = textAsc(env.size);
  const textD = textDesc(env.size);
  const carryH = (loc: string) => ((loc === 'n' || loc === 's' || !/^[ns][we]$/.test(loc) ? 13 : 11) * s);
  for (const sl of order) {
    const e = sl.e;
    if (e.k === 'row') {
      const a = Math.max(textA, ...e.cells.map((c) => c.box.a));
      const d = Math.max(textD, ...e.cells.map((c) => c.box.d));
      const idx = entries.indexOf(e);
      pos.set(idx, { top: y, base: y + a, a, d });
      rowTop[idx] = y;
      rowBase[idx] = y + a;
      rowH[idx] = a + d;
      textRows.push(idx);
      y += a + d;
    } else if (e.k === 'line') {
      lineY.set(e, y);
      y += 7 * s;
    } else {
      const hgt = sl.carryKind === 'trail' ? 15 * s : carryH(e.loc);
      const top = y;
      const gt = sl.carryKind === 'below' ? top + hgt - 12 * s : top + 2 * s;
      carryAt.set(e, { glyphTop: gt });
      y += hgt;
    }
  }
  // the container of the reference is as tall as the rows without their lift: the lowered rows overflow it
  let liftTotal = 0;
  for (const idx of textRows) {
    const e = entries[idx] as Extract<SEntry, { k: 'row' }>;
    const pa = pos.get(idx)!.a;
    if ((e.cells as SCell[] & { lift?: number }).lift && Math.abs(pa - textA - 1) < 0.01) liftTotal++;
  }
  const H = y - liftTotal;
  // cells and row geometry
  const place = (r: Extract<SEntry, { k: 'row' }>, idx: number) => {
    const p = pos.get(idx)!;
    const st = startOf(r.cells.length);
    const rowKids: Placed[] = [];
    const xs: number[] = new Array(r.n + 1).fill(0);
    const hx: number[] = new Array(r.n + 1).fill(0);
    const ct: number[] = new Array(r.n + 1).fill(0);
    const ch: number[] = new Array(r.n + 1).fill(0);
    const runs: [number, number][] = [];
    const lift = (r.cells as SCell[] & { lift?: number }).lift ?? 0;
    const rect = (c: SCell): [number, number] => {
      const el = r.n > 0 && c.to > c.from ? r.src[c.from] : null;
      if (!el) return [-(textAsc(r.env.size) + lift), boxH(r.env.size) + padOf(r.env.size)];
      return elementCaret(el, c.box, r.env, lift);
    };
    r.cells.forEach((c, k) => {
      const col = st + k;
      const cw = colW[col];
      const bw = Math.round(c.box.w);
      let dx: number;
      if (c.sign) dx = Math.floor((cw - bw) / 2 + 0.5);
      else if (o.charalign === 'left') dx = 0;
      else if (o.charalign === 'center') dx = Math.floor((cw - bw) / 2 + 0.5);
      else dx = cw - bw;
      const cx = colX[col] + dx;
      rowKids.push({ b: c.box, x: cx, y: 0 });
      if (c.none) {
        const mw = Math.max(1, Math.round(cw));
        const by = Math.round(p.a);
        const tick = Math.round(3 * s);
        items.push({ k: 'r', x: colX[col], y: p.top + by - tick, w: 1, h: tick, color: NONE_COLOR, ui: true }, { k: 'r', x: colX[col] + mw - 1, y: p.top + by - tick, w: 1, h: tick, color: NONE_COLOR, ui: true }, { k: 'r', x: colX[col], y: p.top + by, w: mw, h: 1, color: NONE_COLOR, ui: true });
      }
      if (r.n > 0 && c.to > c.from) {
        // before the first cell: the cell's left edge (a right aligned row sits a little further left); after a cell: the column's right edge
        if (k === 0) xs[c.from] = col > 0 && o.stackalign === 'right' ? cx - o.spacing - 5 * s : cx;
        else xs[c.from] = colX[col - 1] + colW[col - 1];
        if (c.inner) c.inner.forEach((ox, q) => (xs[c.from + 1 + q] = cx + ox));
        xs[c.to] = colX[col] + colW[col];
        // a click snaps to the left edge of a cell (the caret is drawn at the right edge of the cell before)
        hx[c.from] = cx;
        if (c.inner) c.inner.forEach((ox, q) => (hx[c.from + 1 + q] = cx + ox));
        hx[c.to] = colX[col] + colW[col];
        const [t, hh] = rect(c);
        for (let q = c.from; q <= c.to; q++) {
          ct[q] = t;
          ch[q] = hh;
        }
        if (c.to - c.from > 1) runs.push([c.from, c.to]);
      } else if (r.n === 0) {
        xs[0] = cx + c.box.w / 2;
        hx[0] = colX[col] + cw; // a click next to an empty row counts from the right edge of its column
        const [t, hh] = rect(c);
        ct[0] = t;
        ch[0] = hh;
      }
    });
    // the first position takes the rectangle of the first element
    if (r.n > 0) {
      const first = r.cells.find((c) => c.to > c.from);
      if (first) {
        const [t, hh] = rect(first);
        ct[0] = t;
        ch[0] = hh;
      }
    }
    const rowInfo = { key: pathKey(r.path), path: r.path, xs: r.n === 0 ? [xs[0], xs[0]] : xs, hx: r.n === 0 ? [hx[0], hx[0]] : hx, a: p.a, d: p.d, size: r.env.size, ct: r.n === 0 ? [ct[0], ct[0]] : ct, ch: r.n === 0 ? [ch[0], ch[0]] : ch, lift, runs };
    if (r.level || (r.path.length > 0 && r.item === -1)) {
      const rb = mk(W, p.a, p.d, undefined, rowKids);
      rb.row = rowInfo;
      kids.push({ b: rb, x: 0, y: p.base });
    } else {
      rowKids.forEach((k) => kids.push({ b: k.b, x: k.x, y: p.base }));
    }
  };
  entries.forEach((e, idx) => {
    if (e.k === 'row') place(e, idx);
  });
  // lines
  entries.forEach((e) => {
    if (e.k === 'line') items.push({ k: 'r', x: 0, y: lineY.get(e)! + 4 * s, w: W, h: 1 });
  });
  // carries
  entries.forEach((e, idx) => {
    if (e.k !== 'carry') return;
    const sl = [...order, ...[...below.values()].flat(), ...[...side.values()].flat()].find((q) => q.e === e)!;
    const st = startOf(e.cells.length);
    const base0 = (gt: number) => gt + K.asc * e.env.size;
    const rowKids: Placed[] = [];
    const xs: number[] = new Array(e.n + 1).fill(0);
    let glyphTop: number;
    if (sl.carryKind === 'side') {
      const hp = pos.get(sl.host!)!;
      glyphTop = hp.top + hp.a - K.asc * env.size + 2 * s;
    } else glyphTop = carryAt.get(e)!.glyphTop;
    const baseY = base0(glyphTop);
    let lastRight = 0;
    e.cells.forEach((c, k) => {
      const col = st + k;
      const cw = colW[col] ?? 0;
      const bw = Math.round(c.box.w);
      let cx: number;
      const loc = sl.carryKind === 'trail' ? 'n' : e.loc;
      const left = colX[col] ?? 0;
      if (loc === 'nw' || loc === 'sw') cx = left - 3 * s;
      else if (loc === 'ne' || loc === 'se') cx = left + cw - 3 * s;
      else if (loc === 'w') cx = left - 6 * s;
      else if (loc === 'e') cx = left + cw;
      else cx = left + Math.floor((cw - bw) / 2 + 0.5);
      rowKids.push({ b: c.box, x: cx, y: 0 });
      if (c.none) {
        const mw = Math.max(1, Math.round(c.box.w));
        const by = Math.round(baseY);
        const tick = Math.round(2 * s);
        items.push({ k: 'r', x: cx, y: by - tick, w: 1, h: tick, color: NONE_COLOR, ui: true }, { k: 'r', x: cx + mw - 1, y: by - tick, w: 1, h: tick, color: NONE_COLOR, ui: true }, { k: 'r', x: cx, y: by, w: mw, h: 1, color: NONE_COLOR, ui: true });
      }
      if (e.n > 0 && c.to > c.from) {
        xs[c.from] = cx;
        lastRight = cx + c.box.w;
      } else {
        xs[0] = cx + c.box.w / 2;
        lastRight = xs[0];
      }
    });
    if (e.n > 0) xs[e.n] = lastRight;
    const rb = mk(W, K.asc * e.env.size + padOf(e.env.size), 0, undefined, rowKids);
    const cct = -(K.asc * e.env.size + padOf(e.env.size));
    const cch = boxH(e.env.size) + padOf(e.env.size);
    rb.row = {
      key: pathKey(e.path),
      path: e.path,
      xs: e.n === 0 ? [xs[0], xs[0]] : xs,
      a: rb.a,
      d: textDesc(e.env.size),
      size: e.env.size,
      ct: new Array(e.n === 0 ? 2 : e.n + 1).fill(cct),
      ch: new Array(e.n === 0 ? 2 : e.n + 1).fill(cch),
      lift: 0,
    };
    kids.push({ b: rb, x: 0, y: baseY });
    void idx;
  });
  // stack levels: the positions between the items; only those next to a line can be reached
  for (const lv of levels) {
    const xs: number[] = new Array(lv.n + 1).fill(0);
    const ys: number[] = new Array(lv.n + 1).fill(0);
    const stops: boolean[] = new Array(lv.n + 1).fill(false);
    const ct: number[] = new Array(lv.n + 1).fill(0);
    const ch: number[] = new Array(lv.n + 1).fill(0);
    const ul: ({ x0: number; x1: number; y: number } | null)[] = new Array(lv.n + 1).fill(null);
    let lastY = 0;
    for (let k = 0; k <= lv.n; k++) {
      const ei = lv.entryOf.get(k);
      const e = ei !== undefined ? entries[ei] : undefined;
      if (e && e.k === 'line') {
        const top = lineY.get(e)!;
        const yb = top + 4.5 * s + 6 * s;
        for (const q of [k, k + 1]) {
          xs[q] = q === k ? 0 : W;
          ys[q] = yb;
          stops[q] = true;
          // the caret fills the row of the line; its underline sits just below the top of that row
          ct[q] = top - yb;
          ch[q] = 7 * s;
          ul[q] = { x0: 0, x1: W, y: top + 2 * s - yb + yb };
        }
        lastY = yb;
      } else if (!stops[k]) {
        xs[k] = 0;
        ys[k] = e && e.k === 'row' && pos.get(ei!) ? pos.get(ei!)!.base : lastY;
        lastY = ys[k];
      }
    }
    const mb = mk(0, 0, 0);
    mb.row = { key: pathKey(lv.path), path: lv.path, xs, ys, stops, a: 0, d: 0, size: env.size, ct, ch, ul };
    kids.push({ b: mb, x: 0, y: 0 });
  }
  return { w: W, h: H, kids, items, rowTop, rowBase, rowH, textRows };
}

function frameItems(w: number, h: number, top: number): Item[] {
  const c = STACK_FRAME;
  return [
    { k: 'r', x: 0, y: top, w, h: 1, color: c, ui: true },
    { k: 'r', x: 0, y: top + h - 1, w, h: 1, color: c, ui: true },
    { k: 'r', x: 0, y: top, w: 1, h, color: c, ui: true },
    { k: 'r', x: w - 1, y: top, w: 1, h, color: c, ui: true },
  ];
}

/** shift a block's content so that its vertical middle sits on the baseline */
function stackBox(w: number, h: number, kids: Placed[], items: Item[], baseline?: number): Box {
  // the text of the line sits a pixel below the middle of the stack (measured on the reference)
  const A = baseline ?? Math.floor(h / 2 + 0.5) + 1;
  const sk = kids.map((k) => ({ b: k.b, x: k.x, y: k.y - A }));
  const si = items.map((it) => ({ ...it, y: it.y - A }) as Item);
  return mk(w, A, h - A, [...frameItems(w, h, -A), ...si], sk);
}

function elementaryStack(el: El, env: Env, here: (s: number) => [number, number][]): Box {
  const s = sc(env);
  const levels: StackLevel[] = [];
  const entries: SEntry[] = [];
  stackEntries(el.c![0], here(0), env, levels, entries);
  const blk = stackBlock(entries, levels, env, stackOpts(el, s));
  return stackBox(blk.w, Math.max(blk.h, 1), blk.kids, blk.items);
}

function longDivision(el: El, env: Env, here: (s: number) => [number, number][]): Box {
  const s = sc(env);
  const o = stackOpts(el, s);
  const style = getAttr(el, 'longdivstyle') ?? '';
  const levels: StackLevel[] = [];
  const quoPath = here(1);
  const divPath = here(0);
  const mkRow = (r: Row, path: [number, number][]): SEntry => ({ k: 'row', cells: stackCells(r, env, path), path, n: r.length, level: null, item: -1, env, src: r });
  // rows of the dividend (and the steps below it)
  const body: SEntry[] = [];
  const items = el.c![2] ?? [];
  stackEntries(items, here(2), env, levels, body);
  if (style === 'shortstackedrightright') {
    const left = stackBlock(body, levels, env, o);
    const rightE: SEntry[] = [mkRow(el.c![0], divPath), mkRow(el.c![1], quoPath)];
    const right = stackBlock(rightE, [], env, o);
    const xLine = left.w + 5 * s;
    const xR = xLine + 5 * s;
    const W = xR + right.w + 5 * s;
    const H = Math.max(left.h, right.h);
    const firstH = Math.round(right.rowH[0] ?? 20);
    const kids: Placed[] = [...left.kids, ...right.kids.map((k) => ({ b: k.b, x: k.x + xR, y: k.y }))];
    const itemsAll: Item[] = [...left.items, ...right.items.map((it) => ({ ...it, x: it.x + xR }) as Item)];
    itemsAll.push({ k: 'r', x: xLine, y: 0, w: 1, h: firstH }, { k: 'r', x: xLine, y: firstH, w: W - xLine, h: 1 });
    const rb0 = Math.max(left.rowBase[left.textRows[0]] ?? 0, right.rowBase[right.textRows[0]] ?? 0);
    return stackBox(W, H, kids, itemsAll, rb0 + 0.5 * s);
  }
  const entries: SEntry[] = [mkRow(el.c![1], quoPath), ...body];
  const blk = stackBlock(entries, levels, env, o);
  // divisor cells sit left of the first dividend row
  const div = stackCells(el.c![0], env, divPath);
  let dx = 0;
  const divKids: Placed[] = [];
  const divXs: number[] = new Array(el.c![0].length + 1).fill(0);
  div.forEach((c, k) => {
    divKids.push({ b: c.box, x: dx, y: 0 });
    if (el.c![0].length > 0) {
      divXs[c.from] = dx;
      if (c.inner) c.inner.forEach((ox, q) => (divXs[c.from + 1 + q] = dx + ox));
    } else divXs[0] = dx + c.box.w / 2;
    dx += c.w + (k < div.length - 1 ? o.spacing : 0);
  });
  const divW = dx;
  if (el.c![0].length > 0) divXs[el.c![0].length] = divW;
  const x0 = divW + 9 * s;
  const second = blk.textRows[1] ?? blk.textRows[0];
  const base1 = blk.rowBase[second] ?? 0;
  const top1 = blk.rowTop[second] ?? 0;
  const aDiv = Math.max(textAsc(env.size), ...div.map((c) => c.box.a));
  const dDiv = Math.max(textDesc(env.size), ...div.map((c) => c.box.d));
  const rb = mk(divW, aDiv, dDiv, undefined, divKids);
  const nDiv = el.c![0].length;
  const dLift = (div as SCell[] & { lift?: number }).lift ?? 0;
  const dct: number[] = new Array(nDiv === 0 ? 2 : nDiv + 1).fill(0);
  const dch: number[] = new Array(nDiv === 0 ? 2 : nDiv + 1).fill(0);
  const dRuns: [number, number][] = [];
  div.forEach((c) => {
    const e0 = nDiv > 0 && c.to > c.from ? el.c![0][c.from] : null;
    const [t, hh] = e0 ? elementCaret(e0, c.box, env, dLift) : [-(textAsc(env.size) + dLift), boxH(env.size) + padOf(env.size)];
    for (let q = c.from; q <= Math.max(c.to, c.from); q++) {
      dct[q] = t;
      dch[q] = hh;
    }
    if (c.to - c.from > 1) dRuns.push([c.from, c.to]);
  });
  if (nDiv > 0) {
    dct[0] = dct[0] || dct[1];
    dch[0] = dch[0] || dch[1];
  }
  rb.row = { key: pathKey(divPath), path: divPath, xs: nDiv === 0 ? [divXs[0], divXs[0]] : divXs, a: aDiv, d: dDiv, size: env.size, ct: dct, ch: dch, lift: dLift, runs: dRuns };
  const W = x0 + blk.w;
  const H = Math.max(blk.h, base1 + dDiv);
  const kids: Placed[] = [{ b: rb, x: 0, y: base1 }, ...blk.kids.map((k) => ({ b: k.b, x: k.x + x0, y: k.y }))];
  const itemsAll: Item[] = blk.items.map((it) => ({ ...it, x: it.x + x0 }) as Item);
  // the division bracket: an arc and the line over the dividend
  const lineY = top1;
  itemsAll.push({ k: 'r', x: divW + 2 * s, y: lineY, w: W - (divW + 2 * s), h: 1 });
  const cyc = top1 + 11 * s;
  const xr = divW - 7 * s + Math.sqrt(14 * 14 - 9.55 * 9.55) * s;
  itemsAll.push({ k: 'p', x: 0, y: 0, d: `M${xr.toFixed(2)} ${(cyc - 9.55 * s).toFixed(2)}A${14 * s} ${14 * s} 0 0 1 ${xr.toFixed(2)} ${(cyc + 9.54 * s).toFixed(2)}`, sw: 1 });
  return stackBox(W, H, kids, itemsAll, base1 - 0.5 * s);
}

/* --------------------------------------------------------------- driver */

/** flatten a box tree to absolute items and row geometry */
export function flatten(root: Box, ox = 0, oy = 0): Layout {
  const items: Item[] = [];
  const rows: Layout['rows'] = new Map();
  const visit = (b: Box, x: number, y: number) => {
    if (b.items) for (const it of b.items) items.push({ ...it, x: it.x + x, y: it.y + y } as Item);
    if (b.row) {
      rows.set(b.row.key, {
        path: b.row.path,
        x,
        y,
        a: b.row.a,
        d: b.row.d,
        size: b.row.size,
        xs: b.row.xs.map((v) => v + x),
        ys: b.row.ys?.map((v) => v + y),
        stops: b.row.stops,
        ct: b.row.ct,
        ch: b.row.ch,
        lift: b.row.lift,
        uld: b.row.uld,
        hx: b.row.hx?.map((v) => v + x),
        runs: b.row.runs,
        ul: b.row.ul?.map((u) => (u ? { x0: u.x0 + x, x1: u.x1 + x, y: u.y + y } : null)),
      });
    }
    if (b.kids) for (const k of b.kids) visit(k.b, x + k.x, y + k.y);
  };
  visit(root, ox, oy);
  return { w: root.w, a: root.a, d: root.d, items, rows };
}

export interface DocLayout extends Layout {
  /** baseline y of the line holding every root caret position */
  rootYs: number[];
  lines: { from: number; to: number; y: number; a: number; d: number; lift?: number; uld?: number }[];
}

/* -------------------------------------------------------- right-to-left */

const RTL_SWAP = (rtlMirror as { swap: Record<string, string> }).swap;
const RTL_FONT = new Set<number>((rtlMirror as { rtlFont: string[] }).rtlFont.map((h) => parseInt(h, 16)));

/** advance of a text item */
function itemWidth(it: Extract<Item, { k: 'g' }>): number {
  if (it.w !== undefined) return it.w;
  let w = 0;
  for (const c of Array.from(it.text)) w += tokenInfo('mo', '', c, it.size).w;
  return w;
}

const FLIPPED = '()[]{}<>';
function mirrorItem(it: Item, W: number): Item {
  switch (it.k) {
    case 'g': {
      // characters with a mirror image are swapped; symbols that only exist in the right-to-left font are
      // drawn from it (or flipped when the font is not available)
      let text = it.text;
      let flip = false;
      let font = it.font;
      if (it.font === 'math' || it.font === 'sans') {
        text = Array.from(it.text)
          .map((c) => RTL_SWAP[(c.codePointAt(0) ?? 0).toString(16)] ?? c)
          .join('');
        if (it.font === 'math' && Array.from(it.text).some((c) => RTL_FONT.has(c.codePointAt(0) ?? 0))) {
          font = 'mathrtl';
          flip = true;
        }
      }
      return { ...it, text, font, flip, x: W - it.x - itemWidth(it), w: itemWidth(it) };
    }
    case 'f': {
      const swap: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '\u27e8': '\u27e9', '\u27e9': '\u27e8', '\u2308': '\u2309', '\u2309': '\u2308', '\u230a': '\u230b', '\u230b': '\u230a' };
      const ch = swap[it.ch] ?? it.ch;
      return { ...it, ch, close: it.close === undefined ? undefined : !it.close, x: W - it.x - it.w };
    }
    case 'r':
    case 's':
      return { ...it, x: W - it.x - it.w };
    case 'p':
      return { ...it, x: W - it.x, flip: !it.flip };
  }
}

void FLIPPED;

/** mirror a laid out box horizontally: items, children and caret positions (right-to-left documents) */
export function mirrorBox(b: Box): Box {
  const W = b.w;
  const out: Box = { ...b };
  if (b.items) out.items = b.items.map((it) => mirrorItem(it, W));
  if (b.kids) out.kids = b.kids.map((k) => ({ b: mirrorBox(k.b), x: W - k.x - Math.round(k.b.w), y: k.y }));
  if (b.row) {
    const r = b.row;
    out.row = {
      ...r,
      xs: r.xs.map((v) => W - v),
      hx: r.hx?.map((v) => W - v),
      ul: r.ul?.map((u) => (u ? { x0: W - u.x1, x1: W - u.x0, y: u.y } : null)),
    };
  }
  return out;
}

export function layoutDocument(row: Row, _m?: unknown, size = 16, rtl = false): DocLayout {
  const env: Env = { size, level: 0, display: true, rtl };
  const lines: { from: number; to: number }[] = [];
  let from = 0;
  row.forEach((e, i) => {
    if (e.t === 'mspace' && getAttr(e, 'linebreak') === 'newline') {
      lines.push({ from, to: i });
      from = i + 1;
    }
  });
  lines.push({ from, to: row.length });
  const rowsMap: Layout['rows'] = new Map();
  const items: Item[] = [];
  const xsAll: number[] = new Array(row.length + 1).fill(0);
  const ysAll: number[] = new Array(row.length + 1).fill(0);
  const ctAll: number[] = new Array(row.length + 1).fill(0);
  const chAll: number[] = new Array(row.length + 1).fill(0);
  const runsAll: [number, number][] = [];
  const structsAll: boolean[] = row.map((e) => e.c !== undefined);
  const lineInfo: DocLayout['lines'] = [];
  let y = 0;
  let w = 0;
  const boxes = lines.map((ln) => {
    const lb = layoutRow(row.slice(ln.from, ln.to), env, [], ln.from);
    return rtl ? mirrorBox(lb) : lb;
  });
  const width = Math.max(...boxes.map((bx) => bx.w));
  lines.forEach((ln, li) => {
    const piece = row.slice(ln.from, ln.to);
    const b = boxes[li];
    const baseY = y + b.a;
    const fl = flatten(b, rtl ? width - b.w : 0, baseY);
    items.push(...fl.items);
    fl.rows.forEach((v, k) => {
      if (k !== '') rowsMap.set(k, v);
    });
    const rr = fl.rows.get('')!;
    for (let k = 0; k <= piece.length; k++) {
      xsAll[ln.from + k] = rr.xs[Math.min(k, rr.xs.length - 1)];
      ysAll[ln.from + k] = baseY;
      ctAll[ln.from + k] = rr.ct ? rr.ct[Math.min(k, rr.ct.length - 1)] : 0;
      chAll[ln.from + k] = rr.ch ? rr.ch[Math.min(k, rr.ch.length - 1)] : 0;
    }
    rr.runs?.forEach(([f, t]) => runsAll.push([f + ln.from, t + ln.from]));
    lineInfo.push({ from: ln.from, to: ln.to, y: baseY, a: b.a, d: b.d, lift: b.lift ?? 0, uld: rr.uld });
    w = Math.max(w, b.w);
    y = baseY + b.d + (li < lines.length - 1 ? K.lineGap : 0);
  });
  // an empty document: the caret is a bar at the left edge of the empty box, as tall as the box area, with the
  // underline above the box (measured on the reference)
  let ulAll: ({ x0: number; x1: number; y: number } | null)[] | undefined;
  if (row.length === 0) {
    const sz = size / 16;
    const x0 = rtl ? width - boxes[0].w : 0;
    xsAll[0] = x0;
    ctAll[0] = sz - lineInfo[0].a;
    chAll[0] = 17 * sz;
    ulAll = [{ x0, x1: x0 + boxes[0].w, y: 0 }];
  }
  rowsMap.set('', { path: [], x: 0, y: lineInfo[0].y, a: lineInfo[0].a, d: lineInfo[0].d, size, xs: xsAll, ct: ctAll, ch: chAll, runs: runsAll, structs: structsAll, ul: ulAll });
  return { w, a: lineInfo[0].a, d: y - lineInfo[0].y, items, rows: rowsMap, rootYs: ysAll, lines: lineInfo };
}
