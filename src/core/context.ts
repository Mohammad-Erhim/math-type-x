/**
 * Contextual tab model (SRS 4.11, Appendix G): which controls are offered for the structure at the caret
 * and what each control does to the document.
 */
import { El, Row, Step, getAttr, setAttr, cloneRow, tryRowAt, rowAt, newGroup, VALIGN_TAGS } from './model';
import { EditorCore } from './engine';
import { DOC_STYLE_PREFIX, docStyleOf } from './mathml';
import STRETCHY from '../data/stretchy.json';

export type CtxKind = 'matrix' | 'table' | 'piecewise' | 'aligned' | 'fence_in' | 'operator' | 'multiline' | 'stack' | 'longdiv' | 'mspace' | 'sum' | 'symbol_sel' | 'numsep_sel' | 'numsep' | 'structure';

export interface CtxControl {
  id: string;
  title: string;
  kind: 'button' | 'toggle' | 'select' | 'length';
  /** icon key understood by the artwork module */
  icon: string;
  options?: { value: string; label: string }[];
  /** group index for separators in the panel */
  group: number;
  disabled?: boolean;
}

export interface CtxState {
  kind: CtxKind;
  controls: CtxControl[];
  /** arrangement of the controls in the contextual tab (src/data/ctx-layout.json) */
  layout: string;
}

const STRETCH_ON = new Set<number>((STRETCHY as { on: number[] }).on);
const STRETCH_OFF = new Set<number>((STRETCHY as { off: number[] }).off);

/** operators that can be switched between stretchy and not stretchy (arrows, braces, accents, fences): their default state, otherwise null */
export function stretchDefault(el?: El): boolean | null {
  if (!el || el.t !== 'mo' || el.c !== undefined) return null;
  const x = el.x ?? '';
  if ([...x].length !== 1) return null;
  const cp = x.codePointAt(0)!;
  return STRETCH_ON.has(cp) ? true : STRETCH_OFF.has(cp) ? false : null;
}

/** which recorded arrangement of the contextual tab shows the controls of `loc` */
export function ctxLayoutKey(loc: Located): string {
  const key = caretLayoutKey(loc);
  if (!loc.nudge) return key;
  // nudge buttons, a separator, then the controls of the context (derived and checked in tools/gen/ctx_layout.py)
  switch (loc.kind) {
    case 'symbol_sel':
      return loc.spacing ? (loc.stretchy ? 'sel_operator_st' : 'sel_symbol_sp') : 'sel_symbol';
    case 'numsep_sel':
      return loc.spacing ? 'sel_numsep_sel_sp' : 'sel_numsep_sel';
    case 'piecewise':
      return 'sel_' + caretLayoutKey({ ...loc, kind: 'matrix' });
    default:
      return 'sel_' + key;
  }
}

function caretLayoutKey(loc: Located): string {
  const st = !!loc.stretchy;
  switch (loc.kind) {
    case 'matrix':
    case 'piecewise':
      return loc.spacing ? (st ? 'matrix_st' : 'matrix_sp') : 'matrix';
    case 'table':
      return loc.spacing ? (st ? 'table_st' : 'table_sp') : 'table';
    case 'aligned':
      return loc.spacing ? (st ? 'aligned_st' : 'aligned_sp') : 'aligned';
    case 'fence_in':
      return loc.spacing ? (st ? 'fence_st' : 'fence_sp') : 'fence';
    case 'structure':
      return 'structure';
    case 'operator':
      return st ? 'operator_st' : 'operator';
    case 'sum':
      return 'sum';
    case 'mspace':
      return 'mspace';
    case 'multiline':
    case 'longdiv':
      return loc.spacing ? (st ? 'multiline_st' : 'multiline_sp') : 'multiline';
    case 'stack':
      return loc.inNumber ? 'stack_merge' : 'stack';
    case 'symbol_sel':
      return 'symbol';
    case 'numsep_sel':
      return 'numsep_sel';
    case 'numsep':
      return 'numsep';
  }
}

// option texts as listed by the reference (its values for the angle brackets / double bar differ: see tests/context.test.ts)
const BRACKETS: [string, string][] = [['', ''], ['(', '('], [')', ')'], ['[', '['], [']', ']'], ['⟨', '⟨'], ['⟩', '⟩'], ['{', '{'], ['}', '}'], ['⌊', '⌊'], ['⌋', '⌋'], ['⌈', '⌈'], ['⌉', '⌉'], ['⟦', '⟦'], ['⟧', '⟧'], ['|', '|'], ['‖', '‖']];
const SEPS: [string, string][] = [[',', ','], ['.', '.'], [';', ';'], [':', ':'], ['\u00A0', '␣']];
const DEC_SEPS: [string, string][] = [['dot', '0.0'], ['comma', '0,0'], ['apostrophe', "0'0"], ['space', '0 0']];
const STACK_SPACING = ['medium', '0px', '1px', '2px', '3px', '4px', '5px', '6px', '7px', '8px', '9px', '10px', '12px', '15px', '20px', '25px', '30px'];

const sel = (list: [string, string][]) => list.map(([value, label]) => ({ value, label }));

/* ----------------------------------------------------------- locating */

export interface Hit {
  /** element and where it lives */
  row: Row;
  index: number;
  el: El;
  path: Step[];
  /** slot index inside `el` the caret is in (tables: cell index) */
  slot: number;
  /** enclosing fence of a table (matrix / piecewise) */
  fence?: { row: Row; index: number; el: El; path: Step[] };
}

/** walk from the caret outwards and return the chain of enclosing elements (innermost first) */
export function enclosing(core: EditorCore): Hit[] {
  const out: Hit[] = [];
  const { path } = core.caret;
  for (let d = path.length - 1; d >= 0; d--) {
    const [i, s] = path[d];
    const rowPath = path.slice(0, d);
    const row = tryRowAt(core.row, rowPath);
    if (!row || !row[i]) continue;
    out.push({ row, index: i, el: row[i], path: rowPath, slot: s });
  }
  return out;
}

function tableCtx(h: Hit, chain: Hit[]): { kind: CtxKind; fence?: Hit } | null {
  if (h.el.t !== 'mtable') return null;
  const outer = chain[chain.indexOf(h) + 1];
  // fence immediately wrapping the table (single child)
  if (outer && outer.el.t === 'mfenced' && outer.el.c![0].length === 1 && outer.el.c![0][0] === h.el) {
    const open = getAttr(outer.el, 'open');
    const close = getAttr(outer.el, 'close');
    const ca = (getAttr(h.el, 'columnalign') ?? '').split(/\s+/).filter(Boolean);
    if (open === '{' && close === '' && ca[0] === 'left' && ca.length === 1) return { kind: 'piecewise', fence: outer };
    return { kind: 'matrix', fence: outer };
  }
  const ca = (getAttr(h.el, 'columnalign') ?? '').split(/\s+/).filter(Boolean);
  if (ca.length === 2 && ca[0] === 'right' && ca[1] === 'left') return { kind: 'aligned' };
  return { kind: 'table' };
}

export interface Located {
  kind: CtxKind;
  table?: Hit;
  fence?: Hit;
  el?: El;
  /** for operator-like contexts: the token elements */
  tokens?: { row: Row; index: number }[];
  hit?: Hit;
  /** the Left / Right spacing controls apply (operator adjacent, line break adjacent, …) */
  spacing?: boolean;
  /** the operator next to the caret (spacing / stretchy controls refer to it) */
  op?: El;
  /** the Stretchy toggle applies (the operator next to the caret can stretch) */
  stretchy?: boolean;
  /** a selection: the nudge buttons come first */
  nudge?: boolean;
  /** stacks: the caret sits inside a number of several digits */
  inNumber?: boolean;
  /** stacks: the current row has a carries row above it (carry-location buttons enabled) */
  carries?: boolean;
  /** multiline: the lines are aligned at their relation symbols (a table of three columns) */
  relation?: boolean;
}

function withCarries(core: EditorCore, loc: Located): Located {
  const info = stackInfo(core, loc);
  if (info) loc.carries = info.items[info.cur - 1]?.t === 'mscarries';
  return loc;
}

export function locate(core: EditorCore): Located | null {
  const loc = locateRaw(core);
  if (loc && loc.op && stretchDefault(loc.op) !== null) loc.stretchy = true;
  // a selection shows the nudge buttons in front of everything else
  if (loc && core.hasSelection() && loc.kind !== 'structure') loc.nudge = true;
  return loc;
}

function locateRaw(core: EditorCore): Located | null {
  const chain = enclosing(core);
  const isTokEl = (e?: El) => !!e && e.c === undefined;
  const isOpEl = (e?: El) => isTokEl(e) && e!.t === 'mo' && (e!.x ?? '') !== '';
  const isNlEl = (e?: El) => !!e && e.t === 'mspace' && getAttr(e, 'linebreak') === 'newline';
  // a non-empty selection: its controls are the nudges and the controls of the structure it lies in; the spacing controls
  // come when the last selected item or the item after the selection is an operator (or a line break)
  let sel: { row: Row; from: number; to: number; els: El[]; spacing: boolean; op?: El } | null = null;
  if (core.hasSelection()) {
    const s = core.sel!;
    const srow = tryRowAt(core.row, s.path);
    if (srow) {
      const from = Math.min(s.from, s.to);
      const to = Math.max(s.from, s.to);
      const els = srow.slice(from, to);
      if (els.length) {
        const last = els[els.length - 1];
        const next = srow[to];
        const lastOp = isOpEl(last) || isNlEl(last);
        const nextOp = isOpEl(next) || isNlEl(next);
        sel = { row: srow, from, to, els, spacing: lastOp || nextOp, op: isOpEl(last) ? last : isOpEl(next) ? next : undefined };
      }
    }
  }
  // the caret in the text slot of a big operator: the operator's own spacing controls
  const slotOp = !sel && chain.length > 0 && chain[0].el.t === 'mo' && chain[0].el.c !== undefined ? chain[0] : null;
  // extension (not in the reference): the vertical alignment of a structure with inputs – the one selected, or the
  // innermost one the caret is in
  if (core.contextExtras && !slotOp) {
    if (sel && sel.els.length === 1 && sel.els[0].c !== undefined && VALIGN_TAGS.has(sel.els[0].t)) {
      return { kind: 'structure', fence: { row: sel.row, index: sel.from, el: sel.els[0], path: core.sel!.path as Step[], slot: 0 } };
    }
    // next to an operator, a line break or a space the reference's own controls (spacing, width…) are the context
    const here = core.currentRow();
    const at = [here[core.caret.index - 1], here[core.caret.index]];
    const refContext = at.some(
      (e) =>
        isOpEl(e) ||
        isNlEl(e) ||
        (!!e && e.t === 'mspace') ||
        (!!e && (e.t === 'msub' || e.t === 'msup' || e.t === 'msubsup') && e.c![0].length === 1 && isOpEl(e.c![0][0])),
    );
    if (!sel && !refContext) {
      // the innermost structure of the caret: wrappers of an input (the argument placeholder, a big operator's text slot)
      // are looked through; a fence / table / stack keeps its own controls
      const WRAP = new Set(['maction', 'mrow', 'mstyle', 'mpadded', 'mo']);
      let last: Hit | null = null;
      for (const h of chain) {
        if (VALIGN_TAGS.has(h.el.t) && h.el.c !== undefined) return { kind: 'structure', fence: h };
        if (!WRAP.has(h.el.t)) {
          last = null;
          break;
        }
        last = h;
      }
      // an input of the formula's own row (the integrand after an integral): the structure just before it
      if (last) {
        const nb = [last.row[last.index - 1], last.row[last.index + 1]];
        const k = nb.findIndex((e) => !!e && e.c !== undefined && VALIGN_TAGS.has(e.t));
        if (k >= 0) {
          const i = k === 0 ? last.index - 1 : last.index + 1;
          return { kind: 'structure', fence: { row: last.row, index: i, el: last.row[i], path: last.path, slot: 0 } };
        }
      }
    }
  }
  if (slotOp) return { kind: 'operator', tokens: [{ row: slotOp.row, index: slotOp.index }], op: slotOp.el };
  const row = core.currentRow();
  const idx = core.caret.index;
  const left = row[idx - 1];
  const right = row[idx];
  const isOp = isOpEl;
  const isNl = isNlEl;
  // a script structure whose base is an operator (an integral with limits): the caret in front of it is next to that operator
  const isOpScript = (e?: El) => !!e && (e.t === 'msub' || e.t === 'msup' || e.t === 'msubsup') && e.c![0].length === 1 && isOp(e.c![0][0]);
  /** the operator token the spacing / stretchy controls refer to */
  const opNextTo = (): El | undefined => (sel ? sel.op : isOp(left) ? left : isOp(right) ? right : isOpScript(right) ? right!.c![0][0] : undefined);
  const spacingHere = sel ? sel.spacing : isOp(left) || isOp(right) || isOpScript(right);
  const multilineCtx = (): Located | null => {
    const lines = core.row;
    const outer = chain;
    if (lines.some((e) => isNl(e)) && outer.length === 0) {
      return { kind: 'multiline', spacing: sel ? sel.spacing : isNl(left) || isNl(right) || spacingHere, op: opNextTo() };
    }
    return null;
  };
  // lines aligned at their relation symbols are kept in a three column table
  if (isRelationTable(core.row)) return { kind: 'multiline', spacing: sel ? sel.spacing : isOp(left) || isOp(right), relation: true, op: opNextTo() };
  for (const h of chain) {
    const t = tableCtx(h, chain);
    if (t) {
      // a range of cells: the controls show the state of its first cell
      const cs = core.sel?.cells;
      const hit = cs && cs.slots.length && h.el === rowAt(core.row, core.sel!.path)[core.sel!.from] ? { ...h, slot: cs.slots[0] } : h;
      return { kind: t.kind, table: hit, fence: t.fence, spacing: spacingHere, op: opNextTo() };
    }
    // a long division: its quotient row and the rows of its group are stack contexts, the divisor is an ordinary row
    if (h.el.t === 'mlongdiv') {
      if (h.slot === 0) continue;
      return withCarries(core, { kind: 'stack', hit: h, inNumber: false, carries: false });
    }
    if (h.el.t === 'mstack' || h.el.t === 'msrow' || h.el.t === 'msgroup') {
      const st = chain.find((c) => c.el.t === 'mstack' || c.el.t === 'mlongdiv');
      if (st) {
        // the digits of a long division written in a group behave like a stack
        if (st.el.t === 'mlongdiv') return withCarries(core, { kind: 'stack', hit: st, inNumber: false, carries: false });
        const digit = (e?: El) => !!e && e.t === 'mn';
        // only a caret between two digits of one number can merge / unmerge its separators
        const between = !sel && digit(left) && digit(right) && left!.g === right!.g;
        return withCarries(core, { kind: 'stack', hit: st, inNumber: between });
      }
    }
    if (h.el.t === 'mfenced') return { kind: 'fence_in', fence: h, spacing: spacingHere, op: opNextTo() };
  }
  if (sel) {
    const { els, from } = sel;
    // a whole number with separators (mn mo mn …) is selected: merge / unmerge
    if (els.length >= 3 && els[0].t === 'mn' && els[els.length - 1].t === 'mn' && els.some((e) => e.t === 'mo') && els.every((e) => e.c === undefined && (e.t === 'mn' || (e.t === 'mo' && /^[.,]$/.test(e.x ?? ''))))) {
      return { kind: 'numsep_sel', tokens: els.map((_, k) => ({ row: sel!.row, index: from + k })), spacing: sel.spacing, op: sel.op };
    }
    // the last selected item or the one after the selection is a space: its width / height / depth can be set
    const isSp = (e?: El) => !!e && e.t === 'mspace' && getAttr(e, 'linebreak') !== 'newline';
    const spaceEl = isSp(els[els.length - 1]) ? els[els.length - 1] : isSp(sel.row[sel.to]) ? sel.row[sel.to] : undefined;
    if (spaceEl) return { kind: 'mspace', el: spaceEl };
    const ml = multilineCtx();
    if (ml) return ml;
    return { kind: 'symbol_sel', tokens: els.map((_, k) => ({ row: sel!.row, index: from + k })), spacing: sel.spacing, op: sel.op };
  }
  for (const e of [left, right]) {
    if (e && e.t === 'mspace' && getAttr(e, 'linebreak') !== 'newline') return { kind: 'mspace', el: e };
  }
  // caret between two characters of one number: merge / unmerge its separators
  if (left && right && left.t === 'mn' && right.t === 'mn' && left.c === undefined && right.c === undefined && left.g !== undefined && left.g === right.g) return { kind: 'numsep', tokens: [{ row, index: idx }] };
  // lines of a multi-line formula: their alignment controls come with the spacing of the operator or line break next to the caret
  const ml = multilineCtx();
  if (ml) return ml;
  if (isOp(left) || isOp(right) || isOpScript(right)) return { kind: 'operator', tokens: [{ row, index: isOp(left) ? idx - 1 : idx }], op: opNextTo() };
  // extension: the caret stands right behind (or in front of) a structure with inputs – the one just inserted, say
  if (core.contextExtras) {
    const nb = [left, right].findIndex((e) => !!e && e.c !== undefined && VALIGN_TAGS.has(e.t));
    if (nb >= 0) {
      const i = nb === 0 ? idx - 1 : idx;
      return { kind: 'structure', fence: { row, index: i, el: row[i], path: core.caret.path as Step[], slot: 0 } };
    }
  }
  return null;
}

/* ------------------------------------------------------------ controls */

const TABLE_CONTROLS = (withFence: boolean): CtxControl[] => {
  let g = 0;
  const L: CtxControl[] = [];
  const add = (id: string, title: string, kind: CtxControl['kind'], icon: string, options?: CtxControl['options']) => L.push({ id, title, kind, icon, options, group: g });
  if (withFence) {
    add('setOpenBracket', 'setOpenBracket', 'select', 'sel_open', sel(BRACKETS));
    add('setCloseBracket', 'setCloseBracket', 'select', 'sel_close', sel(BRACKETS));
    add('setSeparator', 'setSeparator', 'select', 'sel_sep', sel(SEPS));
    add('valign_baseline', 'Baseline', 'toggle', 'valign_baseline');
    add('valign_middle', 'Middle', 'button', 'valign_middle');
    add('valign_middle_baseline', 'Middle-baseline', 'button', 'valign_middle_baseline');
    g++;
  }
  add('align_axis', 'Align with axis', 'toggle', 'tbl_align_axis');
  add('align_top', 'Align with top', 'button', 'tbl_align_top');
  add('align_baseline', 'Align with baseline', 'button', 'tbl_align_baseline');
  add('align_center', 'Align with center', 'button', 'tbl_align_center');
  add('align_row', 'Align to row', 'button', 'tbl_align_row');
  add('align_bottom', 'Align with bottom', 'button', 'tbl_align_bottom');
  g++;
  add('row_below', 'Insert row below', 'button', 'row_below');
  add('row_above', 'Insert row above', 'button', 'row_above');
  add('col_right', 'Insert column at right', 'button', 'col_right');
  add('col_left', 'Insert column at left', 'button', 'col_left');
  add('row_remove', 'Remove row', 'button', 'row_remove');
  add('col_remove', 'Remove column', 'button', 'col_remove');
  g++;
  add('frame_insert', 'Insert frame', 'button', 'frame_insert');
  add('frame_remove', 'Remove frame', 'button', 'frame_remove');
  add('lines_solid', 'Activate solid lines', 'toggle', 'lines_solid');
  add('line_below', 'Insert line below', 'button', 'line_below');
  add('line_right', 'Insert right line', 'button', 'line_right');
  add('lines_dash', 'Activate dash lines', 'button', 'lines_dash');
  add('line_below_remove', 'Remove line below', 'button', 'line_below_remove');
  add('line_right_remove', 'Remove right line', 'button', 'line_right_remove');
  g++;
  add('colalign_left', 'Align left', 'toggle', 'colalign_left');
  add('colalign_center', 'Align center', 'button', 'colalign_center');
  add('colalign_right', 'Align right', 'button', 'colalign_right');
  add('colalign_decimal', 'Decimal align', 'button', 'colalign_decimal');
  add('decimal_symbol', 'Decimal align symbol', 'select', 'sel_decimal', sel(DEC_SEPS));
  add('rowalign_top', 'Align rows to top', 'button', 'rowalign_top');
  add('rowalign_center', 'Align rows to center', 'button', 'rowalign_center');
  add('rowalign_bottom', 'Align rows to bottom', 'button', 'rowalign_bottom');
  add('colalign_relation', 'Relation align', 'button', 'colalign_relation');
  add('rowalign_baseline', 'Align rows to baseline', 'toggle', 'rowalign_baseline');
  add('rowalign_axis', 'Align rows to axis', 'button', 'rowalign_axis');
  g++;
  add('equal_rows', 'Force equal row heights', 'button', 'equal_rows');
  add('equal_cols', 'Force equal column widths', 'button', 'equal_cols');
  g++;
  add('colspacing', 'Column spacing at right', 'length', 'colspacing');
  add('framespacing_h', 'Horizontal frame spacing', 'length', 'framespacing_h');
  add('rowspacing', 'Row spacing below', 'length', 'rowspacing');
  add('framespacing_v', 'Vertical frame spacing', 'length', 'framespacing_v');
  return L;
};

function lenControls(ids: [string, string][], icon: string, group = 0): CtxControl[] {
  return ids.map(([id, title]) => ({ id, title, kind: 'length' as const, icon: icon + '_' + id, group }));
}

const SPACING = (group: number, ids: [string, string][] = [['left_spacing', 'Left spacing'], ['right_spacing', 'Right spacing']], icon = 'sp'): CtxControl[] => lenControls(ids, icon, group);
const STRETCHY_CTL = (group: number): CtxControl => ({ id: 'stretchy', title: 'Stretchy', kind: 'toggle', icon: 'stretchy', group });

/** Left / Right spacing (and Stretchy) of the operator next to the caret: they come first for tables and lines, last for fences */
function operatorControls(loc: Located, group: number): CtxControl[] {
  if (!loc.spacing) return [];
  return [...SPACING(group), ...(loc.stretchy ? [STRETCHY_CTL(group)] : [])];
}

export function controlsFor(loc: Located): CtxControl[] {
  const own = ownControls(loc);
  return loc.nudge ? [...NUDGES(), ...own] : own;
}

function ownControls(loc: Located): CtxControl[] {
  const withSpacing = (all: CtxControl[]): CtxControl[] => {
    const sp = operatorControls(loc, 0);
    return sp.length ? [...sp, ...all.map((c) => ({ ...c, group: c.group + 1 }))] : all;
  };
  switch (loc.kind) {
    case 'matrix':
    case 'piecewise': {
      // the fence controls come first, then the operator's, then the table's
      const all = TABLE_CONTROLS(true);
      const sp = operatorControls(loc, 1);
      if (!sp.length) return all;
      const fence = all.filter((c) => c.group === 0);
      return [...fence, ...sp, ...all.filter((c) => c.group > 0).map((c) => ({ ...c, group: c.group + 1 }))];
    }
    case 'table':
    case 'aligned':
      return withSpacing(TABLE_CONTROLS(false));
    case 'fence_in':
      return [
        { id: 'setOpenBracket', title: 'setOpenBracket', kind: 'select', icon: 'sel_open', options: sel(BRACKETS), group: 0 },
        { id: 'setCloseBracket', title: 'setCloseBracket', kind: 'select', icon: 'sel_close', options: sel(BRACKETS), group: 0 },
        { id: 'setSeparator', title: 'setSeparator', kind: 'select', icon: 'sel_sep', options: sel(SEPS), group: 0 },
        { id: 'valign_baseline', title: 'Baseline', kind: 'toggle', icon: 'valign_baseline', group: 1 },
        { id: 'valign_middle', title: 'Middle', kind: 'button', icon: 'valign_middle', group: 1 },
        { id: 'valign_middle_baseline', title: 'Middle-baseline', kind: 'button', icon: 'valign_middle_baseline', group: 1 },
        ...operatorControls(loc, 2),
      ];
    case 'structure':
      return [
        { id: 'valign_baseline', title: 'Baseline', kind: 'toggle', icon: 'valign_baseline', group: 0 },
        { id: 'valign_middle', title: 'Middle', kind: 'button', icon: 'valign_middle', group: 0 },
        { id: 'valign_middle_baseline', title: 'Middle-baseline', kind: 'button', icon: 'valign_middle_baseline', group: 0 },
      ];
    case 'operator':
      return [...SPACING(0), ...(loc.stretchy ? [STRETCHY_CTL(0)] : [])];
    case 'sum':
      return operatorControls({ ...loc, spacing: !!loc.spacing }, 0);
    case 'longdiv':
    case 'multiline':
      return [
        ...(loc.spacing
          ? ([
              { id: 'left_spacing', title: 'Left spacing', kind: 'length', icon: 'ml_left', group: 0 },
              { id: 'right_spacing', title: 'Right spacing', kind: 'length', icon: 'ml_right', group: 0 },
              ...(loc.stretchy ? [STRETCHY_CTL(0)] : []),
            ] as CtxControl[])
          : []),
        { id: 'ml_left', title: 'Align left', kind: 'toggle', icon: 'ml_align_left', group: 1 },
        { id: 'ml_relation', title: 'Relation align', kind: 'button', icon: 'ml_relation', group: 1 },
        { id: 'ml_center', title: 'Align center', kind: 'button', icon: 'ml_align_center', group: 1 },
        { id: 'ml_right', title: 'Align right', kind: 'button', icon: 'ml_align_right', group: 1 },
      ];
    case 'stack':
      return [
        ...(loc.inNumber ? ([{ id: 'numsep_merge', title: 'Merge/unmerge separators in <mn>', kind: 'button', icon: 'numsep_merge', group: 0 }] as CtxControl[]) : []),
        { id: 'st_line', title: 'Insert line', kind: 'button', icon: 'st_line', group: 0 },
        { id: 'st_join', title: 'Join the selected digits in a single column', kind: 'button', icon: 'st_join', group: 0 },
        { id: 'st_strike', title: 'Up diagonal strike', kind: 'button', icon: 'st_strike', group: 0 },
        { id: 'st_prepend', title: 'Prepend row', kind: 'button', icon: 'st_prepend', group: 1 },
        { id: 'st_append', title: 'Append row', kind: 'button', icon: 'st_append', group: 1 },
        ...(['nw', 'n', 'ne', 'w'] as const).map((l) => ({ id: 'st_carry_' + l, title: `Set carries location at ${LOC_NAMES[l]}`, kind: 'button' as const, icon: 'carry_' + l, group: 2, disabled: !loc.carries })),
        { id: 'st_carries', title: 'Insert carries in this row', kind: 'button', icon: 'carries_insert', group: 2 },
        ...(['e', 'sw', 's', 'se'] as const).map((l) => ({ id: 'st_carry_' + l, title: `Set carries location at ${LOC_NAMES[l]}`, kind: 'button' as const, icon: 'carry_' + l, group: 2, disabled: !loc.carries })),
        { id: 'st_left', title: 'Move to left', kind: 'button', icon: 'st_left', group: 3 },
        { id: 'st_right', title: 'Move to right', kind: 'button', icon: 'st_right', group: 3 },
        { id: 'st_spacing', title: 'Spacing between digits', kind: 'select', icon: 'sel_spacing', options: STACK_SPACING.map((v) => ({ value: v, label: v === 'medium' ? '— Digit spacing —' : v })), group: 4 },
      ];
    case 'mspace':
      return [
        { id: 'sp_width', title: 'Space width', kind: 'length', icon: 'sp_width', group: 0 },
        { id: 'sp_height', title: 'Space height', kind: 'length', icon: 'sp_height', group: 0 },
        { id: 'sp_depth', title: 'Space depth', kind: 'length', icon: 'sp_depth', group: 0 },
      ];
    case 'symbol_sel':
      return operatorControls(loc, 1);
    case 'numsep_sel':
      return [{ id: 'numsep_merge', title: 'Merge/unmerge separators in <mn>', kind: 'button', icon: 'numsep_merge', group: 1 }, ...operatorControls(loc, 2)];
    case 'numsep':
      return [{ id: 'numsep_merge', title: 'Merge/unmerge separators in <mn>', kind: 'button', icon: 'numsep_merge', group: 0 }];
  }
}

const LOC_NAMES: Record<string, string> = { nw: 'north-west', n: 'north', ne: 'north-east', w: 'west', e: 'east', sw: 'south-west', s: 'south', se: 'south-east' };

function NUDGES(): CtxControl[] {
  return [
    { id: 'nudge_up', title: 'Nudge up', kind: 'button', icon: 'nudge_up', group: 0 },
    { id: 'nudge_right', title: 'Nudge right', kind: 'button', icon: 'nudge_right', group: 0 },
    { id: 'nudge_left', title: 'Nudge left', kind: 'button', icon: 'nudge_left', group: 0 },
    { id: 'nudge_down', title: 'Nudge down', kind: 'button', icon: 'nudge_down', group: 0 },
  ];
}

export function contextState(core: EditorCore): CtxState | null {
  const loc = locate(core);
  if (!loc) return null;
  return { kind: loc.kind, controls: controlsFor(loc), layout: ctxLayoutKey(loc) };
}

/* -------------------------------------------------------------- state */

export interface CtxValue {
  toggled?: boolean;
  value?: string;
}

function tableOf(loc: Located): El | null {
  return loc.table ? loc.table.el : null;
}

function cellPos(loc: Located): { r: number; c: number; rows: number; cols: number } | null {
  const t = tableOf(loc);
  if (!t || !loc.table) return null;
  const cols = t.cols ?? 1;
  const rows = Math.ceil(t.c!.length / cols);
  const s = loc.table.slot;
  return { r: Math.floor(s / cols), c: s % cols, rows, cols };
}

function list(el: El, name: string, n: number, def: string): string[] {
  const v = (getAttr(el, name) ?? '').split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(v[i] ?? v[v.length - 1] ?? def);
  return out;
}

export function ctxValue(core: EditorCore, loc: Located, id: string): CtxValue {
  const t = tableOf(loc);
  const f = loc.fence?.el;
  const pos = cellPos(loc);
  switch (id) {
    case 'setOpenBracket':
      return { value: f ? displayBracket(getAttr(f, 'open') ?? '(') : '(' };
    case 'setCloseBracket':
      return { value: f ? displayBracket(getAttr(f, 'close') ?? ')') : ')' };
    case 'setSeparator':
      {
      const sp = f ? getAttr(f, 'separators') ?? ',' : ',';
      return { value: sp === ' ' ? '\u00A0' : sp };
    }
    case 'valign_baseline':
      return { toggled: !f || !getAttr(f, 'wrs:valign') };
    case 'valign_middle':
      return { toggled: getAttr(f ?? ({ a: [] } as any), 'wrs:valign') === 'middle' };
    case 'valign_middle_baseline':
      return { toggled: getAttr(f ?? ({ a: [] } as any), 'wrs:valign') === 'middle-baseline' };
    case 'align_axis':
      return { toggled: !!t && (!getAttr(t, 'align') || /^axis\b/.test(getAttr(t, 'align')!)) };
    case 'align_top':
    case 'align_baseline':
    case 'align_center':
    case 'align_bottom':
      return { toggled: !!t && getAttr(t, 'align') === id.slice(6) };
    case 'align_row':
      return { toggled: !!t && getAttr(t, 'align') === 'axis 2' };
    case 'lines_solid':
      return { toggled: core.ctxDash !== true };
    case 'lines_dash':
      return { toggled: core.ctxDash === true };
    case 'colalign_left':
    case 'colalign_center':
    case 'colalign_right': {
      if (!t || !pos) return { toggled: false };
      const a = list(t, 'columnalign', pos.cols, 'center')[pos.c];
      // a decimal / relation alignment of the column replaces the plain one
      const w = list(t, 'wrs:columnalign', pos.cols, '')[pos.c];
      return { toggled: a === id.slice(9) && w !== 'decimal' && w !== 'relation' };
    }
    case 'colalign_decimal':
    case 'colalign_relation': {
      if (!t || !pos) return { toggled: false };
      const w = list(t, 'wrs:columnalign', pos.cols, '')[pos.c];
      return { toggled: w === id.slice(9) };
    }
    case 'rowalign_top':
    case 'rowalign_center':
    case 'rowalign_bottom':
    case 'rowalign_axis': {
      if (!t || !pos) return { toggled: false };
      const a = (getAttr(t, 'rowalign') ?? '').split(/\s+/).filter(Boolean);
      return { toggled: a[pos.r] === id.slice(9) };
    }
    case 'equal_rows':
    case 'equal_cols':
      return { toggled: !!t && getAttr(t, id === 'equal_rows' ? 'equalrows' : 'equalcolumns') === 'true' };
    case 'rowalign_baseline': {
      if (!t || !pos) return { toggled: false };
      const a = (getAttr(t, 'rowalign') ?? '').split(/\s+/).filter(Boolean);
      return { toggled: a.length === 0 || a[pos.r] === 'baseline' };
    }
    case 'frame_insert':
      return { toggled: false };
    case 'decimal_symbol': {
      if (!t || !pos) return { value: 'dot' };
      return { value: list(t, 'wrs:decimalseparators', pos.cols, 'dot')[pos.c] };
    }
    case 'st_spacing': {
      const st = loc.hit?.el;
      return { value: st ? getAttr(st, 'charspacing') ?? 'medium' : 'medium' };
    }
    case 'ml_relation':
      return { toggled: !!loc.relation };
    case 'ml_left':
    case 'ml_center':
    case 'ml_right': {
      if (loc.relation) return { toggled: false };
      // lines are left aligned unless the document has an indentalign style
      const al = docStyleOf(core.attrs).indentalign;
      return { toggled: (al ?? 'left') === id.slice(3) };
    }
    case 'left_spacing':
    case 'right_spacing': {
      const tk = loc.tokens?.[0];
      const e = loc.op ?? (tk ? tk.row[tk.index] : null);
      return { value: e ? getAttr(e, id === 'left_spacing' ? 'lspace' : 'rspace') ?? '' : '' };
    }
    case 'stretchy': {
      const def = stretchDefault(loc.op);
      const cur = loc.op ? getAttr(loc.op, 'stretchy') : undefined;
      return { toggled: cur === undefined ? def === true : cur === 'true' };
    }
    case 'sp_width':
    case 'sp_height':
    case 'sp_depth':
      return { value: loc.el ? getAttr(loc.el, id.slice(3)) ?? '' : '' };
    // the length fields show the table's current (or default) spacing
    case 'colspacing':
      return { value: (t && pos && (getAttr(t, 'columnspacing') ?? '').split(/\s+/).filter(Boolean)[pos.c]) || '0.4em' };
    case 'rowspacing':
      return { value: (t && pos && (getAttr(t, 'rowspacing') ?? '').split(/\s+/).filter(Boolean)[pos.r]) || '0.25em' };
    case 'framespacing_h':
      return { value: (t && (getAttr(t, 'framespacing') ?? '').split(/\s+/).filter(Boolean)[0]) || '0.4em' };
    case 'framespacing_v':
      return { value: (t && (getAttr(t, 'framespacing') ?? '').split(/\s+/).filter(Boolean)[1]) || '0.5ex' };
    default: {
      if (id.startsWith('st_carry_')) {
        // the location of the carries row above the current row of a stack (north unless given)
        const info = stackInfo(core, loc);
        const e = info ? info.items[info.cur - 1] : undefined;
        // without a carries row the buttons are disabled; the last location used in this session shows as the current one
        const where = e && e.t === 'mscarries' ? getAttr(e, 'location') ?? 'n' : core.ctxCarry;
        return { toggled: where === id.slice(9) };
      }
      return {};
    }
  }
}


// the reference lists the angle brackets and the double bar by their Unicode characters but writes < > ||
function displayBracket(v: string): string {
  return v === '<' ? '⟨' : v === '>' ? '⟩' : v === '||' ? '‖' : v;
}

/* -------------------------------------------------------------- apply */

const TABLE_ORDER = ['align', 'rowalign', 'columnspacing', 'columnalign', 'wrs:columnalign', 'wrs:decimalseparators', 'frame', 'rowlines', 'columnlines', 'equalrows', 'equalcolumns', 'rowspacing', 'framespacing'];
const FENCE_ORDER = ['open', 'close', 'separators', 'wrs:valign'];

function setOrdered(e: El, name: string, v: string | null, order: string[]): void {
  setAttr(e, name, v, order);
}

/** parse a length: "2px", "0.5em", "1.5ex", "2 px", bare numbers; returns canonical or null */
/** the text of a length field → the attribute value the reference writes: optional minus, decimal point or comma, unit
 *  px / em / ex (any case) or none; ".5em" is written "0.5em", "1,5 em" "1.5em"; anything else (cm, %, +1em, words) is rejected */
export function parseLength(raw: string): string | null {
  const m = /^(-)?(\d+(?:[.,]\d+)?|[.,]\d+)\s*(px|em|ex)?$/i.exec(raw.trim());
  if (!m) return null;
  let num = m[2].replace(',', '.');
  if (num.startsWith('.')) num = '0' + num;
  return (m[1] ?? '') + num + (m[3] ? m[3].toLowerCase() : '');
}

/** whatever is changed on a fence, the reference writes both brackets in its own spelling (angle brackets as < >, ‖ as ||) */
function normFence(f: El): void {
  for (const side of ['open', 'close'] as const) {
    const cur = getAttr(f, side);
    if (cur !== undefined && cur !== '' && bracketAttr(cur) !== cur) setOrdered(f, side, bracketAttr(cur), FENCE_ORDER);
  }
}

function bracketAttr(v: string): string {
  return v === '⟨' ? '<' : v === '⟩' ? '>' : v === '‖' ? '||' : v;
}

function insertCols(t: El, at: number, n: number, dupAlign: false | 'left' | 'right' = false): void {
  const cols = t.cols ?? 1;
  for (const name of ['columnalign', 'wrs:columnalign']) {
    const v = (getAttr(t, name) ?? '').split(/\s+/).filter(Boolean);
    if (v.length && dupAlign === 'left') {
      const arr = Array.from({ length: cols }, (_, i) => v[i] ?? v[v.length - 1]);
      arr.splice(at, 0, arr[Math.max(at - 1, 0)]);
      setAttr(t, name, arr.join(' '), TABLE_ORDER);
    } else if (v.length && dupAlign === 'right' && at < v.length) {
      // a column added inside the listed ones repeats its left neighbour's entry; at the end the list is left alone
      v.splice(at, 0, v[at - 1]);
      setAttr(t, name, v.join(' '), TABLE_ORDER);
    }
  }
  const rows = Math.ceil(t.c!.length / cols);
  const next: Row[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (c === at) next.push([]);
      if (c < cols) next.push(t.c![r * cols + c]);
    }
  }
  t.c = next;
  t.cols = cols + n;
}

function removeCol(t: El, at: number): void {
  const cols = t.cols ?? 1;
  if (cols <= 1) return;
  const rows = Math.ceil(t.c!.length / cols);
  for (const name of ['columnalign', 'wrs:columnalign', 'wrs:decimalseparators']) {
    const v = (getAttr(t, name) ?? '').split(/\s+/).filter(Boolean);
    if (v.length) {
      const arr = Array.from({ length: cols }, (_, i) => v[i] ?? v[v.length - 1]);
      arr.splice(at, 1);
      setAttr(t, name, arr.join(' '), TABLE_ORDER);
    }
  }
  const next: Row[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (c !== at) next.push(t.c![r * cols + c]);
  t.c = next;
  t.cols = cols - 1;
}

/** Apply a contextual control. Returns true when the document changed. */
export function applyContext(core: EditorCore, id: string, value?: string): boolean {
  const loc = locate(core);
  if (!loc) return false;
  const before = core.getMathML();
  const t = tableOf(loc);
  const f = loc.fence?.el;
  const pos = cellPos(loc);
  const snap = () => (core as any).checkpointPublic?.();
  const withUndo = (fn: () => void) => {
    snap();
    fn();
  };
  // after rows / columns came or went the caret stays in its cell (or the nearest one)
  const keepCell = (r: number, c: number, cols: number) => {
    const cp = core.caret.path;
    if (!cp.length || !loc.table) return;
    const last = cp[cp.length - 1];
    const nt = loc.table.el;
    const slot = Math.min(r * cols + c, nt.c!.length - 1);
    core.caret = { path: [...cp.slice(0, -1), [last[0], Math.max(0, slot)]], index: Math.min(core.caret.index, (nt.c![Math.max(0, slot)] ?? []).length) };
  };
  const fenceAttr = (name: 'open' | 'close' | 'separators', v: string) => {
    if (!f) return;
    withUndo(() => {
      const def = name === 'open' ? '(' : name === 'close' ? ')' : ',';
      setOrdered(f, name, v === def && name !== 'separators' ? null : v === def ? null : bracketAttr(v), FENCE_ORDER);
      if (name === 'separators' && v === ',') setOrdered(f, name, null, FENCE_ORDER);
      if (name !== 'separators' && v === '') setOrdered(f, name, '', FENCE_ORDER);
      normFence(f);
    });
  };
  switch (id) {
    case 'setOpenBracket':
      fenceAttr('open', value ?? '');
      break;
    case 'setCloseBracket':
      fenceAttr('close', value ?? '');
      break;
    case 'setSeparator':
      fenceAttr('separators', value ?? ',');
      break;
    case 'valign_baseline':
    case 'valign_middle':
    case 'valign_middle_baseline':
      if (f) {
        withUndo(() => {
          setOrdered(f, 'wrs:valign', id === 'valign_baseline' ? null : id === 'valign_middle' ? 'middle' : 'middle-baseline', FENCE_ORDER);
          if (f.t === 'mfenced') normFence(f);
        });
      }
      break;
    case 'align_axis':
      if (t) withUndo(() => setOrdered(t, 'align', null, TABLE_ORDER));
      break;
    case 'align_top':
    case 'align_baseline':
    case 'align_center':
    case 'align_bottom':
      if (t) withUndo(() => setOrdered(t, 'align', id.slice(6), TABLE_ORDER));
      break;
    case 'align_row':
      // the axis of the row the caret is in
      if (t) withUndo(() => setOrdered(t, 'align', `axis ${(pos?.r ?? 0) + 1}`, TABLE_ORDER));
      break;
    case 'row_below':
    case 'row_above':
      if (t && pos) {
        withUndo(() => {
          const at = (id === 'row_below' ? pos.r + 1 : pos.r) * pos.cols;
          t.c!.splice(at, 0, ...Array.from({ length: pos.cols }, () => [] as Row));
        });
        keepCell(pos.r, pos.c, pos.cols); // inserting before: the caret moves into the new row
      }
      break;
    case 'col_right':
    case 'col_left':
      if (t && pos) {
        withUndo(() => insertCols(t, id === 'col_right' ? pos.c + 1 : pos.c, 1, id === 'col_left' ? 'left' : 'right'));
        keepCell(pos.r, pos.c, pos.cols + 1); // inserting at the left: the caret is in the new column
      }
      break;
    case 'row_remove':
      if (t && pos && pos.rows > 1) {
        withUndo(() => t.c!.splice(pos.r * pos.cols, pos.cols));
        keepCell(Math.min(pos.r, pos.rows - 2), pos.c, pos.cols);
      }
      break;
    case 'col_remove':
      if (t && pos && pos.cols > 1) {
        withUndo(() => removeCol(t, pos.c));
        keepCell(pos.r, Math.min(pos.c, pos.cols - 2), pos.cols - 1);
      }
      break;
    case 'frame_insert':
      if (t) withUndo(() => setOrdered(t, 'frame', core.ctxDash ? 'dashed' : 'solid', TABLE_ORDER));
      break;
    case 'frame_remove':
      if (t) withUndo(() => setOrdered(t, 'frame', null, TABLE_ORDER));
      break;
    case 'lines_solid':
      core.ctxDash = false;
      break;
    case 'lines_dash':
      core.ctxDash = true;
      break;
    case 'line_below':
    case 'line_right':
    case 'line_below_remove':
    case 'line_right_remove': {
      if (!t || !pos) break;
      const horizontal = id.startsWith('line_below');
      const name = horizontal ? 'rowlines' : 'columnlines';
      const at = (horizontal ? pos.r : pos.c);
      const cur = (getAttr(t, name) ?? '').split(/\s+/).filter(Boolean);
      // one entry per line up to the one written, and a last 'none' (the reference's list is never shorter than the lines it keeps)
      const arr = Array.from({ length: Math.max(cur.length, at + 2) }, (_, i) => cur[i] ?? 'none');
      const remove = id.endsWith('_remove');
      if (remove && !cur.length) break;
      withUndo(() => {
        arr[at] = remove ? 'none' : core.ctxDash ? 'dashed' : 'solid';
        setOrdered(t, name, arr.every((v) => v === 'none') ? null : arr.join(' '), TABLE_ORDER);
      });
      break;
    }
    case 'colalign_left':
    case 'colalign_center':
    case 'colalign_right':
      if (t && pos) {
        withUndo(() => {
          const arr = list(t, 'columnalign', pos.cols, 'center');
          arr[pos.c] = id.slice(9);
          setOrdered(t, 'columnalign', arr.join(' '), TABLE_ORDER);
        });
      }
      break;
    case 'colalign_decimal':
    case 'colalign_relation':
      if (t && pos) {
        withUndo(() => {
          const arr = list(t, getAttr(t, 'wrs:columnalign') ? 'wrs:columnalign' : 'columnalign', pos.cols, 'center');
          arr[pos.c] = id === 'colalign_decimal' ? 'decimal' : 'relation';
          setOrdered(t, 'columnalign', null, TABLE_ORDER);
          setOrdered(t, 'wrs:columnalign', arr.join(' '), TABLE_ORDER);
        });
      }
      break;
    case 'decimal_symbol':
      if (t && pos) {
        withUndo(() => {
          const arr = list(t, 'wrs:decimalseparators', pos.cols, 'dot');
          arr[pos.c] = value ?? 'dot';
          setOrdered(t, 'wrs:decimalseparators', arr.join(' '), TABLE_ORDER);
          if (!getAttr(t, 'wrs:columnalign')) {
            const ca = list(t, 'columnalign', pos.cols, 'center');
            ca[pos.c] = 'decimal';
            setOrdered(t, 'columnalign', null, TABLE_ORDER);
            setOrdered(t, 'wrs:columnalign', ca.join(' '), TABLE_ORDER);
          }
        });
      }
      break;
    case 'rowalign_top':
    case 'rowalign_center':
    case 'rowalign_bottom':
    case 'rowalign_baseline':
    case 'rowalign_axis':
      if (t && pos) {
        withUndo(() => {
          const cur = (getAttr(t, 'rowalign') ?? '').split(/\s+/).filter(Boolean);
          const arr = Array.from({ length: pos.rows }, (_, i) => cur[i] ?? 'baseline');
          arr[pos.r] = id.slice(9);
          setOrdered(t, 'rowalign', arr.join(' '), TABLE_ORDER);
        });
      }
      break;
    case 'equal_rows':
      if (t) withUndo(() => setOrdered(t, 'equalrows', 'true', TABLE_ORDER));
      break;
    case 'equal_cols':
      if (t) withUndo(() => setOrdered(t, 'equalcolumns', 'true', TABLE_ORDER));
      break;
    case 'colspacing':
    case 'framespacing_h':
    case 'rowspacing':
    case 'framespacing_v': {
      const v = parseLength(value ?? '');
      if (v === null || !t || !pos) return false;
      if (id === 'colspacing') {
        if (pos.c >= pos.cols - 1) break;
        withUndo(() => {
          const cur = (getAttr(t, 'columnspacing') ?? '').split(/\s+/).filter(Boolean);
          const arr = Array.from({ length: pos.cols - 1 }, (_, i) => cur[i] ?? '0.8em');
          arr[pos.c] = v;
          setOrdered(t, 'columnspacing', arr.join(' '), TABLE_ORDER);
        });
      } else if (id === 'rowspacing') {
        if (pos.r >= pos.rows - 1) break;
        withUndo(() => {
          const cur = (getAttr(t, 'rowspacing') ?? '').split(/\s+/).filter(Boolean);
          const arr = Array.from({ length: pos.rows - 1 }, (_, i) => cur[i] ?? '1.0ex');
          arr[pos.r] = v;
          setOrdered(t, 'rowspacing', arr.join(' '), TABLE_ORDER);
        });
      } else {
        withUndo(() => {
          const cur = (getAttr(t, 'framespacing') ?? '0.4em 0.5ex').split(/\s+/);
          if (id === 'framespacing_h') cur[0] = v;
          else cur[1] = v;
          setOrdered(t, 'framespacing', cur.join(' '), TABLE_ORDER);
        });
      }
      break;
    }
    case 'left_spacing':
    case 'right_spacing': {
      const v = parseLength(value ?? '');
      if (v === null) return false;
      let tk = loc.tokens?.[0];
      if (!tk) {
        // inside a table cell or a fence: the operator next to the caret, else the first operator of the row
        const r = core.currentRow();
        const at = core.caret.index;
        const isOp = (x?: El) => !!x && x.t === 'mo' && x.c === undefined;
        const ix = isOp(r[at]) ? at : isOp(r[at - 1]) ? at - 1 : r.findIndex((x) => isOp(x));
        if (ix >= 0) tk = { row: r, index: ix };
      }
      // the operator next to the caret / selection when the context found one
      const e = loc.op ?? (tk ? tk.row[tk.index] : undefined);
      if (!e || (e.c !== undefined && e.t !== 'mo')) break;
      withUndo(() => setAttr(e, id === 'left_spacing' ? 'lspace' : 'rspace', v));
      break;
    }
    case 'stretchy': {
      // the reference writes the opposite of the operator's default and drops the attribute again when it is switched back
      const e = loc.op;
      const def = stretchDefault(e);
      if (!e || def === null) break;
      const cur = getAttr(e, 'stretchy');
      const on = cur === undefined ? def : cur === 'true';
      withUndo(() => setAttr(e, 'stretchy', on === !def ? null : String(!on)));
      break;
    }
    case 'sp_width':
    case 'sp_height':
    case 'sp_depth': {
      const v = parseLength(value ?? '');
      if (v === null || !loc.el) return false;
      // a zero is the default of a space: the reference drops the attribute
      withUndo(() => setAttr(loc.el!, id.slice(3), parseFloat(v) === 0 ? null : v));
      break;
    }
    case 'nudge_up':
      core.nudge('up');
      break;
    case 'nudge_down':
      core.nudge('down');
      break;
    case 'nudge_left':
      core.nudge('left');
      break;
    case 'nudge_right':
      core.nudge('right');
      break;
    case 'numsep_merge':
      withUndo(() => mergeNumSep(core, loc));
      break;
    case 'ml_relation':
      if (!loc.relation) withUndo(() => relationTable(core));
      break;
    case 'ml_left':
    case 'ml_center':
    case 'ml_right': {
      withUndo(() => {
        const a = id.slice(3);
        if (loc.relation) linesFromTable(core);
        wrapRootStyle(core, 'indentalign', a);
      });
      break;
    }
    case 'st_line':
    case 'st_prepend':
    case 'st_append':
    case 'st_strike':
    case 'st_carries':
    case 'st_left':
    case 'st_right':
    case 'st_spacing':
    case 'st_join':
    case 'st_carry_nw':
    case 'st_carry_n':
    case 'st_carry_ne':
    case 'st_carry_w':
    case 'st_carry_e':
    case 'st_carry_sw':
    case 'st_carry_s':
    case 'st_carry_se':
      withUndo(() => stackOp(core, loc, id, value));
      break;
  }
  const changed = core.getMathML() !== before;
  if (changed) core.touch();
  return changed;
}

const RELATIONS = /^[=<>\u2264\u2265\u2260\u2248\u2261\u223c\u2243\u2245\u221d\u226a\u226b\u227a\u227b\u2282\u2283\u2286\u2287\u2208\u220b\u2209\u2192\u2190\u2194\u21d2\u21d0\u21d4]$/;

/** is the whole document one table made by "Relation align" (three columns, no spacing)? */
function isRelationTable(row: Row): boolean {
  if (row.length !== 1 || row[0].t !== 'mtable') return false;
  const t = row[0];
  return t.cols === 3 && getAttr(t, 'columnspacing') === '0px' && getAttr(t, 'columnalign') === 'right center left';
}

/** the lines of the document become the rows of a table: left of the relation, the relation, the rest */
function relationTable(core: EditorCore): void {
  const src = core.row;
  const lines: Row[] = [[]];
  for (const e of src) {
    if (e.t === 'mspace' && getAttr(e, 'linebreak') === 'newline') lines.push([]);
    else lines[lines.length - 1].push(e);
  }
  const cells: Row[] = [];
  for (const ln of lines) {
    const k = ln.findIndex((e) => e.c === undefined && e.t === 'mo' && RELATIONS.test(e.x ?? ''));
    if (k < 0) cells.push([], [], ln);
    else cells.push(ln.slice(0, k), [ln[k]], ln.slice(k + 1));
  }
  const t: El = { t: 'mtable', a: [['columnspacing', '0px'], ['columnalign', 'right center left']], c: cells, cols: 3 };
  // the table has its own alignment: the document's indentalign goes
  core.attrs = core.attrs.filter(([k]) => k !== DOC_STYLE_PREFIX + 'indentalign');
  core.row = [t];
  core.sel = null;
  core.caret = { path: [[0, 2]], index: cells[2].length };
}

/** back from a relation table to plain lines (the caret goes to the end) */
function linesFromTable(core: EditorCore): void {
  const t = core.row[0];
  const out: Row = [];
  const rows = Math.ceil(t.c!.length / 3);
  for (let r = 0; r < rows; r++) {
    if (r > 0) out.push({ t: 'mspace', a: [['linebreak', 'newline']], x: '' });
    for (let c = 0; c < 3; c++) out.push(...(t.c![r * 3 + c] ?? []));
  }
  core.row = out;
  core.sel = null;
  core.caret = { path: [], index: out.length };
}

/** a style of the whole equation (the lines' alignment): written as the wrapping mstyle, kept as a style of the document */
function wrapRootStyle(core: EditorCore, attr: string, v: string): void {
  const key = DOC_STYLE_PREFIX + attr;
  const i = core.attrs.findIndex(([k]) => k === key);
  if (i >= 0) core.attrs[i][1] = v;
  else core.attrs.push([key, v]);
}

function mergeNumSep(core: EditorCore, loc: Located): void {
  const tk = loc.tokens;
  if (!tk || !tk.length) return;
  const row = tk[0].row;
  if (loc.kind === 'numsep_sel') {
    // merge the selected mn / mo / mn … into one number
    let from = tk[0].index;
    let to = from + tk.length;
    // a number the selection only touches is merged whole (the reference takes the digits left of / right of the selection too)
    while (from > 0 && row[from - 1].t === 'mn' && row[from].t === 'mn' && row[from - 1].g !== undefined && row[from - 1].g === row[from].g) from--;
    while (to < row.length && row[to - 1].t === 'mn' && row[to].t === 'mn' && row[to].g !== undefined && row[to].g === row[to - 1].g) to++;
    const g = newGroup();
    for (let k = 0; k < to - from; k++) {
      const e = row[from + k];
      if (e.t === 'mo') {
        e.t = 'mn';
        e.a = [];
      }
      e.g = g;
    }
    core.touch();
    return;
  }
  if (loc.kind === 'numsep') {
    // caret inside a number: split it at its separators ("1,000.25" → 1 , 000 . 25)
    const at = tk[0].index;
    const g0 = row[at - 1].g;
    let s = at - 1;
    let e = at;
    while (s > 0 && row[s - 1].t === 'mn' && row[s - 1].g === g0) s--;
    while (e < row.length && row[e].t === 'mn' && row[e].g === g0) e++;
    if (!row.slice(s, e).some((c) => /^[.,]$/.test(c.x ?? ''))) return;
    let g = newGroup();
    let prevSep = true;
    for (let k = s; k < e; k++) {
      const c = row[k];
      const sep = /^[.,]$/.test(c.x ?? '');
      if (sep) {
        c.t = 'mo';
        c.a = [];
        c.g = newGroup();
        prevSep = true;
      } else {
        if (prevSep) g = newGroup();
        prevSep = false;
        c.g = g;
      }
    }
    core.touch();
  }
}

/* ---------------------------------------------------------------- stacks */

interface StackInfo {
  /** the element that carries the attributes (the stack, or the long division) */
  stack: El;
  items: Row;
  itemsPath: Step[];
  /** index of the row the caret works on */
  cur: number;
  /** long division, caret in the result row: the row and its path (the rows of the group are `items`) */
  result?: { row: Row; path: Step[]; group: El };
}

function samePrefix(a: Step[], b: Step[]): boolean {
  return a.length <= b.length && a.every((s, i) => s[0] === b[i][0] && s[1] === b[i][1]);
}

export function stackInfo(core: EditorCore, loc: Located): StackInfo | null {
  const st = loc.hit;
  if (!st || !st.el.c) return null;
  const cp = core.caret.path;
  if (st.el.t === 'mlongdiv') {
    // the rows of a long division are the items of its group; the result row above it is the first row of the stack
    if (!st.el.c[2]) st.el.c[2] = [];
    if (!st.el.c[2][0] || st.el.c[2][0].t !== 'msgroup') st.el.c[2].unshift({ t: 'msgroup', a: [], c: [[{ t: 'msrow', a: [], c: [[]] }]] });
    const group = st.el.c[2][0];
    const items = group.c![0];
    const itemsPath: Step[] = [...st.path, [st.index, 2], [0, 0]];
    const resultPath: Step[] = [...st.path, [st.index, 1]];
    if (samePrefix(resultPath, cp) && cp.length === resultPath.length) return { stack: st.el, items, itemsPath, cur: 0, result: { row: st.el.c[1], path: resultPath, group } };
    let cur = items.length - 1;
    if (samePrefix(itemsPath, cp)) {
      if (cp.length > itemsPath.length) cur = cp[itemsPath.length][0];
      else cur = Math.max(0, Math.min(items.length - 1, core.caret.index - 1));
    }
    return { stack: st.el, items, itemsPath, cur: Math.max(0, cur) };
  }
  if (st.el.t !== 'mstack') return null;
  const items = st.el.c[0];
  const itemsPath: Step[] = [...st.path, [st.index, 0]];
  let cur = items.length - 1;
  if (samePrefix(itemsPath, cp)) {
    if (cp.length > itemsPath.length) cur = cp[itemsPath.length][0];
    else cur = Math.max(0, Math.min(items.length - 1, core.caret.index - 1));
  }
  return { stack: st.el, items, itemsPath, cur: Math.max(0, cur) };
}

const isPlaceholderEl = (e?: El) => !!e && e.t === 'maction';
const newRow = (): El => ({ t: 'msrow', a: [], c: [[]] });
const noneTok = (): El => ({ t: 'none', a: [], x: '' });
const rowWidth = (e: El): number => {
  if (e.t === 'msrow' || e.t === 'mscarries') return (e.c?.[0] ?? []).length;
  if (e.t === 'msline') return 0;
  return 1;
};

/** the controls with the caret in the result row of a long division (the first row of the stack above its group) */
function resultRowOp(core: EditorCore, info: StackInfo, id: string, value?: string): void {
  const { stack, items } = info;
  const { row, group } = info.result!;
  const idx = Math.min(core.caret.index, row.length);
  const asRow = (r: Row): El => ({ t: 'msrow', a: [], c: [r] });
  const W = Math.max(row.length, ...items.map(rowWidth));
  switch (id) {
    case 'st_line': {
      const line: El = { t: 'msline', a: [], x: '' };
      if (row.length > 0 && row.length < W) setAttr(line, 'length', String(row.length));
      if (idx === 0 && row.length > 0) {
        // in front of the result: the line takes the result's place and the result joins the rows
        const first = row.splice(0, row.length);
        items.unshift(asRow(first));
        row.push(line);
        core.caret = { path: info.itemsPath.concat([[0, 0]]), index: 0 };
      } else {
        // after the result: the first item of the group
        items.unshift(line);
        core.caret = { path: info.result!.path, index: idx };
      }
      break;
    }
    case 'st_prepend': {
      const first = row.splice(0, row.length);
      items.unshift(asRow(first));
      core.caret = { path: info.result!.path, index: 0 };
      break;
    }
    case 'st_append':
      items.unshift(newRow());
      core.caret = { path: info.itemsPath.concat([[0, 0]]), index: 0 };
      break;
    case 'st_carries': {
      core.ctxCarry ??= 'n';
      const k = (getAttr(stack, 'stackalign') ?? 'right') === 'left' ? Math.max(0, idx - 1) : Math.max(0, row.length - idx);
      const first = row.splice(0, row.length);
      items.unshift(asRow(first));
      row.push({ t: 'mscarries', a: [], c: [Array.from({ length: k }, noneTok)] });
      core.caret = { path: info.itemsPath.concat([[0, 0]]), index: Math.min(idx, first.length) };
      break;
    }
    case 'st_spacing':
      setAttr(stack, 'charspacing', value && value !== 'medium' ? value : null, ['charalign', 'charspacing', 'stackalign', 'align']);
      break;
    case 'st_strike': {
      row.splice(idx, 0, { t: 'menclose', a: [['notation', 'updiagonalstrike']], c: [[]] });
      core.caret = { path: info.result!.path, index: idx + 1 };
      break;
    }
    case 'st_left':
    case 'st_right': {
      const alignLeft = (getAttr(stack, 'stackalign') ?? 'right') === 'left';
      // the result row moves against the rows of the group (see stackOp for the row case)
      const padOthers = (id === 'st_right') !== alignLeft;
      if (padOthers) {
        items.forEach((e) => {
          if (e.t === 'msline') {
            if (!e.a.some(([n]) => n === 'length')) setAttr(e, 'length', String(W));
            if (!e.a.some(([n]) => n === 'position')) setAttr(e, 'position', '1');
          } else if (e.t === 'msrow' || e.t === 'mscarries') {
            if (alignLeft) e.c![0].unshift(noneTok());
            else e.c![0].push(noneTok());
          }
        });
      } else if (alignLeft) {
        row.unshift(noneTok());
        core.caret = { path: info.result!.path, index: idx + 1 };
      } else row.push(noneTok());
      break;
    }
  }
  void group;
}

function stackOp(core: EditorCore, loc: Located, id: string, value?: string): void {
  const info = stackInfo(core, loc);
  if (!info) return;
  if (info.result) {
    resultRowOp(core, info, id, value);
    return;
  }
  const { stack, items, itemsPath } = info;
  let cur = info.cur;
  const caretTo = (idx: number) => {
    core.caret = { path: [...itemsPath, [idx, 0]], index: 0 };
  };
  const groupStart = () => (items[cur - 1]?.t === 'mscarries' ? cur - 1 : cur);
  // the caret is inside the row `cur` (not at the gaps of the stack level): its position in the row
  const cp = core.caret.path;
  const inRow = samePrefix(itemsPath, cp) && cp.length === itemsPath.length + 1 && !!items[cur] && (items[cur].t === 'msrow' || items[cur].t === 'mscarries');
  const colIdx = inRow ? core.caret.index : 0;
  const alignLeft = (getAttr(stack, 'stackalign') ?? 'right') === 'left';
  // the caret on a line of the stack level: the line and the end of it the caret is at (a line has two stops)
  let lineK = -1;
  let lineEnd: 'left' | 'right' | null = null;
  if (!inRow && samePrefix(itemsPath, cp) && cp.length === itemsPath.length) {
    const k = core.caret.index;
    if (items[k]?.t === 'msline') {
      lineK = k;
      lineEnd = 'left';
    } else if (items[k - 1]?.t === 'msline') {
      lineK = k - 1;
      lineEnd = 'right';
    }
  }
  if (lineK >= 0) cur = lineK;
  /** number of `none` cells in front of the carry cell put over the digit before column `idx` of a row of `len` cells */
  const carryNones = (len: number, idx: number) => (alignLeft ? Math.max(0, idx - 1) : Math.max(0, len - idx));
  const stackRightAll = () => {
    const width = Math.max(0, ...items.map(rowWidth));
    // a line under a row that ends in an argument placeholder keeps its extent
    const endsInPlaceholder = items.map((e) => isPlaceholderEl(e.c?.[0]?.[(e.c?.[0]?.length ?? 1) - 1]));
    items.forEach((e, k) => {
      if (e.t === 'msline') {
        if (endsInPlaceholder[k - 1]) {
          setAttr(e, 'length', String(width));
          setAttr(e, 'position', '1');
        }
      } else if (e.t === 'msrow' || e.t === 'mscarries') {
        const r = e.c![0];
        if (e.t === 'msrow' && r.length === 0) items[k] = noneTok();
        else r.push(noneTok());
      } else if (e.t !== 'none') {
        items[k] = { t: 'msrow', a: [], c: [[e, noneTok()]] };
      }
    });
  };
  const stackLeftAll = () => {
    const width = Math.max(0, ...items.map(rowWidth));
    let removed = false;
    items.forEach((e, k) => {
      if (e.t === 'msline') {
        if (e.a.some(([n]) => n === 'length' || n === 'position')) removed = true;
        setAttr(e, 'length', null);
        setAttr(e, 'position', null);
      } else if (e.t === 'none') {
        items[k] = newRow();
        removed = true;
      } else if (e.t === 'msrow' || e.t === 'mscarries') {
        const r = e.c![0];
        const last = r[r.length - 1];
        if (last && last.t === 'none' && !isPlaceholderEl(r[r.length - 2])) {
          r.pop();
          removed = true;
        }
      }
    });
    // nothing to pull back: the current line is shortened instead
    const line = items[cur];
    if (!removed && line && line.t === 'msline' && width > 1) {
      setAttr(line, 'length', String(width - 1));
      setAttr(line, 'position', '1');
    }
  };
  switch (id) {
    case 'st_prepend': {
      const at = groupStart();
      items.splice(at, 0, newRow());
      caretTo(at);
      break;
    }
    case 'st_append': {
      items.splice(cur + 1, 0, newRow());
      caretTo(cur + 1);
      break;
    }
    case 'st_line': {
      const e = items[cur];
      // in front of the first character of a row the line goes above the row, anywhere else under it
      // a line of a left aligned stack (long division) is as long as the row it belongs to when that is shorter than the stack
      const newLine = (belongs?: El): El => {
        const l: El = { t: 'msline', a: [], x: '' };
        if (alignLeft && belongs && (belongs.t === 'msrow' || belongs.t === 'mscarries')) {
          const w = rowWidth(belongs);
          const Wd = Math.max(0, ...items.map(rowWidth));
          if (w > 0 && w < Wd) setAttr(l, 'length', String(w));
        }
        return l;
      };
      if (inRow && e.t === 'msrow' && colIdx === 0 && (e.c?.[0] ?? []).length > 0) {
        items.splice(cur, 0, newLine(e));
        core.caret = { path: [...itemsPath, [cur + 1, 0]], index: 0 };
        break;
      }
      if (e && e.t === 'msrow' && (e.c?.[0] ?? []).length === 0) {
        items[cur] = { t: 'msline', a: [], x: '' };
        // the caret is on the line (typing there goes to the row below it)
        core.caret = { path: itemsPath, index: cur + 1 };
      } else items.splice(cur + 1, 0, newLine(inRow ? e : lineK >= 0 ? items[lineK + 1] : e));
      break;
    }
    case 'st_carries': {
      if (items[cur - 1]?.t === 'mscarries') break;
      core.ctxCarry ??= 'n';
      if (items[cur]?.t === 'msline' && items[cur + 1] && (items[cur + 1].t === 'msrow' || items[cur + 1].t === 'mscarries')) {
        // on a line: the carries row goes over the row below it
        const k = carryNones(rowWidth(items[cur + 1]), 0);
        items.splice(cur + 1, 0, { t: 'mscarries', a: [], c: [Array.from({ length: k }, noneTok)] });
        caretTo(cur + 1);
      } else if (items[cur]?.t === 'msline' || !items[cur]) {
        items.splice(cur + 1, 0, { t: 'mscarries', a: [], c: [[]] }, newRow());
        caretTo(cur + 2);
      } else {
        // the carry cell sits over the digit before the caret: the cells in front of it are `none`
        let k = 0;
        if (inRow) {
          const len = rowWidth(items[cur]);
          k = carryNones(len, colIdx);
        }
        items.splice(cur, 0, { t: 'mscarries', a: [], c: [Array.from({ length: k }, noneTok)] });
        caretTo(cur + 1);
      }
      break;
    }
    case 'st_spacing':
      setAttr(stack, 'charspacing', value && value !== 'medium' ? value : null, ['charalign', 'charspacing', 'stackalign', 'align']);
      break;
    case 'st_right':
    case 'st_left':
      if (inRow && items[cur].t === 'msrow') {
        // the row under the caret moves against the other rows of the stack: it is padded itself (right aligned stacks: at its
        // end when moved left) or the others are (left aligned: at their start when moved left); lines keep their place
        const width = Math.max(0, ...items.map(rowWidth));
        const row = items[cur].c![0];
        const padOthers = (id === 'st_right') !== alignLeft;
        if (padOthers) {
          items.forEach((e, k) => {
            if (k === cur) return;
            if (e.t === 'msline') {
              if (!e.a.some(([n]) => n === 'length')) setAttr(e, 'length', String(width));
              if (!e.a.some(([n]) => n === 'position')) setAttr(e, 'position', '1');
            } else if (e.t === 'msrow' || e.t === 'mscarries') {
              const r = e.c![0];
              if (alignLeft) r.unshift(noneTok());
              else if (e.t === 'msrow' && r.length === 0) items[k] = noneTok();
              else r.push(noneTok());
            } else if (e.t !== 'none') {
              items[k] = { t: 'msrow', a: [], c: [alignLeft ? [noneTok(), e] : [e, noneTok()]] };
            }
          });
        } else if (alignLeft) row.unshift(noneTok());
        else row.push(noneTok());
        core.caret = { path: cp, index: Math.min(colIdx + (padOthers || !alignLeft ? 0 : 1), row.length) };
        // the result row of a long division is one of the other rows
        if (padOthers && stack.t === 'mlongdiv' && stack.c![1]) {
          if (alignLeft) stack.c![1].unshift(noneTok());
          else stack.c![1].push(noneTok());
        }
        break;
      }
      if (lineK >= 0 && lineEnd) {
        // a line: moving its left / right end (positions are counted from the edge the rows are aligned at)
        const line = items[lineK];
        const W = Math.max(0, ...items.map(rowWidth));
        const dirLeft = id === 'st_left';
        // near edge = the end next to the alignment edge: the left end of a left aligned stack, the right end of a right aligned one
        const near = (lineEnd === 'left') === alignLeft;
        // moving an end outwards (the left end to the left, the right end to the right) or inwards
        const outward = (lineEnd === 'left') === dirLeft;
        let len = parseInt(getAttr(line, 'length') ?? '0', 10) || W;
        let pos = parseInt(getAttr(line, 'position') ?? '0', 10) || 0;
        if (near && outward && pos === 0) {
          // beyond the alignment edge: every row gets an empty cell there; the other lines stay where they were
          items.forEach((e, k) => {
            if (e.t === 'msrow' || e.t === 'mscarries') {
              if (alignLeft) e.c![0].unshift(noneTok());
              else if (e.t === 'msrow' && e.c![0].length === 0) items[k] = noneTok();
              else e.c![0].push(noneTok());
            } else if (e.t === 'msline' && k !== lineK) {
              if (!e.a.some(([n]) => n === 'length')) setAttr(e, 'length', String(W));
              if (!e.a.some(([n]) => n === 'position')) setAttr(e, 'position', '1');
            }
          });
          if (stack.t === 'mlongdiv' && stack.c![1]) {
            if (alignLeft) stack.c![1].unshift(noneTok());
            else stack.c![1].push(noneTok());
          }
          len += 1;
          if (len >= W + 1) len = 0;
        } else if (near && !outward && pos === 0) {
          // pulls the padding back (or shortens the line when there is none)
          stackLeftAll();
          break;
        } else if (near) {
          if (outward) {
            pos -= 1;
            len += 1;
          } else {
            pos += 1;
            len -= 1;
          }
        } else {
          len += outward ? 1 : -1;
        }
        const Wn = Math.max(0, ...items.map(rowWidth));
        if (len <= 0) len = Wn;
        // a line as long as the stack and not shifted is the default one
        setAttr(line, 'length', pos === 0 && len === Wn ? null : String(len));
        setAttr(line, 'position', pos > 0 ? String(pos) : null);
        break;
      }
      if (id === 'st_left') {
        stackLeftAll();
        break;
      }
      stackRightAll();
      break;
    case 'st_strike': {
      if (core.hasSelection() && samePrefix(itemsPath, core.sel!.path) && core.sel!.path.length === itemsPath.length) {
        const sel = core.sel!;
        const from = Math.min(sel.from, sel.to);
        const to = Math.max(sel.from, sel.to);
        const picked = items.slice(from, to);
        const only = picked.length > 0 && picked.every((e) => e.t === 'msrow');
        if (!only) {
          // lines and other items are struck out where they are
          items.splice(from, to - from, { t: 'menclose', a: [['notation', 'updiagonalstrike']], c: [picked] });
        } else {
          // rows are struck out as a stack of their own, which goes into the empty row that follows (else stays in place)
          const rows = items.splice(from, to - from);
          const inner: El = { t: 'mstack', a: [['stackalign', 'right']], c: [rows] };
          const X: El = { t: 'menclose', a: [['notation', 'updiagonalstrike']], c: [[inner]] };
          let k = from;
          while (k < items.length && items[k].t === 'msline') k++;
          if (k < items.length && items[k].t === 'msrow' && (items[k].c?.[0] ?? []).length === 0) items.splice(k, 1, X);
          else items.splice(from, 0, X);
        }
        core.sel = null;
      } else if (core.hasSelection()) {
        const s = core.sel!;
        const r = tryRowAt(core.row, s.path);
        if (r) {
          const from = Math.min(s.from, s.to);
          // the empty cells of a stack (none) become blanks inside the enclosure
          const els = r.splice(from, Math.abs(s.to - s.from)).map((e) => (e.t === 'none' ? ({ t: 'mo', a: [], x: '\u00A0', g: newGroup() } as El) : e));
          r.splice(from, 0, { t: 'menclose', a: [['notation', 'updiagonalstrike']], c: [els] });
        }
      } else {
        // no selection: an empty strike goes where the caret is — into the row it is in, or into the row after the gap
        const X = (): El => ({ t: 'menclose', a: [['notation', 'updiagonalstrike']], c: [[]] });
        const cp = core.caret.path;
        const inRow = samePrefix(itemsPath, cp) && cp.length === itemsPath.length + 1;
        if (inRow) {
          const rowEl = items[cp[itemsPath.length][0]];
          const r = rowEl?.c?.[0];
          if (r && r.length === 0 && rowEl.t === 'msrow') items[cp[itemsPath.length][0]] = X();
          else if (r) {
            r.splice(core.caret.index, 0, X());
            core.caret = { path: cp, index: core.caret.index + 1 };
          }
        } else {
          let k = samePrefix(itemsPath, cp) && cp.length === itemsPath.length ? core.caret.index : cur;
          while (k < items.length && items[k].t === 'msline') k++;
          if (k < items.length && items[k].t === 'msrow' && (items[k].c?.[0] ?? []).length === 0) items[k] = X();
          // in front of a row (after a line): the strike becomes the first cell of that row
          else if (k < items.length && items[k].t === 'msrow' && lineK >= 0) items[k].c![0].unshift(X());
          else items.splice(Math.min(k, items.length), 0, X());
        }
      }
      break;
    }
    default: {
      const m = /^st_carry_(nw|n|ne|w|e|sw|s|se)$/.exec(id);
      if (m && items[cur - 1]?.t === 'mscarries') {
        setAttr(items[cur - 1], 'location', m[1] === 'n' ? null : m[1]);
        core.ctxCarry = m[1];
      }
    }
  }
  cur = 0;
  void cloneRow;
}
