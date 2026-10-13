/**
 * Contextual tab model (SRS 4.11, Appendix G): which controls are offered for the structure at the caret
 * and what each control does to the document.
 */
import { El, Row, Step, getAttr, setAttr, cloneRow, tryRowAt, newGroup } from './model';
import { EditorCore } from './engine';

export type CtxKind = 'matrix' | 'table' | 'piecewise' | 'aligned' | 'fence_in' | 'operator' | 'multiline' | 'stack' | 'longdiv' | 'mspace' | 'sum' | 'symbol_sel' | 'numsep_sel' | 'numsep';

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

/** which recorded arrangement of the contextual tab shows the controls of `loc` */
export function ctxLayoutKey(loc: Located): string {
  switch (loc.kind) {
    case 'matrix':
    case 'piecewise':
      return 'matrix';
    case 'table':
      return 'table';
    case 'aligned':
      return loc.spacing ? 'aligned_sp' : 'aligned';
    case 'fence_in':
      return loc.spacing ? 'fence_sp' : 'fence';
    case 'operator':
      return 'operator';
    case 'sum':
      return 'sum';
    case 'mspace':
      return 'mspace';
    case 'multiline':
    case 'longdiv':
      return loc.spacing ? 'multiline_sp' : 'multiline';
    case 'stack':
      return loc.inNumber ? 'stack_merge' : 'stack';
    case 'symbol_sel':
      return loc.spacing ? 'symbol_sp' : 'symbol';
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
  const chain = enclosing(core);
  // selection based contexts
  const isSep = (e?: El) => !!e && e.c === undefined && e.t === 'mo' && (e.x ?? '') !== '' && (e.x ?? '') !== ',';
  // items selected at the stack level of an elementary stack (rows, lines) are handled by the stack's controls
  const stackLevelSel = (() => {
    if (!core.hasSelection() || !core.sel!.path.length) return false;
    const [e, sl] = core.sel!.path[core.sel!.path.length - 1];
    const owner = tryRowAt(core.row, core.sel!.path.slice(0, -1))?.[e];
    if (!owner) return false;
    if ((owner.t === 'mstack' && sl === 0) || (owner.t === 'msgroup' && sl === 0) || (owner.t === 'mlongdiv' && sl === 2)) return true;
    // symbols selected inside a row of a stack keep the stack's controls
    return owner.t === 'msrow' && chain.some((h) => h.el.t === 'mstack');
  })();
  if (core.hasSelection() && !stackLevelSel) {
    const s = core.sel!;
    const row = tryRowAt(core.row, s.path)!;
    const from = Math.min(s.from, s.to);
    const to = Math.max(s.from, s.to);
    const els = row.slice(from, to);
    // the Left / Right spacing controls follow an operator next to the start of the selection (",", a separator, does not count)
    const spacing = chain.length === 0 && (isSep(row[from - 1]) || isSep(row[from]));
    // a whole number with separators (mn mo mn …) is selected: merge / unmerge
    if (els.length >= 3 && els[0].t === 'mn' && els[els.length - 1].t === 'mn' && els.some((e) => e.t === 'mo') && els.every((e) => e.c === undefined && (e.t === 'mn' || (e.t === 'mo' && /^[.,]$/.test(e.x ?? ''))))) {
      return { kind: 'numsep_sel', tokens: els.map((_, k) => ({ row, index: from + k })) };
    }
    if (els.length === 1 && els[0].c === undefined) return { kind: 'symbol_sel', tokens: [{ row, index: from }], spacing };
    if (els.length === 1 && els[0].t === 'mpadded') return { kind: 'symbol_sel', tokens: [{ row, index: from }], spacing };
    if (els.length === 1 && els[0].t === 'mspace' && getAttr(els[0], 'linebreak') !== 'newline') return { kind: 'mspace', el: els[0] };
    if (chain.length === 0 && els.length > 1 && els.every((e) => e.c === undefined)) return { kind: 'symbol_sel', tokens: els.map((_, k) => ({ row, index: from + k })), spacing };
  }
  const row = core.currentRow();
  const idx = core.caret.index;
  const left = row[idx - 1];
  const right = row[idx];
  const isTok = (e?: El) => !!e && e.c === undefined;
  const isOp = (e?: El) => isTok(e) && e!.t === 'mo' && (e!.x ?? '') !== '';
  const isNl = (e?: El) => !!e && e.t === 'mspace' && getAttr(e, 'linebreak') === 'newline';
  // lines aligned at their relation symbols are kept in a three column table
  if (isRelationTable(core.row)) return { kind: 'multiline', spacing: false, relation: true };
  for (const h of chain) {
    const t = tableCtx(h, chain);
    if (t) {
      // the line of the current cell carries an operator and the caret is not at its start
      const hasOp = row.some((e) => isOp(e));
      return { kind: t.kind, table: h, fence: t.fence, spacing: t.kind === 'aligned' && hasOp && idx > 0 };
    }
    // a long division has no contextual controls of its own (reference, s16 / s30); the digits written in its group do
    if (h.el.t === 'mlongdiv') {
      if (chain.some((c) => c.el.t === 'msgroup')) return { kind: 'stack', hit: h, inNumber: false, carries: false };
      return null;
    }
    if (h.el.t === 'mstack' || h.el.t === 'msrow' || h.el.t === 'msgroup') {
      const st = chain.find((c) => c.el.t === 'mstack' || c.el.t === 'mlongdiv');
      if (st) {
        // the digits of a long division written in a group behave like a stack
        if (st.el.t === 'mlongdiv') return chain.some((c) => c.el.t === 'msgroup') ? { kind: 'stack', hit: st, inNumber: false, carries: false } : null;
        const digit = (e?: El) => !!e && e.t === 'mn';
        // inside a row of the stack a caret next to digits counts as being in the number; between the stack's own items only between two digits
        const between = digit(left) && digit(right) && left!.g === right!.g;
        const inRow = h.el.t === 'msrow' && !row.every((e) => digit(e)) && ((digit(left) && (digit(row[idx - 2]) || digit(right))) || (digit(right) && digit(row[idx + 1])));
        return withCarries(core, { kind: 'stack', hit: st, inNumber: between || inRow });
      }
    }
    if (h.el.t === 'mfenced') return { kind: 'fence_in', fence: h, spacing: isOp(left) };
  }
  // big operator (sum, product, …): caret in a script slot after something, or in the operator slot
  for (const h of chain) {
    if ((h.el.t === 'munderover' || h.el.t === 'munder' || h.el.t === 'mover') && h.el.c![0].length === 1 && h.el.c![0][0].t === 'mo') return { kind: 'sum', hit: h, spacing: h.slot !== 0 && idx > 0 };
  }
  // caret right after a structure of the line
  if (left && left.c !== undefined && core.caret.path.length === 0) {
    if (left.t === 'mtable') {
      const ca = (getAttr(left, 'columnalign') ?? '').split(/\s+/).filter(Boolean);
      const kind: CtxKind = ca.length === 2 && ca[0] === 'right' && ca[1] === 'left' ? 'aligned' : 'table';
      return { kind, table: { row, index: idx - 1, el: left, path: [], slot: left.c!.length - 1 } };
    }
    if (left.t === 'mstack') return withCarries(core, { kind: 'stack', hit: { row, index: idx - 1, el: left, path: [], slot: 0 } });
    if ((left.t === 'munderover' || left.t === 'munder' || left.t === 'mover') && left.c![0].length === 1 && left.c![0][0].t === 'mo') return { kind: 'sum', hit: { row, index: idx - 1, el: left, path: [], slot: 0 }, spacing: true };
  }
  for (const e of [left, right]) {
    if (e && e.t === 'mspace' && getAttr(e, 'linebreak') !== 'newline') return { kind: 'mspace', el: e };
  }
  // caret between two characters of one number: merge / unmerge its separators
  if (left && right && left.t === 'mn' && right.t === 'mn' && left.c === undefined && right.c === undefined && left.g !== undefined && left.g === right.g) return { kind: 'numsep', tokens: [{ row, index: idx }] };
  if (isOp(left) || isOp(right)) return { kind: 'operator', tokens: [{ row, index: isOp(left) ? idx - 1 : idx }] };
  // a formula aligned as a whole sits in a group (mstyle indentalign): the lines are still the document's lines
  const group = core.row.length === 1 && core.row[0].t === 'mstyle' && getAttr(core.row[0], 'indentalign') !== undefined ? core.row[0] : null;
  const lines = group && group.c ? group.c[0] : core.row;
  const outer = group ? chain.filter((h) => h.el !== group) : chain;
  if (lines.some((e) => isNl(e)) && outer.length === 0) return { kind: 'multiline', spacing: isNl(left) || isNl(right) };
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

export function controlsFor(loc: Located): CtxControl[] {
  switch (loc.kind) {
    case 'matrix':
    case 'piecewise':
      return TABLE_CONTROLS(true);
    case 'table':
      return TABLE_CONTROLS(false);
    case 'aligned': {
      const all = TABLE_CONTROLS(false);
      const sp: CtxControl[] = loc.spacing ? [{ id: 'left_spacing', title: 'Left spacing', kind: 'length', icon: 'left_spacing', group: 0 }, { id: 'right_spacing', title: 'Right spacing', kind: 'length', icon: 'right_spacing', group: 0 }] : [];
      return [...sp, ...all.map((c) => ({ ...c, group: c.group + (loc.spacing ? 1 : 0) }))];
    }
    case 'fence_in':
      return [
        { id: 'setOpenBracket', title: 'setOpenBracket', kind: 'select', icon: 'sel_open', options: sel(BRACKETS), group: 0 },
        { id: 'setCloseBracket', title: 'setCloseBracket', kind: 'select', icon: 'sel_close', options: sel(BRACKETS), group: 0 },
        { id: 'setSeparator', title: 'setSeparator', kind: 'select', icon: 'sel_sep', options: sel(SEPS), group: 0 },
        { id: 'valign_baseline', title: 'Baseline', kind: 'toggle', icon: 'valign_baseline', group: 1 },
        { id: 'valign_middle', title: 'Middle', kind: 'button', icon: 'valign_middle', group: 1 },
        { id: 'valign_middle_baseline', title: 'Middle-baseline', kind: 'button', icon: 'valign_middle_baseline', group: 1 },
        ...(loc.spacing ? lenControls([['left_spacing', 'Left spacing'], ['right_spacing', 'Right spacing']], 'sp', 2) : []),
      ];
    case 'operator':
      return lenControls([['left_spacing', 'Left spacing'], ['right_spacing', 'Right spacing']], 'sp');
    case 'sum':
      return loc.spacing ? lenControls([['left_spacing', 'Left spacing'], ['right_spacing', 'Right spacing']], 'sp') : [];
    case 'longdiv':
    case 'multiline':
      return [
        ...(loc.spacing
          ? ([
              { id: 'left_spacing', title: 'Left spacing', kind: 'length', icon: 'ml_left', group: 0 },
              { id: 'right_spacing', title: 'Right spacing', kind: 'length', icon: 'ml_right', group: 0 },
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
      return [...NUDGES(), ...(loc.spacing ? lenControls([['left_spacing', 'Left spacing'], ['right_spacing', 'Right spacing']], 'sp', 1) : [])];
    case 'numsep_sel':
      return [...NUDGES(), { id: 'numsep_merge', title: 'Merge/unmerge separators in <mn>', kind: 'button', icon: 'numsep_merge', group: 1 }];
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
      // lines are left aligned unless the formula sits in a group with an indentalign
      const row = core.row;
      const al = row.length === 1 && row[0].t === 'mstyle' ? getAttr(row[0], 'indentalign') : undefined;
      return { toggled: (al ?? 'left') === id.slice(3) };
    }
    case 'left_spacing':
    case 'right_spacing': {
      const tk = loc.tokens?.[0];
      const e = tk ? tk.row[tk.index] : null;
      return { value: e ? getAttr(e, id === 'left_spacing' ? 'lspace' : 'rspace') ?? '' : '' };
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
        return { toggled: !!e && e.t === 'mscarries' && (getAttr(e, 'location') ?? 'n') === id.slice(9) };
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
export function parseLength(raw: string): string | null {
  const s = raw.trim();
  const m = /^(\d+(?:\.\d+)?|\.\d+)\s*(px|em|ex)?$/i.exec(s);
  if (!m) return null;
  return m[2] ? m[1] + m[2].toLowerCase() : m[1];
}

function bracketAttr(v: string): string {
  return v === '⟨' ? '<' : v === '⟩' ? '>' : v === '‖' ? '||' : v;
}

function insertCols(t: El, at: number, n: number, dupAlign = false): void {
  const cols = t.cols ?? 1;
  for (const name of ['columnalign', 'wrs:columnalign']) {
    const v = (getAttr(t, name) ?? '').split(/\s+/).filter(Boolean);
    if (v.length && dupAlign) {
      const arr = Array.from({ length: cols }, (_, i) => v[i] ?? v[v.length - 1]);
      arr.splice(at, 0, arr[Math.max(at - 1, 0)]);
      setAttr(t, name, arr.join(' '), TABLE_ORDER);
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
      if (f) withUndo(() => setOrdered(f, 'wrs:valign', null, FENCE_ORDER));
      break;
    case 'valign_middle':
      if (f) withUndo(() => setOrdered(f, 'wrs:valign', 'middle', FENCE_ORDER));
      break;
    case 'valign_middle_baseline':
      if (f) withUndo(() => setOrdered(f, 'wrs:valign', 'middle-baseline', FENCE_ORDER));
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
      if (t) withUndo(() => setOrdered(t, 'align', 'axis 2', TABLE_ORDER));
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
        withUndo(() => insertCols(t, id === 'col_right' ? pos.c + 1 : pos.c, 1, id === 'col_left'));
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
      const n = horizontal ? pos.rows : pos.cols;
      const at = (horizontal ? pos.r : pos.c);
      const cur = (getAttr(t, name) ?? '').split(/\s+/).filter(Boolean);
      const arr = Array.from({ length: n + 1 }, (_, i) => cur[i] ?? 'none');
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
      if (!tk) break;
      const e = tk.row[tk.index];
      if (!e || e.c !== undefined) break;
      withUndo(() => setAttr(e, id === 'left_spacing' ? 'lspace' : 'rspace', v));
      break;
    }
    case 'sp_width':
    case 'sp_height':
    case 'sp_depth': {
      const v = parseLength(value ?? '');
      if (v === null || !loc.el) return false;
      // reference: only some units are written (spec examples)
      withUndo(() => setAttr(loc.el!, id.slice(3), v));
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
      mergeNumSep(core, loc);
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
  const group = core.row.length === 1 && core.row[0].t === 'mstyle' && core.row[0].c ? core.row[0] : null;
  const src = group ? group.c![0] : core.row;
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

function wrapRootStyle(core: EditorCore, attr: string, v: string): void {
  if (core.row.length === 1 && core.row[0].t === 'mstyle') {
    setAttr(core.row[0], attr, v);
    return;
  }
  const w: El = { t: 'mstyle', a: [[attr, v]], c: [core.row] };
  core.row = [w];
  core.caret = { path: [[0, 0], ...core.caret.path], index: core.caret.index };
  // a selection moves into the group with the content
  if (core.sel) core.sel = { ...core.sel, path: [[0, 0], ...core.sel.path] };
}

function mergeNumSep(core: EditorCore, loc: Located): void {
  const tk = loc.tokens;
  if (!tk || !tk.length) return;
  const row = tk[0].row;
  if (loc.kind === 'numsep_sel') {
    // merge the selected mn / mo / mn … into one number
    const from = tk[0].index;
    const g = newGroup();
    for (let k = 0; k < tk.length; k++) {
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
  stack: El;
  items: Row;
  itemsPath: Step[];
  /** index of the row the caret works on */
  cur: number;
}

function samePrefix(a: Step[], b: Step[]): boolean {
  return a.length <= b.length && a.every((s, i) => s[0] === b[i][0] && s[1] === b[i][1]);
}

export function stackInfo(core: EditorCore, loc: Located): StackInfo | null {
  const st = loc.hit;
  if (!st || st.el.t !== 'mstack' || !st.el.c) return null;
  const items = st.el.c[0];
  const itemsPath: Step[] = [...st.path, [st.index, 0]];
  let cur = items.length - 1;
  const cp = core.caret.path;
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

function stackOp(core: EditorCore, loc: Located, id: string, value?: string): void {
  const info = stackInfo(core, loc);
  if (!info) return;
  const { stack, items, itemsPath } = info;
  let cur = info.cur;
  const caretTo = (idx: number) => {
    core.caret = { path: [...itemsPath, [idx, 0]], index: 0 };
  };
  const groupStart = () => (items[cur - 1]?.t === 'mscarries' ? cur - 1 : cur);
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
      if (e && e.t === 'msrow' && (e.c?.[0] ?? []).length === 0) {
        items[cur] = { t: 'msline', a: [], x: '' };
        // the caret moves to the nearest row below (or above)
        let k = items.findIndex((it, i) => i > cur && it.t === 'msrow');
        if (k < 0) for (let i = cur - 1; i >= 0; i--) if (items[i].t === 'msrow') { k = i; break; }
        if (k >= 0) caretTo(k);
        else core.caret = { path: itemsPath, index: cur + 1 };
      } else items.splice(cur + 1, 0, { t: 'msline', a: [], x: '' });
      break;
    }
    case 'st_carries': {
      if (items[cur - 1]?.t === 'mscarries') break;
      if (items[cur]?.t === 'msline' || !items[cur]) {
        items.splice(cur + 1, 0, { t: 'mscarries', a: [], c: [[]] }, newRow());
        caretTo(cur + 2);
      } else {
        items.splice(cur, 0, { t: 'mscarries', a: [], c: [[]] });
        caretTo(cur + 1);
      }
      break;
    }
    case 'st_spacing':
      setAttr(stack, 'charspacing', value && value !== 'medium' ? value : null, ['charalign', 'charspacing', 'stackalign', 'align']);
      break;
    case 'st_right': {
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
      break;
    }
    case 'st_left': {
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
      break;
    }
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
          else items.splice(Math.min(k, items.length), 0, X());
        }
      }
      break;
    }
    default: {
      const m = /^st_carry_(nw|n|ne|w|e|sw|s|se)$/.exec(id);
      if (m && items[cur - 1]?.t === 'mscarries') setAttr(items[cur - 1], 'location', m[1] === 'n' ? null : m[1]);
    }
  }
  cur = 0;
  void cloneRow;
}
