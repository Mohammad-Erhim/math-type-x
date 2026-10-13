/**
 * Offline handwriting recogniser behind /hand/recognize (and the client fallback).
 *
 *  1. strokes → symbols: dynamic programming over groups of up to four consecutive strokes, scored by the
 *     template classifier (classify.ts); stray dots / bars are attached afterwards
 *  2. symbols → MathML: fraction bars, radicals, big operators with limits, parentheses and scripts are found
 *     from the geometry of the symbols; digits become numbers, letters identifiers
 *
 * The endpoint contract ({result:{mathml,score}}) lets a stronger recogniser replace it.
 */
import { escText } from '../core/mathml';
import { classifyStrokes, bbox, glyphExtent, Cand } from './classify';
import type { Pt } from './glyphs';

export interface Strokes {
  x: number[][];
  y: number[][];
  /** time stamps (ms) of the points, when the client sends them */
  t?: number[][];
}

interface Sym {
  strokes: Pt[][];
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  cands: Cand[];
  ch: string;
  d: number;
  /** first stroke index (reading order tie-break) */
  first: number;
}

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const w = (s: { x0: number; x1: number }) => s.x1 - s.x0;
const h = (s: { y0: number; y1: number }) => s.y1 - s.y0;
const cx = (s: { x0: number; x1: number }) => (s.x0 + s.x1) / 2;
const cy = (s: { y0: number; y1: number }) => (s.y0 + s.y1) / 2;

function mk(strokes: Pt[][], first: number): Sym {
  const b = bbox(strokes);
  return { strokes, ...b, cands: [], ch: '', d: 1, first };
}

/* ------------------------------------------------------------ segmentation */

const GROUP_PENALTY = 0.055;
const MAX_GROUP = 4;

function sizeOf(strokes: Pt[][]): number {
  const b = bbox(strokes);
  return Math.max(b.x1 - b.x0, b.y1 - b.y0);
}

/** do the polylines of two strokes cross each other? */
function crosses(a: Pt[], b: Pt[]): boolean {
  const A = thin(a);
  const B = thin(b);
  const ccw = (p: Pt, q: Pt, r: Pt) => (r[1] - p[1]) * (q[0] - p[0]) > (q[1] - p[1]) * (r[0] - p[0]);
  for (let i = 0; i + 1 < A.length; i++) {
    for (let j = 0; j + 1 < B.length; j++) {
      const p1 = A[i];
      const p2 = A[i + 1];
      const p3 = B[j];
      const p4 = B[j + 1];
      if (ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)) return true;
    }
  }
  return false;
}

/** at most about 24 points of a stroke (for distance tests) */
function thin(st: Pt[]): Pt[] {
  if (st.length <= 24) return st;
  const k = st.length / 24;
  const out: Pt[] = [];
  for (let i = 0; i < 24; i++) out.push(st[Math.floor(i * k)]);
  out.push(st[st.length - 1]);
  return out;
}

/** can these strokes (consecutive in time) form one symbol? they have to be connected: crossing, stacked or meeting */
function compatible(strokes: Pt[][], unit: number): boolean {
  const boxes = strokes.map((s) => bbox([s]));
  const u = bbox(strokes);
  // the group as a whole is not larger than a couple of symbols
  if (Math.max(u.x1 - u.x0, u.y1 - u.y0) > 3.2 * unit) return false;
  const linked = (i: number, j: number): boolean => {
    const a = boxes[i];
    const b = boxes[j];
    const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const gy = Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1);
    const small = Math.min(a.x1 - a.x0, b.x1 - b.x0);
    // strokes of one symbol overlap horizontally (a narrow stroke counts as overlapping when it lies within the other);
    // for three strokes and more the strokes have to touch or cross, so that neighbouring symbols are not pulled in
    if (strokes.length <= 2 && ox >= 0.3 * Math.max(small, 0.12 * unit) && gy < 0.6 * unit) return true;
    if (strokes.length > 2 && crosses(strokes[i], strokes[j])) return true;
    // strokes that touch (the legs of a v, the humps of an m) belong together as well
    const lim = (strokes.length > 2 ? 0.14 : 0.17) * unit;
    const A = thin(strokes[i]);
    const B = thin(strokes[j]);
    for (const p of A) for (const q of B) if (Math.hypot(p[0] - q[0], p[1] - q[1]) < lim) return true;
    return false;
  };
  // connected through any chain of linked strokes
  const seen = new Set<number>([0]);
  const todo = [0];
  while (todo.length) {
    const i = todo.pop()!;
    for (let j = 0; j < strokes.length; j++) if (!seen.has(j) && linked(i, j)) {
      seen.add(j);
      todo.push(j);
    }
  }
  return seen.size === strokes.length;
}

function segment(strokes: Pt[][], times?: [number, number][]): Sym[] {
  const n = strokes.length;
  const sizes = strokes.map((s) => sizeOf([s])).sort((a, b) => a - b);
  // typical symbol size: a high percentile of the strokes (bars and dots are rarely the tallest)
  const unit = Math.max(8, sizes[Math.floor(sizes.length * 0.75)] || 20);
  const memo = new Map<string, { cands: Cand[]; ok: boolean }>();
  const group = (i: number, j: number) => {
    const key = i + ':' + j;
    let m = memo.get(key);
    if (!m) {
      const g = strokes.slice(i, j + 1);
      const ok = j === i || compatible(g, unit);
      // a long pause between two strokes ends the symbol
      let paused = false;
      if (times) for (let k = i; k < j; k++) if (times[k + 1][0] - times[k][1] > 700) paused = true;
      let cands: Cand[] = [];
      if (ok && !paused) {
        // a stroke far smaller than the others is a point (or a comma when it has a tail)
        if (j === i && sizeOf(g) < 0.15 * unit) cands = [{ ch: '.', d: 0.02 }, { ch: ',', d: 0.05 }];
        else {
          cands = classifyStrokes(g);
          // a point right above (or below) an upright stroke: i / j (or an exclamation mark)
          if (j === i + 1) {
            const sym = mk(g, i);
            const pos = dottedStem(sym);
            if (pos) {
              const stem = g.find((st) => sizeOf([st]) >= 0.3 * sizeOf(g)) ?? g[0];
              const top = classifyStrokes([stem])[0];
              if (top && /^[1lI|!i,j/\\]$/.test(top.ch)) {
                const letter = pos === 'above' ? (top.ch === ',' || top.ch === 'j' ? 'j' : 'i') : '!';
                cands = [{ ch: letter, d: 0.03 }, ...cands.filter((c) => c.ch !== letter)];
              }
            }
          }
        }
      }
      m = { ok: ok && !paused, cands };
      memo.set(key, m);
    }
    return m;
  };
  const best: number[] = new Array(n + 1).fill(Infinity);
  const from: number[] = new Array(n + 1).fill(-1);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let len = 1; len <= MAX_GROUP && j - len >= 0; len++) {
      const g = group(j - len, j - 1);
      if (!g.ok || !g.cands.length) continue;
      const d = g.cands[0].d;
      // several strokes only form one symbol when they match a template well
      const crossing = len > 1 && strokes.slice(j - len, j).some((a, ai, arr) => arr.slice(ai + 1).some((b) => crosses(a, b)));
      if (len > 1 && d > (len === 2 ? 0.095 : 0.085) + (crossing ? 0.045 : 0)) continue;
      let gap = 0;
      if (times && len > 1) for (let k = j - len; k < j - 1; k++) gap += Math.min(1, Math.max(0, times[k + 1][0] - times[k][1]) / 600);
      // strokes that cross each other almost always belong to one symbol (x, +, t, …)
      let cross = 0;
      if (len > 1) {
        const gs = strokes.slice(j - len, j);
        for (let a = 0; a < gs.length && !cross; a++) for (let b = a + 1; b < gs.length && !cross; b++) if (crosses(gs[a], gs[b])) cross = 1;
      }
      // a clean parenthesis stroke is rarely a part of another symbol
      let bracket = 0;
      if (len > 1 && d > 0.04) {
        for (let k = j - len; k < j; k++) {
          const one = group(k, k).cands[0];
          if (one && (one.ch === '(' || one.ch === ')') && one.d < 0.04) bracket = 0.1;
        }
      }
      const cost = best[j - len] + d + GROUP_PENALTY + 0.03 * gap - 0.08 * cross + bracket;
      if (cost < best[j]) {
        best[j] = cost;
        from[j] = j - len;
      }
    }
    if (from[j] < 0) {
      best[j] = best[j - 1] + 0.6;
      from[j] = j - 1;
    }
  }
  const syms: Sym[] = [];
  for (let j = n; j > 0; j = from[j]) {
    const i = from[j];
    const g = group(i, j - 1);
    const s = mk(strokes.slice(i, j), i);
    s.cands = g.cands.length ? g.cands : classifyStrokes(s.strokes);
    syms.push(s);
  }
  return syms.sort((a, b) => a.x0 - b.x0 || a.first - b.first);
}

/* ------------------------------------------------------------ classification in context */

const DIGITS = '0123456789';
const isDigit = (c: string) => c.length === 1 && DIGITS.includes(c);
const isLetter = (c: string) => /^[a-zA-Zα-ωΑ-Ω]$/.test(c);

/** letters that look alike in both cases: lower case unless clearly larger than the rest */
const CASE_PAIRS = new Set('cosuvwxz'.split(''));
/** shapes confused between digits and letters */
const DIGIT_LETTER: Record<string, string> = { o: '0', O: '0', l: '1', I: '1', S: '5', s: '5', Z: '2', z: '2', B: '8', g: '9', q: '9' };

/** two strokes, one a point: is the point above or below the other one? */
function dottedStem(s: Sym): 'above' | 'below' | null {
  if (s.strokes.length !== 2) return null;
  const [a, b] = s.strokes.map((st) => bbox([st]));
  const sa = Math.max(a.x1 - a.x0, a.y1 - a.y0);
  const sb = Math.max(b.x1 - b.x0, b.y1 - b.y0);
  const dot = sa < sb ? a : b;
  const stem = sa < sb ? b : a;
  const ds = Math.min(sa, sb);
  const ss = Math.max(sa, sb);
  if (ds > 0.3 * ss) return null;
  return (dot.y0 + dot.y1) / 2 < (stem.y0 + stem.y1) / 2 ? 'above' : 'below';
}

/** symbols that are small marks by nature */
const MARKS = new Set(['.', ',', "'", '·', ':', ';', '°']);
const GREEK = /^[\u03b1-\u03c9\u0391-\u03a9]$/;

function decide(syms: Sym[]): void {
  const tall = syms.map((s) => Math.max(w(s), h(s))).sort((a, b) => a - b);
  // the size of a normal symbol: the upper quartile (marks and bars are smaller, a fraction bar wider)
  const ref = tall[Math.min(tall.length - 1, Math.floor(tall.length * 0.75))] || 20;
  const heights = syms.filter((s) => !'-=.,'.includes(s.cands[0]?.ch ?? '') && h(s) > 0).map(h).sort((a, b) => a - b);
  const mh = heights[Math.floor(heights.length / 2)] || ref;
  syms.forEach((s) => {
    const size = Math.max(w(s), h(s));
    // a point is small next to the other symbols; a lone symbol is a point only when it is really tiny
    const small = syms.length > 1 ? size < 0.3 * ref : size < 14;
    // the template box is normalised, so the size decides between a point / comma and a stroke or letter
    let cands = s.cands.map((c) => (GREEK.test(c.ch) ? { ch: c.ch, d: c.d + 0.03 } : c));
    if (small) {
      const mark = cands.find((c) => MARKS.has(c.ch));
      if (mark && mark.d < cands[0].d + 0.12) cands = [mark, ...cands.filter((c) => c !== mark)];
    } else {
      const rest = cands.filter((c) => !MARKS.has(c.ch));
      if (rest.length) cands = rest;
    }
    cands.sort((a, b) => (small && MARKS.has(a.ch) && !MARKS.has(b.ch) ? -1 : small && MARKS.has(b.ch) && !MARKS.has(a.ch) ? 1 : a.d - b.d));
    const top = cands[0];
    s.ch = top ? top.ch : '';
    s.d = top ? top.d : 1;
    s.cands = cands;
  });
  syms.forEach((s, i) => {
    // × written like the letter x is the letter, unless it floats at the height of the middle of its neighbours
    if (s.ch === '×') {
      const online = (t: Sym | undefined) => t && (isDigit(t.ch) || isLetter(t.ch) || t.ch === ')') && Math.min(s.y1, t.y1) - Math.max(s.y0, t.y0) > 0.5 * h(s);
      const prev = online(syms[i - 1]) ? syms[i - 1] : undefined;
      const next = online(syms[i + 1]) ? syms[i + 1] : undefined;
      const floats = prev && next && s.y1 < Math.min(prev.y1, next.y1) - 0.15 * Math.max(h(prev), h(next)) && h(s) < 0.8 * Math.max(h(prev), h(next));
      if (!floats) s.ch = 'x';
    }
    // a lone upper-case look-alike that is not clearly taller than the rest is lower case
    if (/^[A-Z]$/.test(s.ch) && CASE_PAIRS.has(s.ch.toLowerCase()) && h(s) < 1.45 * mh) s.ch = s.ch.toLowerCase();
    // digit / letter confusions: follow the neighbours (numbers stay numbers, words stay words)
    const prev = syms[i - 1]?.ch;
    const next = syms[i + 1]?.ch;
    const digitsAround = (prev && isDigit(prev)) || (next && isDigit(next));
    const lettersAround = (prev && isLetter(prev) && !isDigit(prev)) || (next && isLetter(next) && !isDigit(next));
    if (DIGIT_LETTER[s.ch] !== undefined) {
      if (digitsAround && !lettersAround) s.ch = DIGIT_LETTER[s.ch];
      // a lone round shape is zero, a lone stroke is one
      else if (!digitsAround && !lettersAround && /^[oOlI]$/.test(s.ch)) s.ch = DIGIT_LETTER[s.ch];
    }
    // a point above a stroke makes an i (or j), below it an exclamation mark
    const dotted = dottedStem(s);
    if (dotted && /^[i!j1lI|]$/.test(s.ch)) s.ch = dotted === 'above' ? (s.cands.find((c) => c.ch === 'j' && c.d < 0.2) && s.cands.findIndex((c) => c.ch === 'j') < s.cands.findIndex((c) => c.ch === 'i') ? 'j' : 'i') : '!';
  });
}

/* ------------------------------------------------------------ structure */

const OPS_BIG = new Set(['∑', '∫', '∏']);

function token(s: Sym): string {
  const c = s.ch;
  if (isDigit(c)) return `<mn>${c}</mn>`;
  const ent = (ch: string) => `&#x${ch.codePointAt(0)!.toString(16).toUpperCase()};`;
  if (isLetter(c) || c === '∞') return `<mi>${c.codePointAt(0)! > 127 ? ent(c) : escText(c)}</mi>`;
  if (c === '∑' || c === '∫' || c === '∏') return `<mo>${ent(c)}</mo>`;
  if (c.codePointAt(0)! > 127) return `<mo>${ent(c)}</mo>`;
  return `<mo>${escText(c)}</mo>`;
}

function mergeNumbers(parts: { mml: string; num?: string }[]): string {
  const out: string[] = [];
  let run = '';
  const flush = () => {
    if (run) out.push(`<mn>${run}</mn>`);
    run = '';
  };
  for (const p of parts) {
    if (p.num !== undefined) run += p.num;
    else {
      flush();
      out.push(p.mml);
    }
  }
  flush();
  return out.join('');
}

function row(parts: string): string {
  return parts;
}

/** adjacent numbers of a fragment are one number */
function mergeDigitsText(m: string): string {
  let o = m;
  for (;;) {
    const n = o.replace(/<mn>(\d+)<\/mn><mn>(\d+)<\/mn>/g, '<mn>$1$2</mn>');
    if (n === o) return o;
    o = n;
  }
}

/** number of top-level elements of a MathML fragment */
function topLevel(m: string): number {
  let depth = 0;
  let n = 0;
  const re = /<(\/?)([a-z]+)([^>]*?)(\/?)>/g;
  let q: RegExpExecArray | null;
  while ((q = re.exec(m))) {
    if (q[1]) depth--;
    else if (q[4]) {
      if (depth === 0) n++;
    } else {
      if (depth === 0) n++;
      depth++;
    }
  }
  return n;
}

/** the symbols of one baseline run → MathML (scripts are attached to the symbol before them) */
function sequence(syms: Sym[]): string {
  if (!syms.length) return '';
  const sorted = [...syms].sort((a, b) => cx(a) - cx(b));
  const hs = sorted.filter((s) => !'-=.,\'()[]{}|/'.includes(s.ch)).map(h).sort((a, b) => a - b);
  const mh = hs.length ? hs[Math.floor(hs.length / 2)] : Math.max(...sorted.map(h));
  type Part = { mml: string; num?: string; sym?: Sym };
  const parts: Part[] = [];
  let base: Sym | null = null;
  let lastBase: Part | null = null;

  /** the bottom of a symbol on the writing line (letters with a tail hang below it) */
  const lineBottom = (t: Sym): number => {
    const ext = glyphExtent(t.ch);
    if (ext && ext.bottom > 1.12 && ext.bottom > ext.top) return t.y0 + ((1 - ext.top) / (ext.bottom - ext.top)) * h(t);
    return t.y1;
  };
  /** position of s relative to the base symbol: above (1), below (-1) or on its line (0) */
  const relation = (s: Sym, b: Sym, loose = false): number => {
    if ('+=<>±×÷≤≥≠'.includes(s.ch)) return 0;
    // a minus sign is a script only when it is raised clearly above the line
    if (s.ch === '-' && cy(s) > b.y0 + 0.1 * h(b)) return 0;
    const ref = Math.max(h(b), 0.6 * mh);
    const bcy = (b.y0 + b.y1) / 2;
    const scy = cy(s);
    const k = loose ? 0.12 : 0.3;
    const bb = lineBottom(b);
    if (scy < bcy - k * ref && s.y1 < bb - 0.2 * ref) return 1;
    if (scy > bcy + (loose ? 0.12 : 0.22) * ref && lineBottom(s) > bb + (loose ? 0.08 : 0.16) * ref && s.y0 > b.y0 + 0.08 * ref) return -1;
    // a symbol that sits clearly below the writing line of the base is a subscript even when it is as tall as the base
    if (lineBottom(s) > bb + 0.2 * ref && s.y0 > b.y0 + 0.12 * ref && h(s) < ref) return -1;
    return 0;
  };

  let i = 0;
  while (i < sorted.length) {
    const s = sorted[i];
    const rel = base && lastBase && '.,\'' .indexOf(s.ch) < 0 && isRelationalBase(base) ? relation(s, base) : 0;
    if (rel !== 0 && base && lastBase) {
      const collect = (dir: number, from: number): { run: Sym[]; next: number } => {
        const run: Sym[] = [];
        let k = from;
        while (k < sorted.length) {
          const t = sorted[k];
          if (relation(t, base!, true) !== dir) break;
          // a gap wider than a symbol ends the script
          if (run.length && t.x0 - run[run.length - 1].x1 > 1.4 * mh) break;
          run.push(t);
          k++;
        }
        return { run, next: k };
      };
      const first = collect(rel, i);
      let second: { run: Sym[]; next: number } | null = null;
      // the other script of the same base follows right behind the first one
      if (first.next < sorted.length && relation(sorted[first.next], base, true) === -rel) second = collect(-rel, first.next);
      const wrapIf = (run: Sym[]) => {
        const m = mergeDigitsText(parse(run));
        return topLevel(m) > 1 ? `<mrow>${m}</mrow>` : m;
      };
      const sup = rel === 1 ? first.run : second?.run;
      const sub = rel === -1 ? first.run : second?.run;
      // a lone digit-looking symbol with a subscript is rather a letter (z₄, not 2₄)
      if (lastBase.num !== undefined && lastBase.sym && sub && !sup && lastBase.sym.cands) {
        const alt = lastBase.sym.cands.find((c) => /^[a-z]$/.test(c.ch) && c.d < lastBase!.sym!.d + 0.05);
        if (alt) {
          lastBase.sym.ch = alt.ch;
          lastBase.mml = token(lastBase.sym);
          lastBase.num = undefined;
        }
      }
      // a script belongs to the whole number in front of it
      if (lastBase.num !== undefined) {
        let k = parts.length - 1;
        let digits = '';
        while (k >= 0 && parts[k].num !== undefined) digits = parts[k--].num + digits;
        parts.splice(k + 1, parts.length - k - 1, lastBase);
        lastBase.mml = `<mn>${digits}</mn>`;
      }
      const baseMml = lastBase.mml;
      lastBase.num = undefined;
      lastBase.mml = sup && sub ? `<msubsup>${baseMml}${wrapIf(sub)}${wrapIf(sup)}</msubsup>` : sup ? `<msup>${baseMml}${wrapIf(sup)}</msup>` : `<msub>${baseMml}${wrapIf(sub!)}</msub>`;
      i = second ? second.next : first.next;
      continue;
    }
    const part: Part = isDigit(s.ch) ? { mml: token(s), num: s.ch, sym: s } : { mml: token(s), sym: s };
    parts.push(part);
    if (!'.,\''.includes(s.ch)) {
      base = s;
      lastBase = part;
    }
    i++;
  }
  return mergeNumbers(parts);
}

function isRelationalBase(s: Sym): boolean {
  return !'+-=<>±×÷/,.'.includes(s.ch) || s.ch === ')';
}

/** find the outermost structure of a set of symbols and recurse; plain runs end up in sequence() */
function parse(syms: Sym[]): string {
  if (!syms.length) return '';
  // radicals
  const rads = syms.filter((s) => s.ch === '√' && w(s) > 0.6 * h(s));
  // fraction bars: a long horizontal "-" with symbols above and below inside its x-range
  const medW = [...syms].map(w).sort((a, b) => a - b)[Math.floor(syms.length / 2)] || 10;
  const bars = syms.filter((s) => s.ch === '-' && w(s) >= 1.1 * medW + 4);
  type Cut = { kind: 'frac' | 'rad'; s: Sym; x0: number; x1: number };
  const cuts: Cut[] = [];
  for (const bar of bars) {
    const inside = (t: Sym) => t !== bar && cx(t) >= bar.x0 - 0.1 * w(bar) && cx(t) <= bar.x1 + 0.1 * w(bar);
    const above = syms.filter((t) => inside(t) && t.y1 <= bar.y0 + 0.4 * h(t) && cy(t) < bar.y0);
    const below = syms.filter((t) => inside(t) && t.y0 >= bar.y1 - 0.4 * h(t) && cy(t) > bar.y1);
    if (above.length && below.length) cuts.push({ kind: 'frac', s: bar, x0: bar.x0, x1: bar.x1 });
  }
  for (const r of rads) cuts.push({ kind: 'rad', s: r, x0: r.x0, x1: r.x1 });
  if (cuts.length) {
    const cut = cuts.sort((a, b) => b.x1 - b.x0 - (a.x1 - a.x0))[0];
    const others = syms.filter((t) => t !== cut.s);
    if (cut.kind === 'frac') {
      const bar = cut.s;
      const inside = (t: Sym) => cx(t) >= bar.x0 - 0.1 * w(bar) && cx(t) <= bar.x1 + 0.1 * w(bar);
      const num = others.filter((t) => inside(t) && cy(t) < bar.y0);
      const den = others.filter((t) => inside(t) && cy(t) > bar.y1);
      const used = new Set([...num, ...den]);
      const rest = others.filter((t) => !used.has(t));
      const left = rest.filter((t) => cx(t) < cx(bar));
      const right = rest.filter((t) => cx(t) >= cx(bar));
      const arg = (m: string) => (topLevel(m) > 1 ? `<mrow>${m}</mrow>` : m || '<mrow/>');
      return parse(left) + `<mfrac>${arg(parse(num))}${arg(parse(den))}</mfrac>` + parse(right);
    }
    // radical: everything under the vinculum
    const r = cut.s;
    const inRad = (t: Sym) => cx(t) > r.x0 + 0.18 * w(r) && cx(t) < r.x1 + 0.05 * w(r) && cy(t) > r.y0 - 0.15 * h(r) && cy(t) < r.y1 + 0.1 * h(r);
    const index = others.filter((t) => cx(t) < r.x0 + 0.35 * w(r) && cy(t) < cy(r) && t.x1 < r.x0 + 0.55 * w(r) && h(t) < 0.6 * h(r) && cx(t) >= r.x0 - 0.2 * w(r));
    const content = others.filter((t) => inRad(t) && !index.includes(t));
    const used = new Set([...content, ...index]);
    const rest = others.filter((t) => !used.has(t));
    const left = rest.filter((t) => cx(t) < cx(r));
    const right = rest.filter((t) => cx(t) >= cx(r));
    const inner = parse(content);
    const body = content.length ? inner : '<mrow/>';
    const rad = index.length ? `<mroot>${content.length > 1 ? `<mrow>${body}</mrow>` : body}${parse(index)}</mroot>` : `<msqrt>${body}</msqrt>`;
    return parse(left) + rad + parse(right);
  }
  // big operators with limits
  const big = syms.find((s) => OPS_BIG.has(s.ch));
  if (big) {
    const above = syms.filter((t) => t !== big && cx(t) >= big.x0 - 0.3 * w(big) && cx(t) <= big.x1 + 0.3 * w(big) && t.y1 <= big.y0 + 0.2 * h(big) && cy(t) < big.y0);
    const below = syms.filter((t) => t !== big && cx(t) >= big.x0 - 0.3 * w(big) && cx(t) <= big.x1 + 0.3 * w(big) && t.y0 >= big.y1 - 0.2 * h(big) && cy(t) > big.y1);
    if ((above.length || below.length) && big.ch !== '∫') {
      const used = new Set([...above, ...below, big]);
      const rest = syms.filter((t) => !used.has(t));
      const left = rest.filter((t) => cx(t) < cx(big));
      const right = rest.filter((t) => cx(t) >= cx(big));
      const lo = parse(below);
      const hi = parse(above);
      const op = token(big);
      const o = above.length && below.length ? `<munderover>${op}${below.length > 1 ? `<mrow>${lo}</mrow>` : lo}${above.length > 1 ? `<mrow>${hi}</mrow>` : hi}</munderover>` : below.length ? `<munder>${op}${lo}</munder>` : `<mover>${op}${hi}</mover>`;
      return parse(left) + o + parse(right);
    }
  }
  // parentheses that pair up
  const pairs = matchFences(syms);
  if (pairs) {
    const { open, close } = pairs;
    const inner = syms.filter((t) => cx(t) > cx(open) && cx(t) < cx(close));
    const left = syms.filter((t) => t !== open && cx(t) <= cx(open));
    const right = syms.filter((t) => t !== close && cx(t) >= cx(close));
    const body = parse(inner);
    const attrs = open.ch === '(' ? '' : ` open="${open.ch}" close="${close.ch}"`;
    const content = inner.length > 1 ? `<mrow>${body}</mrow>` : body;
    return sequence(left) + `<mfenced${attrs}>${content}</mfenced>` + parse(right);
  }
  return sequence(syms);
}

function matchFences(syms: Sym[]): { open: Sym; close: Sym } | null {
  const sorted = [...syms].sort((a, b) => cx(a) - cx(b));
  const pairsOf: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  for (let i = 0; i < sorted.length; i++) {
    const o = sorted[i];
    if (!pairsOf[o.ch]) continue;
    let depth = 0;
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].ch === o.ch) depth++;
      if (sorted[j].ch === pairsOf[o.ch]) {
        if (depth === 0) return { open: o, close: sorted[j] };
        depth--;
      }
    }
  }
  return null;
}

/** letters of a function name read as one identifier */
function words(mml: string): string {
  return mml.replace(/(?:<mi>[a-z]<\/mi>){2,}/g, (run) => {
    const text = run.replace(/<\/?mi>/g, '');
    let out = '';
    let i = 0;
    const FN = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'lim', 'exp', 'max', 'min'];
    while (i < text.length) {
      const f = FN.find((n) => text.startsWith(n, i));
      if (f) {
        out += `<mi>${f}</mi>`;
        i += f.length;
      } else out += `<mi>${text[i++]}</mi>`;
    }
    return out;
  });
}

export const debug: { syms?: Sym[] } = {};

export function recognize(input: Strokes): { mathml: string; score: number } {
  const strokes: Pt[][] = [];
  const times: [number, number][] = [];
  for (let i = 0; i < input.x.length; i++) {
    const xs = input.x[i] ?? [];
    const ys = input.y[i] ?? [];
    const pts: Pt[] = [];
    for (let k = 0; k < Math.min(xs.length, ys.length); k++) {
      if (!Number.isFinite(xs[k]) || !Number.isFinite(ys[k])) continue;
      const prev = pts[pts.length - 1];
      if (prev && prev[0] === xs[k] && prev[1] === ys[k]) continue;
      pts.push([xs[k], ys[k]]);
    }
    if (pts.length) {
      strokes.push(pts);
      const ts = input.t?.[i];
      times.push(ts && ts.length ? [ts[0], ts[ts.length - 1]] : [i * 1000, i * 1000 + 500]);
    }
  }
  if (!strokes.length) return { mathml: `<math${NS}/>`, score: 0 };
  const syms = segment(strokes, input.t ? times : undefined);
  decide(syms);
  debug.syms = syms;
  // shapes that match nothing well are scribbles, not symbols
  const kept = syms.filter((s) => s.ch && s.d < 0.16);
  const body = words(parse(kept));
  const score = kept.length ? kept.reduce((a, s) => a + Math.max(0, 1 - s.d * 2.2), 0) / kept.length : 0;
  return { mathml: `<math${NS}>${body}</math>`, score: Math.round(score * 100) / 100 };
}
