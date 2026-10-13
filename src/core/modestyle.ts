/**
 * Bold / Italic switched on while a toolbar control is used (reference behaviour, probed on the toolbar):
 * the inserted fragment is written in that style, brackets become a styled group of stretchy operators and the
 * letters typed next are written in the style of the structure that received the caret.
 */
import { El, Row, Step, getAttr, newGroup } from './model';
import { glyphText } from '../layout/glyphs';
import { InsertSpec, Slot } from './templates';

export type ModeStyle = 'bold' | 'italic' | 'bold-italic';

/** what typed tokens look like right after the insertion: slot → the mode style itself, plain → no attribute */
export type StyleLock = 'slot' | 'plain' | null;

const BOLD_OF: Record<string, string> = { normal: 'bold', fraktur: 'bold-fraktur', script: 'bold-script', 'double-struck': 'bold', 'sans-serif': 'bold-sans-serif', monospace: 'bold' };
const LETTER_LIKE_SYMBOLS = new Set([0x2115, 0x2124, 0x211a, 0x2102, 0x211d, 0x2119]); // N Z Q C R P double-struck
const SCRIPT_COMMANDS = new Set(['msup', 'msub', 'msubsup', 'mmultiscripts']);
/** operators after which the letters typed next stay plain: sums, products, integrals, big unions … */
function isLargeOperator(cp: number): boolean {
  return cp === 0x2211 || cp === 0x220f || cp === 0x2210 || (cp >= 0x22c0 && cp <= 0x22c3) || (cp >= 0x222b && cp <= 0x2233) || (cp >= 0x2a00 && cp <= 0x2a06);
}
/** operators the reference leaves unstyled in italic mode */
const ITALIC_PLAIN_OPS = new Set([0x2190]);

interface RowMap {
  out: Row;
  /** new index of every old element (plus the end position) */
  idx: number[];
  kids: Map<number, KidMap>;
}
interface KidMap {
  rows: RowMap[];
  /** flattened fences: the row that now holds everything and the position of the placeholder of each empty slot */
  flat?: Row;
  mrowAt?: (number | undefined)[];
  /** the arguments sit in a group inside the styled group (several arguments) */
  wrapped?: boolean;
  /** index offset of each old slot inside the new row (fences are flattened into one row) */
  offsets: number[];
  flattened: boolean;
}

const tokenTags = new Set(['mi', 'mn', 'mo', 'mspace', 'mtext']);

function setVariant(e: El, v: string | null, first: boolean): void {
  const i = e.a.findIndex(([k]) => k === 'mathvariant');
  if (v === null) {
    if (i >= 0) e.a.splice(i, 1);
    return;
  }
  if (i >= 0) e.a[i][1] = v;
  else if (first) e.a.unshift(['mathvariant', v]);
  else e.a.push(['mathvariant', v]);
}

function styleToken(e: El, M: ModeStyle, runLen: number, top: boolean, keepPlain = false): void {
  const mv = getAttr(e, 'mathvariant');
  const single = runLen === 1;
  const x = e.x ?? '';
  if (M === 'italic') {
    if (mv !== undefined) {
      // upright Latin and Greek letters follow the mode: a plain identifier (italic by default)
      if (mv === 'normal' && e.t === 'mi' && /^[A-Za-zΑ-ω]$/.test(x)) setVariant(e, null, top);
      return;
    }
    if (e.t === 'mi' && (single || keepPlain)) return;
    if (top && e.t === 'mo' && ITALIC_PLAIN_OPS.has(x.codePointAt(0) ?? 0)) return;
    setVariant(e, 'italic', top);
    return;
  }
  if (M === 'bold-italic') {
    if (mv !== undefined) {
      const v = BOLD_OF[mv];
      if (mv === 'double-struck' && e.t === 'mi' && /^[A-Za-z]$/.test(x)) e.x = glyphText('mi', x, 'double-struck');
      if (v) setVariant(e, v, top);
      return;
    }
    setVariant(e, 'bold-italic', top);
    return;
  }
  // bold
  if (mv !== undefined) {
    const v = BOLD_OF[mv];
    if (mv === 'double-struck' && e.t === 'mi' && /^[A-Za-z]$/.test(x)) e.x = glyphText('mi', x, 'double-struck');
    if (v) setVariant(e, v, top);
    return;
  }
  setVariant(e, e.t === 'mi' && single ? 'bold-italic' : 'bold', top);
}

function mapRow(row: Row, M: ModeStyle, top: boolean, state: { fence: boolean; script: boolean; plain: boolean; lim?: boolean }): RowMap {
  const out: Row = [];
  const idx: number[] = [];
  const kids = new Map<number, KidMap>();
  // run lengths of grouped tokens (multi-letter identifiers)
  const runLen = (i: number): number => {
    const e = row[i];
    if (e.g === undefined) return 1;
    let n = 0;
    for (const o of row) if (o.c === undefined && o.g === e.g && o.t === e.t) n++;
    return n;
  };
  let limDone = -1;
  row.forEach((e0, i) => {
    idx[i] = out.length;
    const runText = e0.c === undefined && e0.t === 'mi' && e0.g !== undefined ? row.filter((o) => o.g === e0.g).map((o) => o.x).join('') : '';
    if (M === 'italic' && (runText === 'csc' || runText === 'sec' || runText === 'cot') && getAttr(e0, 'mathvariant') === undefined) {
      // these names are not italicised as one word: plain letters
      idx[i] = out.length;
      const { g: _g, ...rest } = e0;
      void _g;
      out.push({ ...rest, a: [], g: newGroup() } as El);
      return;
    }
    if (M === 'italic' && e0.c === undefined && e0.t === 'mi' && e0.g !== undefined && runLen(i) === 3 && runText === 'lim') {
      // an italic function name is written letter by letter inside a group
      if (limDone === e0.g) {
        idx[i] = out.length - 1;
        return;
      }
      limDone = e0.g;
      out.push({ t: 'mrow', a: [], c: [row.filter((o) => o.g === e0.g).map((o) => ({ t: 'mi', a: [['mathvariant', 'italic']] as [string, string][], x: o.x, g: newGroup() }))] });
      state.plain = true;
      return;
    }
    const e: El = { ...e0, a: e0.a.map(([k, v]) => [k, v] as [string, string]) };
    if (e.c === undefined) {
      if (tokenTags.has(e.t)) {
        // tokens that are not typed text: placeholders keep their emptiness
        styleToken(e, M, runLen(i), top, top && joinsTyped(row, M) && !state.script);
        const cp = (e.x ?? '').codePointAt(0) ?? 0;
        if (e.t === 'mo' && (isLargeOperator(cp) || getAttr(e, 'largeop') === 'true')) state.plain = true;
        if (e.t === 'mo' && cp === 0x2190) state.plain = true;
        if (e.t === 'mspace') state.plain = true;
        if (e.t === 'mi' && LETTER_LIKE_SYMBOLS.has(cp)) state.plain = true;
        if (e.t === 'mi' && e.g !== undefined && runLen(i) > 1 && row.filter((o) => o.g === e.g).map((o) => o.x).join('') === 'lim') state.plain = true;
      }
      out.push(e);
      return;
    }
    // the text slot of a big operator carries the style of the operator
    if (e.t === 'mo' && e.c && !e.a.some(([k]) => k === 'mathvariant')) setVariant(e, M === 'bold' ? 'bold' : M === 'italic' ? 'italic' : 'bold-italic', false);
    if (SCRIPT_COMMANDS.has(e.t)) state.script = true;
    const rows = e.c.map((r) => mapRow(r, M, false, state));
    if (e.t === 'mfenced') {
      state.fence = true;
      const open = getAttr(e, 'open') ?? '(';
      const close = getAttr(e, 'close') ?? ')';
      const seps = (getAttr(e, 'separators') ?? ',').replace(/\s+/g, '');
      void seps;
      const flat: Row = [];
      const offsets: number[] = [];
      const mrowAt: (number | undefined)[] = [];
      flat.push({ t: 'mo', a: [['stretchy', 'true']], x: open });
      if (rows.length === 1) {
        offsets[0] = flat.length;
        if (rows[0].out.length === 0) {
          mrowAt[0] = flat.length;
          flat.push({ t: 'mrow', a: [], c: [[]] });
        }
        flat.push(...rows[0].out);
      } else {
        // several arguments: one group with comma separators (the reference ignores the separators attribute)
        const inner: Row = [];
        rows.forEach((rm, k) => {
          offsets[k] = inner.length;
          if (rm.out.length === 0) {
            mrowAt[k] = inner.length;
            inner.push({ t: 'mrow', a: [], c: [[]] });
          }
          inner.push(...rm.out);
          if (k < rows.length - 1) inner.push({ t: 'mo', a: [], x: ',', g: newGroup() });
        });
        flat.push({ t: 'mrow', a: [], c: [inner] });
        kids.set(i, { rows, offsets, flattened: true, flat: inner, mrowAt, wrapped: true });
        flat.push({ t: 'mo', a: [['stretchy', 'true']], x: close });
        out.push({ t: 'mstyle', a: [['mathvariant', M]], c: [flat] });
        return;
      }
      flat.push({ t: 'mo', a: [['stretchy', 'true']], x: close });
      kids.set(i, { rows, offsets, flattened: true, flat, mrowAt });
      out.push({ t: 'mstyle', a: [['mathvariant', M]], c: [flat] });
      return;
    }
    kids.set(i, { rows, offsets: rows.map(() => 0), flattened: false });
    out.push({ ...e, c: rows.map((r) => r.out) });
  });
  idx[row.length] = out.length;
  return { out, idx, kids };
}

function remap(map: RowMap, path: Step[], index: number, drops: { row: Row; at: number }[], via?: { fence: boolean }): { path: Step[]; index: number } {
  if (path.length === 0) return { path, index: map.idx[Math.min(index, map.idx.length - 1)] };
  const [i, s] = path[0];
  const kid = map.kids.get(i);
  const ni = map.idx[i];
  if (!kid) return { path, index };
  if (kid.flattened && via) via.fence = true;
  const sub = remap(kid.rows[s], path.slice(1), index, drops, via);
  const off = kid.offsets[s] ?? 0;
  if (kid.flattened) {
    // the caret goes into an empty slot: the placeholder group disappears
    const at = kid.mrowAt?.[s];
    if (at !== undefined && kid.flat && sub.path.length === 0) drops.push({ row: kid.flat, at });
    // everything inside the fence now lives in the single row of the styled group (or the group inside it)
    const lead: Step[] = kid.wrapped ? [[ni, 0], [1, 0]] : [[ni, 0]];
    if (sub.path.length === 0) return { path: lead, index: sub.index + off };
    const [j, t] = sub.path[0];
    return { path: [...lead, [j + off, t], ...sub.path.slice(1)], index: sub.index };
  }
  return { path: [[ni, s], ...sub.path], index: sub.index };
}

export interface StyledSpec {
  spec: InsertSpec;
  lock: StyleLock;
  /** a flat symbol inserted from the toolbar that typed letters join (π, chemical elements) */
  merge: boolean;
}

/** write the fragment of `spec` in the mode style `M` and decide how the next typed letters look */
export function styleSpec(spec: InsertSpec, M: ModeStyle): StyledSpec {
  const state = { fence: false, script: false, plain: false };
  const map = mapRow(spec.tree, M, true, state);
  const drops: { row: Row; at: number }[] = [];
  const via = { fence: false };
  const fixSlot = (s: Slot | null, track = false): Slot | null => {
    if (!s) return s;
    const r = remap(map, s.path, s.index, drops, track ? via : undefined);
    return { ...s, path: r.path, index: r.index };
  };
  const next: InsertSpec = { ...spec, tree: map.out, caret: fixSlot(spec.caret, true), sel: fixSlot(spec.sel), takePrev: fixSlot(spec.takePrev) };
  const uniq = drops.filter((d, i) => drops.findIndex((o) => o.row === d.row && o.at === d.at) === i);
  uniq.sort((a, b) => b.at - a.at).forEach((d) => d.row.splice(d.at, 1));
  const structure = spec.tree.some((e) => e.c !== undefined);
  const caretInside = !!spec.caret && spec.caret.path.length > 0;
  let lock: StyleLock = null;
  // a script command types into its base like ordinary text; the script slots take the mode style
  const last = spec.caret && spec.caret.path.length ? spec.caret.path[spec.caret.path.length - 1] : null;
  const scriptCommand = spec.tree.length === 1 && SCRIPT_COMMANDS.has(spec.tree[0].t) && !state.plain && (!last || last[1] === 0);
  if (state.fence && via.fence) lock = 'plain';
  else if (scriptCommand) lock = null;
  else if (structure && caretInside) lock = 'slot';
  else if (state.plain && spec.caretAfter) lock = 'plain';
  return { spec: next, lock, merge: joinsTyped(spec.tree, M) };
}

/**
 * an upright identifier inserted from the toolbar (π, a chemical element, a double-struck letter in bold) takes the
 * letters typed right after it into the same identifier
 */
export function joinsTyped(tree: Row, M: ModeStyle | null): boolean {
  if (tree.length === 0 || tree.some((e) => e.c !== undefined || e.t !== 'mi' || e.g !== tree[0].g || e.g === undefined)) return false;
  const text = tree.map((e) => e.x ?? '').join('');
  const mv = getAttr(tree[0], 'mathvariant');
  if ((M === 'bold' || M === 'bold-italic') && mv === 'double-struck' && tree.length === 1) return true;
  if (!/^[A-Za-z\u0391-\u03c9]+$/.test(text) && !(M === 'bold' && text === '\u2119')) return false;
  if (tree.length === 1) return mv === 'normal' || (M === 'bold' && text === '\u2119');
  return mv === undefined;
}

/**
 * regular text mode: operator symbols written next to the caret become text (merged into one run);
 * inside structures only the integral signs follow, everything else keeps its operator token
 */
export function textTokens(row: Row): boolean {
  let converted = false;
  let top = true;
  const walk = (r: Row, atTop: boolean): void => {
    let grp: number | undefined;
    for (const e of r) {
      if (e.c !== undefined) {
        grp = undefined;
        e.c.forEach((c) => walk(c, false));
        if (atTop) top = false;
        continue;
      }
      const cp = (e.x ?? '').codePointAt(0) ?? 0;
      const convert = e.t === 'mo' && !!e.x && e.a.length === 0 && ((atTop && top) || (cp >= 0x222b && cp <= 0x2233));
      if (convert) {
        e.t = 'mtext';
        if (grp === undefined) grp = newGroup();
        e.g = grp;
        converted = true;
      } else grp = undefined;
    }
  };
  walk(row, true);
  return converted;
}

/** automatic italic off: after these insertions the letters typed next stay plain */
export function plainAfter(spec: InsertSpec): boolean {
  if (!spec.caretAfter) return false;
  let plain = false;
  const visit = (row: Row): void => {
    for (const e of row) {
      if (e.c !== undefined) {
        e.c.forEach(visit);
        continue;
      }
      const cp = (e.x ?? '').codePointAt(0) ?? 0;
      const mv = getAttr(e, 'mathvariant');
      if (e.t === 'mo' && (isLargeOperator(cp) || getAttr(e, 'largeop') === 'true' || cp === 0x2190)) plain = true;
      if (e.t === 'mspace') plain = true;
      if (e.t === 'mi' && (LETTER_LIKE_SYMBOLS.has(cp) || mv === 'fraktur' || mv === 'script' || mv === 'double-struck')) plain = true;
      if (e.t === 'mi' && e.g !== undefined && row.filter((o) => o.g === e.g).map((o) => o.x).join('') === 'lim') plain = true;
    }
  };
  visit(spec.tree);
  return plain;
}
