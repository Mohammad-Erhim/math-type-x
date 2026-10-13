/**
 * Headless editor engine: document, caret, selection, history and editing commands.
 * All behaviour is implemented against the model of ./model.ts; rendering is separate.
 */
import { El, Row, Step, Caret, Selection, Attr, cloneRow, cloneEl, rowAt, tryRowAt, samePath, getAttr, setAttr, newGroup } from './model';
import { parseMathML, serializeMathML, MathMLError } from './mathml';
import { InsertSpec, Slot, deriveSpec, isPlaceholder } from './templates';
import { styleSpec, joinsTyped, plainAfter, textTokens, ModeStyle, StyleLock } from './modestyle';
import { TypeModes, classify, isLetterlike, mapDigit, RESERVED_WORDS, sameStyle, styleAttrs, DigitSet } from './typing';

export interface Snapshot {
  row: Row;
  attrs: Attr[];
  caret: Caret;
  sel: Selection | null;
}

export interface Mark {
  path: Step[];
  index: number;
}

export type Dir = 'left' | 'right' | 'up' | 'down';

/** geometry callbacks supplied by the renderer for vertical movement and hit testing */
export interface Geometry {
  /** x coordinate (px, document space) of a caret position, null when unknown */
  xOf(caret: Caret): number | null;
  /** caret position in row `path` nearest to x */
  nearest(path: Step[], x: number, from?: number, to?: number): number | null;
  /** every caret position of the document with its pixel coordinates (baseline y) */
  positions?(): { path: Step[]; index: number; x: number; y: number }[];
}

const NEWLINE = (): El => ({ t: 'mspace', a: [['linebreak', 'newline']], x: '' });
export const isNewline = (e: El | undefined) => !!e && e.t === 'mspace' && getAttr(e, 'linebreak') === 'newline';

/** element addressed by (path of rows from `row`, index in the final row) */
function resolveEl(row: Row, path: Step[], index: number): El | undefined {
  let r: Row | undefined = row;
  for (const [i, s] of path) r = r?.[i]?.c?.[s];
  return r?.[index];
}

export class EditorCore {
  row: Row = [];
  attrs: Attr[] = [];
  caret: Caret = { path: [], index: 0 };
  sel: Selection | null = null;
  mark: Mark | null = null;
  /** the current selection was produced by smart delete (Backspace / Delete on a structure) */
  smart = false;
  modes: TypeModes & { text: boolean } = {
    bold: false,
    italic: false,
    autoItalic: true,
    arabicLigature: false,
    color: null,
    digits: 'western',
    text: false,
  };
  rtl = false;
  undoStack: Snapshot[] = [{ row: [], attrs: [], caret: { path: [], index: 0 }, sel: null }]; // Q-09: enabled at load
  redoStack: Snapshot[] = [];
  geometry: Geometry | null = null;
  parity: 'exact' | 'improved' = 'exact';
  /** vendor autoformat (a/b → fraction, a^b, a_b, a*b → ×, >= , <=, auto-paired delimiters); off by default (EDT-005) */
  autoformat = false;
  /** function names merged into one upright identifier when typed (Appendix E) */
  reservedWords: string[] = [...RESERVED_WORDS];
  private specCache = new Map<string, InsertSpec>();
  /** the last typed text token that is part of an active regular-text run */
  private onChange: Array<() => void> = [];

  /* ------------------------------------------------------------- events */
  subscribe(fn: () => void): () => void {
    this.onChange.push(fn);
    return () => {
      this.onChange = this.onChange.filter((f) => f !== fn);
    };
  }
  private emit() {
    this.sanitize();
    for (const f of this.onChange) f();
  }

  /** a caret / selection that no longer addresses a row (a structure was replaced) goes to the nearest row that exists */
  private sanitize(): void {
    let { path, index } = this.caret;
    let r = tryRowAt(this.row, path);
    if (!r) {
      while (path.length && !tryRowAt(this.row, path)) {
        index = path[path.length - 1][0];
        path = path.slice(0, -1);
      }
      r = tryRowAt(this.row, path) ?? this.row;
      this.caret = { path, index };
    }
    if (this.caret.index > r.length) this.caret = { path: this.caret.path, index: r.length };
    if (this.caret.index < 0) this.caret = { path: this.caret.path, index: 0 };
    if (this.sel) {
      const sr = tryRowAt(this.row, this.sel.path);
      if (!sr || this.sel.from > sr.length || this.sel.to > sr.length) {
        this.sel = null;
        this.anchor = null;
      }
    }
  }

  /** public hooks used by contextual commands */
  checkpointPublic(): void {
    this.checkpoint();
  }
  touch(): void {
    this.emit();
  }

  /* -------------------------------------------------------------- state */
  snapshot(): Snapshot {
    return { row: cloneRow(this.row), attrs: this.attrs.map(([k, v]) => [k, v] as Attr), caret: { path: this.caret.path.map(([a, b]) => [a, b] as Step), index: this.caret.index }, sel: this.sel ? { ...this.sel, path: this.sel.path.map(([a, b]) => [a, b] as Step) } : null };
  }
  private restore(s: Snapshot) {
    this.row = cloneRow(s.row);
    this.attrs = s.attrs.map(([k, v]) => [k, v] as Attr);
    this.caret = { path: s.caret.path.map(([a, b]) => [a, b] as Step), index: s.caret.index };
    this.sel = s.sel ? { ...s.sel, path: s.sel.path.map(([a, b]) => [a, b] as Step) } : null;
    this.mark = null;
  }
  private checkpoint() {
    this.anchor = null;
    this.smart = false;
    this.undoStack.push(this.snapshot());
    this.redoStack = [];
    if (this.undoStack.length > 500) this.undoStack.shift();
  }

  getMathML(opts: { xmlns?: boolean } = {}): string {
    return serializeMathML(this.row, this.attrs, opts);
  }

  isEmpty(): boolean {
    return this.row.length === 0;
  }

  setMathML(src: string): void {
    const d = parseMathML(src);
    this.row = d.row;
    this.attrs = d.attrs.filter(([k]) => k !== 'dir' || true);
    this.rtl = getAttrList(this.attrs, 'dir') === 'rtl';
    this.caret = { path: [], index: this.row.length };
    this.sel = null;
    this.mark = null;
    this.undoStack = [];
    this.redoStack = [];
    // loading a document drops the pending character format; digit mode and automatic italic persist (Q-08)
    this.modes.bold = false;
    this.modes.italic = false;
    this.modes.text = false;
    this.modes.color = null;
    this.modes.autoItalic = true;
    this.modes.lock = undefined;
    this.ctxDash = false;
    this.mergeTarget = null;
    this.emit();
  }

  /** reset document and history (keeps global modes, Q-08) */
  reset(): void {
    this.setMathML('<math xmlns="http://www.w3.org/1998/Math/MathML"/>');
  }

  canUndo() {
    return this.undoStack.length > 0;
  }
  canRedo() {
    return this.redoStack.length > 0;
  }
  undo() {
    const s = this.undoStack.pop();
    if (!s) return;
    this.redoStack.push(this.snapshot());
    this.restore(s);
    this.emit();
  }
  redo() {
    const s = this.redoStack.pop();
    if (!s) return;
    this.undoStack.push(this.snapshot());
    this.restore(s);
    this.emit();
  }

  /* ------------------------------------------------------------- helpers */
  currentRow(): Row {
    return rowAt(this.row, this.caret.path);
  }

  /** a symbol inserted from the toolbar that the next typed letter joins (π, chemical elements) */
  private mergeTarget: El | null = null;
  /** the contextual tab's "dash lines" choice for new table lines (not part of the document) */
  ctxDash = false;

  private modeStyle(): ModeStyle | null {
    const m = this.modes;
    return m.bold && m.italic ? 'bold-italic' : m.bold ? 'bold' : m.italic ? 'italic' : null;
  }

  private clearTransient() {
    this.mark = null;
    this.smart = false;
  }

  private collapse() {
    this.sel = null;
  }

  /** delete current selection (caret goes to its start); returns removed elements */
  private takeSelection(): Row | null {
    if (!this.sel) return null;
    const r = rowAt(this.row, this.sel.path);
    const [from, to] = [Math.min(this.sel.from, this.sel.to), Math.max(this.sel.from, this.sel.to)];
    const removed = r.splice(from, to - from);
    this.caret = { path: this.sel.path, index: from };
    this.sel = null;
    return removed;
  }

  hasSelection(): boolean {
    return !!this.sel && this.sel.from !== this.sel.to;
  }

  /* -------------------------------------------------------- insertion */
  getSpec(id: string, cases: { A: string; A2?: string; B?: string; C?: string }): InsertSpec {
    let s = this.specCache.get(id);
    if (!s) {
      s = deriveSpec(cases);
      this.specCache.set(id, s);
    }
    return s;
  }

  insertSpec(spec: InsertSpec): void {
    if (spec.tree.length === 0) return; // mode toggles carry no symbols
    if (!this.hasSelection()) this.settleStackCaret();
    let mapped = false;
    if (this.rtl) spec = rtlize(spec);
    if (!this.modes.autoItalic && spec.tree.length === 1 && spec.tree[0].c === undefined) {
      // script capitals are drawn from the plain letter in upright mode
      const t = spec.tree[0];
      const alt: Record<string, El> = {
        '\u2112': { t: 'mi', a: [['mathvariant', 'script']], x: 'L', g: t.g },
        '\u2131': { t: 'mi', a: [['mathvariant', 'script']], x: 'F', g: t.g },
        '\u2118': { t: 'mi', a: [['mathvariant', 'normal']], x: '\u2118', g: t.g },
      };
      if (t.x && alt[t.x]) {
        spec = { ...spec, tree: [alt[t.x]] };
        mapped = t.x !== '\u2118';
      }
    }
    // plain letters / symbols behave exactly like typed text: they join the surrounding run
    // in regular-text mode and in upright (automatic italic off) mode
    const flat = spec.tree.length > 0 && spec.tree.every((e) => e.c === undefined && e.x !== undefined && e.x !== '');
    const selAfter = !!spec.sel && spec.sel.path.length === 0 && spec.sel.index === spec.tree.length && !spec.sel.replace;
    if (flat && !mapped && (!spec.sel || selAfter || (this.modes.text && !this.hasSelection())) && !spec.takePrev) {
      const letters = spec.tree.every((e) => e.t === 'mi' && (e.a.length === 0 || (e.a.length === 1 && e.a[0][0] === 'mathvariant' && e.a[0][1] === 'normal')) && Array.from(e.x!).length === 1);
      if (this.modes.text || (letters && !this.modes.autoItalic && !this.modes.italic && !this.modes.bold)) {
        // a selection is kept: the symbol goes in front of it
        if (selAfter && this.sel) {
          const r = this.sel;
          this.sel = null;
          this.anchor = null;
          this.caret = { path: r.path, index: Math.min(r.from, r.to) };
        }
        if (this.modes.text) {
          // regular text: every inserted symbol becomes text; styled letters keep their variant and stay separate
          const startRow = this.currentRow();
          void startRow;
          const caretAt = spec.caret && spec.caret.path.length === 0 ? spec.caret.index : spec.tree.length;
          spec.tree.forEach((e) => {
            let ch = e.x!;
            if (ch === '~') ch = '\u223c';
            this.typeChar(ch);
            let v = getAttr(e, 'mathvariant');
            if (v === 'normal' && /^[\u2102\u210d\u2115\u2119\u211a\u211d\u2124]$/.test(ch)) v = 'double-struck';
            if (v && v !== 'normal') {
              const r = this.currentRow();
              const t = r[this.caret.index - 1];
              if (t && t.t === 'mtext') {
                t.a = [['mathvariant', v]];
                t.g = newGroup();
              }
            }
          });
          this.caret = { path: this.caret.path, index: this.caret.index - (spec.tree.length - caretAt) };
          this.emit();
          return;
        }
        this.typeText(spec.tree.map((e) => e.x).join(''));
        if (plainAfter(spec)) this.modes.lock = { v: null };
        return;
      }
    }
    // bold / italic switched on: the inserted fragment is written in that style (reference behaviour)
    let lock: StyleLock = null;
    let mergeNext = false;
    const M = this.modes.text ? null : this.modeStyle();
    if (M) {
      const st = styleSpec(spec, M);
      spec = st.spec;
      lock = st.lock;
      mergeNext = st.merge;
    } else mergeNext = joinsTyped(spec.tree, null);
    // a fraction-like structure inserted straight into a fraction slot is wrapped in a display-style
    // group; "small" (display-style off) variants lose their wrapper there
    if (this.caret.path.length && spec.tree.length === 1 && spec.tree[0].c) {
      const last = this.caret.path[this.caret.path.length - 1];
      const parent = rowAt(this.row, this.caret.path.slice(0, -1))[last[0]];
      const t0 = spec.tree[0];
      const remap = (f: (path: Step[]) => Step[]): InsertSpec => ({
        ...spec,
        caret: spec.caret ? { ...spec.caret, path: f(spec.caret.path) } : spec.caret,
        sel: spec.sel ? { ...spec.sel, path: f(spec.sel.path) } : spec.sel,
        takePrev: spec.takePrev ? { ...spec.takePrev, path: f(spec.takePrev.path) } : spec.takePrev,
      });
      if (parent && parent.t === 'mfrac') {
        if (t0.t === 'mstyle' && getAttr(t0, 'displaystyle') === 'false' && t0.c!.length === 1 && t0.c![0].length === 1) {
          spec = { ...remap((p) => (p.length && p[0][0] === 0 && p[0][1] === 0 ? p.slice(1) : p)), tree: [t0.c![0][0]] };
        } else if (['mfrac', 'munder', 'mover', 'munderover'].includes(t0.t)) {
          spec = { ...remap((p) => (p.length ? [[0, 0] as Step, ...p] : p)), tree: [{ t: 'mstyle', a: [['displaystyle', 'true']], c: [[t0]] }] };
        }
      }
    }
    this.checkpoint();
    this.clearTransient();
    const textBefore = this.modes.text;
    this.modes.text = false;
    let content: Row | null = null;
    if (this.hasSelection()) content = this.takeSelection();
    else this.sel = null;
    const tree = cloneRow(spec.tree);
    let row = this.currentRow();
    let idx = this.caret.index;
    const fill = (slot: Slot, els: Row) => {
      let r = tree;
      for (const [i, s] of slot.path) r = r[i].c![s];
      if (slot.replace) r.splice(slot.index, 1, ...els);
      else r.splice(slot.index, 0, ...els);
    };
    let caretOffset = 0;
    let prevTaken = false;
    // the selection cannot become the text of a big operator when it holds structures: it stays behind the new structure
    let leftover: Row | null = null;
    if (content && content.length && spec.sel && spec.sel.path.length) {
      let r: Row = tree;
      let owner: El | undefined;
      for (const [i, sl] of spec.sel.path) {
        owner = r[i];
        r = owner?.c?.[sl] ?? [];
      }
      if (owner && owner.t === 'mo' && owner.c && content.some((e) => e.c !== undefined)) {
        leftover = content;
        content = null;
      }
    }
    if (content && content.length && spec.sel) {
      fill(spec.sel, content);
    } else if (!content && spec.takePrev && idx > 0 && canBeBase(row[idx - 1])) {
      const prev = row.splice(idx - 1, 1)[0];
      idx--;
      fill(spec.takePrev, [prev]);
      prevTaken = true;
    } else if (content && content.length && !spec.sel) {
      // symbols replace the selection
    }
    // colour chosen before inserting a structure: set mathcolor on the structure element
    if (this.modes.color && tree.length === 1 && tree[0].c) {
      setAttr(tree[0], 'mathcolor', this.modes.color);
      this.modes.color = null; // the colour is consumed by the structure
    }
    const textKept = textBefore ? textTokens(tree) : false;
    const marked = this.applyModesToInserted(tree);
    row.splice(idx, 0, ...marked);
    if (leftover) row.splice(idx + marked.length, 0, ...leftover);
    this.sel = null;
    this.mergeTarget = mergeNext && marked.length > 0 ? marked[marked.length - 1] : null;
    if (M) this.modes.lock = lock === 'slot' ? { v: M } : lock === 'plain' ? { v: null } : undefined;
    else if (!this.modes.autoItalic && !textBefore && plainAfter(spec)) this.modes.lock = { v: null };
    // when the argument placeholder that receives the caret was filled (base taken / selection moved),
    // the caret goes to the following slot of the structure
    let caretSpec = spec.caret;
    const filled = (content && content.length && spec.sel) || (spec.takePrev && prevTaken);
    const filledSlot = content && content.length && spec.sel ? spec.sel : prevTaken ? spec.takePrev : null;
    if (caretSpec && caretSpec.replace && filled && filledSlot && filledSlot.replace && filledSlot.index === caretSpec.index && samePath(filledSlot.path, caretSpec.path)) {
      const last = caretSpec.path[caretSpec.path.length - 1];
      const owner = tree[0];
      let parent: El | undefined = owner;
      for (const [i, sl] of caretSpec.path.slice(0, -1)) parent = parent?.c?.[sl]?.[i];
      void parent;
      if (last) {
        const nextSlot = last[1] + 1;
        const struct = resolveEl(tree, caretSpec.path.slice(0, -1), last[0]);
        if (struct && struct.c && nextSlot < struct.c.length) caretSpec = { path: [...caretSpec.path.slice(0, -1), [last[0], nextSlot]], index: 0, replace: false };
        else caretSpec = null;
      }
    }
    if (caretSpec) {
      const c = caretSpec;
      const tp: Step[] = c.replace ? [...c.path, [c.index, 0]] : c.path;
      const ti = c.replace ? 0 : c.index;
      if (tp.length === 0) this.caret = { path: this.caret.path, index: idx + ti };
      else this.caret = { path: [...this.caret.path, [idx + tp[0][0], tp[0][1]], ...tp.slice(1)], index: ti };
    } else {
      this.caret = { path: this.caret.path, index: idx + marked.length + caretOffset };
    }
    // regular text goes on when the caret ended behind the inserted symbols / structure
    if (textKept && !caretSpec) this.modes.text = true;
    this.emit();
  }

  /** apply bold/italic/colour modes to symbol tokens that are inserted from the toolbar */
  private applyModesToInserted(tree: Row): Row {
    // right-to-left editing mirrors table column alignment, uses Arabic function names and a left arrow in limits
    if (this.rtl) {
      const swap = (r: Row): void => {
        for (const e of r) {
          if (e.t === 'mtable') {
            const ca = e.a.find(([k]) => k === 'columnalign');
            if (ca) ca[1] = ca[1].split(/\s+/).map((v) => (v === 'left' ? 'right' : v === 'right' ? 'left' : v)).join(' ');
          }
          if (e.t === 'munder' && e.c && e.c[0].map((t) => t.x).join('') === 'lim') {
            for (const t of e.c[1]) if (t.t === 'mo' && t.x === '\u2192') t.x = '\u2190';
            for (const t of e.c[1]) t.c?.forEach((rr) => rr.forEach((q) => { if (q.t === 'mo' && q.x === '\u2192') q.x = '\u2190'; }));
          }
          e.c?.forEach(swap);
        }
      };
      swap(tree);
    }
    return tree;
  }

  /* ----------------------------------------------------------- typing */
  typeText(s: string): void {
    const chars = Array.from(s);
    let runStart: number | null = null;
    let runScript = '';
    let g = 0;
    for (const ch of chars) {
      const before = this.caret.index;
      const isCjk = classify(ch) === 'cjk';
      this.typeChar(ch);
      if (isCjk) {
        const row = this.currentRow();
        const el = row[this.caret.index - 1];
        if (el && el.t === 'mi') {
          const sc = scriptOf(ch);
          if (runStart === null || sc !== runScript) {
            g = newGroup();
            runStart = before;
            runScript = sc;
          }
          el.g = g;
          continue;
        }
      }
      runStart = null;
    }
  }

  /** insert a ready-made token element at the caret, replacing the selection */
  /** the stack-level of an elementary stack is not a caret position of its own: text goes to the neighbouring row */
  private settleStackCaret(): void {
    const { path, index } = this.caret;
    if (!path.length) return;
    if (!this.isStackLevel(path)) return;
    const rows = this.currentRow();
    for (let k = index; k < rows.length; k++) {
      const r = this.descendStackItem(path, k, 1);
      if (r) {
        this.caret = r;
        return;
      }
    }
    for (let k = Math.min(index, rows.length) - 1; k >= 0; k--) {
      const r = this.descendStackItem(path, k, -1);
      if (r) {
        this.caret = r;
        return;
      }
    }
  }

  private put(el: El): void {
    const row = this.currentRow();
    row.splice(this.caret.index, 0, el);
    this.caret.index++;
  }

  /** the run of elements the next structure should take as its base (a whole number / word, or one element) */
  private autofmtEnabled(): boolean {
    return this.autoformat;
  }

  /** the run of elements the next structure should take as its base (a whole number / word, or one element) */
  private previousRun(): { start: number; els: Row } | null {
    const row = this.currentRow();
    const idx = this.caret.index;
    const last = row[idx - 1];
    if (!last || (last.t === 'mspace' && getAttr(last, 'linebreak') === 'newline')) return null;
    let start = idx - 1;
    if (last.c === undefined && last.g !== undefined && (last.t === 'mn' || last.t === 'mi')) {
      while (start > 0 && row[start - 1].c === undefined && row[start - 1].g === last.g && row[start - 1].t === last.t) start--;
    }
    return { start, els: row.slice(start, idx) };
  }

  /** returns true when the typed character was consumed by an autoformat rule */
  private autoFormat(ch: string): boolean {
    const row = this.currentRow();
    const idx = this.caret.index;
    const prev = row[idx - 1];
    const wrap = (t: 'mfrac' | 'msup' | 'msub'): boolean => {
      const run = this.previousRun();
      if (!run) return false;
      row.splice(run.start, run.els.length);
      const el: El = { t, a: [], c: t === 'mfrac' ? [run.els, []] : [run.els, []] };
      row.splice(run.start, 0, el);
      this.caret = { path: [...this.caret.path, [run.start, 1]], index: 0 };
      this.emit();
      return true;
    };
    switch (ch) {
      case '/':
        return wrap('mfrac');
      case '^':
        return wrap('msup');
      case '_':
        return wrap('msub');
      case '*':
        row.splice(idx, 0, { t: 'mo', a: [], x: '\u00D7', g: newGroup() });
        this.caret.index++;
        this.emit();
        return true;
      case '=':
        if (prev && prev.c === undefined && prev.t === 'mo' && (prev.x === '>' || prev.x === '<')) {
          prev.x = prev.x === '>' ? '\u2265' : '\u2264';
          this.emit();
          return true;
        }
        return false;
      case ')':
      case ']':
      case '}': {
        // typing the closing delimiter of an auto-paired fence steps out of it
        const cp = this.caret.path;
        if (cp.length && idx >= row.length) {
          const [fi] = cp[cp.length - 1];
          const par = tryRowAt(this.row, cp.slice(0, -1));
          const f = par?.[fi];
          if (f && f.t === 'mfenced') {
            const close = getAttr(f, 'close') ?? ')';
            if (close === ch) {
              this.caret = { path: cp.slice(0, -1), index: fi + 1 };
              this.emit();
              return true;
            }
          }
        }
        return false;
      }
      case '(':
      case '[':
      case '{': {
        const close = ch === '(' ? ')' : ch === '[' ? ']' : '}';
        const a: [string, string][] = ch === '(' ? [] : [['open', ch], ['close', close]];
        row.splice(idx, 0, { t: 'mfenced', a, c: [[]] });
        this.caret = { path: [...this.caret.path, [idx, 0]], index: 0 };
        this.emit();
        return true;
      }
    }
    return false;
  }

  typeChar(ch: string): void {
    this.checkpoint();
    this.clearTransient();
    if (this.hasSelection()) this.takeSelection();
    this.sel = null;
    this.settleStackCaret();
    if (this.autofmtEnabled() && !this.modes.text && this.autoFormat(ch)) return;
    const m = this.modes;
    const row = () => this.currentRow();
    const prevEl = (): El | undefined => (this.caret.index > 0 ? row()[this.caret.index - 1] : undefined);
    const nextEl = (): El | undefined => row()[this.caret.index];
    const joinable = (t: El | undefined, tag: string, a: Attr[]): t is El => !!t && t.t === tag && t.c === undefined && t.x !== undefined && t.x !== '' && sameStyle(t, a);
    /** put a character token, joining the group of an adjacent token of the same kind */
    const putChar = (tag: string, a: Attr[], x: string, extra: Partial<El> = {}, joinPrev = true, joinNext = false) => {
      const el: El = { t: tag, a, x, ...extra };
      const p = prevEl();
      const n = nextEl();
      if (joinPrev && joinable(p, tag, a)) {
        if (p.g === undefined) p.g = newGroup();
        el.g = p.g;
      } else if (joinNext && joinable(n, tag, a)) {
        if (n.g === undefined) n.g = newGroup();
        el.g = n.g;
      } else el.g = newGroup();
      this.put(el);
      return el;
    };
    if (m.text) {
      const t = ch === ' ' || ch === '\u00A0' ? '\u00A0' : ch;
      putChar('mtext', styleAttrs('mtext', m), t, {}, true, true);
      this.afterTyped();
      return;
    }
    // the Weierstrass p behaves as a plain letter in upright mode
    const cls = ch === '\u2118' && !m.autoItalic ? 'letter' : classify(ch);
    switch (cls) {
      case 'digit':
        putChar('mn', styleAttrs('mn', m), mapDigit(ch, m.digits), {}, true, true);
        break;
      case 'space': {
        // inside an elementary stack a space is a blank column
        const cp = this.caret.path;
        let inStack = false;
        for (let d = cp.length - 2; d >= 0; d--) {
          const el = tryRowAt(this.row, cp.slice(0, d))?.[cp[d][0]];
          if (el && el.t === 'mstack') {
            inStack = true;
            break;
          }
        }
        if (inStack) this.put({ t: 'none', a: [], x: '' });
        else putChar('mo', styleAttrs('mo', m), '\u00A0', {}, false);
        break;
      }
      case 'op':
        putChar('mo', styleAttrs('mo', m), ch, {}, false);
        break;
      case 'under':
        putChar('mi', styleAttrs('mi', m), ch, {}, false);
        break;
      case 'arabic': {
        const a = styleAttrs('mi', m);
        const p = prevEl();
        const join = m.arabicLigature && joinable(p, 'mi', a) && /^\p{Script=Arabic}$/u.test(p.x ?? '');
        putChar('mi', a, ch, {}, join);
        this.mergeReserved();
        break;
      }
      case 'cjk':
        putChar('mi', styleAttrs('mi', m), ch, {}, false);
        break;
      default: {
        // latin / greek / other letters
        const upright = !m.autoItalic && !m.italic && !m.lock;
        let extra: Attr[] = [];
        if (isLetterlike(ch)) extra = [['mathvariant', 'normal']];
        const a = styleAttrs('mi', m, extra);
        if (upright) {
          // consecutive letters merge into one upright multi-letter identifier
          putChar('mi', a, ch, { up: true }, !isLetterlike(ch), !isLetterlike(ch));
          break;
        }
        const tgt = this.mergeTarget;
        if (tgt && prevEl() === tgt && !isLetterlike(ch) && /^[\p{L}]$/u.test(ch)) {
          // the letter joins the symbol inserted just before it: one multi-letter identifier
          const v = getAttr(tgt, 'mathvariant');
          const keep = v === 'bold' ? [['mathvariant', 'bold'] as [string, string]] : [];
          if (tgt.g === undefined) tgt.g = newGroup();
          // every letter of the run takes the common style
          for (const e of this.currentRow()) if (e.c === undefined && e.g === tgt.g) e.a = e.a.filter(([k]) => k !== 'mathvariant').concat(keep.map(([k, vv]) => [k, vv] as [string, string]));
          this.put({ t: 'mi', a: keep.map(([k, vv]) => [k, vv] as [string, string]), x: ch, g: tgt.g });
          this.mergeTarget = null;
          break;
        }
        putChar('mi', a, ch, {}, false);
        this.mergeReserved();
      }
    }
    this.afterTyped();
  }

  /** merge a just-typed run of letters into a recognised function name (sin, cos, tan, log, ln) */
  private mergeReserved(): void {
    const row = this.currentRow();
    const end = this.caret.index;
    for (const w of [...this.reservedWords].sort((a, b) => b.length - a.length)) {
      const start = end - w.length;
      if (start < 0) continue;
      let ok = true;
      for (let k = 0; k < w.length; k++) {
        const e = row[start + k];
        if (!e || e.t !== 'mi' || e.c !== undefined || (e.x ?? '') !== w[k] || e.a.length !== 0 || e.up) {
          ok = false;
          break;
        }
      }
      if (ok) {
        const g = newGroup();
        for (let k = 0; k < w.length; k++) row[start + k].g = g;
        return;
      }
    }
  }

  /** unwrap argument placeholders that received content and handle text slots */
  private afterTyped(): void {
    const path = this.caret.path;
    if (path.length) {
      const [i, s] = path[path.length - 1];
      const parentRow = tryRowAt(this.row, path.slice(0, -1));
      const par = parentRow?.[i];
      if (par && isPlaceholder(par) && s === 0) {
        const content = par.c![0];
        if (content.length) {
          const idx = i;
          parentRow!.splice(idx, 1, ...content);
          this.caret = { path: path.slice(0, -1), index: idx + this.caret.index };
        }
      }
    }
    this.normalizeScriptBase();
    this.emit();
  }

  /** a script applies to one element: extra elements typed into a base spill out of the structure */
  private normalizeScriptBase(): void {
    const { path } = this.caret;
    if (!path.length) return;
    const [i, s] = path[path.length - 1];
    if (s !== 0) return;
    const outer = path.slice(0, -1);
    const parentRow = tryRowAt(this.row, outer);
    const el = parentRow?.[i];
    if (!parentRow || !el || !el.c || el.c[0].length < 2) return;
    const base = el.c[0];
    if (el.t === 'msup' || el.t === 'msub' || el.t === 'msubsup') {
      const spill = base.splice(0, base.length - 1);
      parentRow.splice(i, 0, ...spill);
      this.caret = { path: [...outer, [i + spill.length, 0]], index: 1 };
      return;
    }
    if (el.t === 'mmultiscripts') {
      const post = el.cols ?? 0;
      const first = base[0];
      const last = base[base.length - 1];
      const middle = base.slice(1, base.length - 1);
      const preSlots = el.c.slice(1 + post);
      const postSlots = el.c.slice(1, 1 + post);
      const out: Row = [];
      const preHasContent = preSlots.some((r) => r.length > 0) || preSlots.length > 0;
      let caretIdx = 0;
      if (preSlots.length && preHasContent) {
        out.push({ t: 'mmultiscripts', a: [], c: [[first], ...preSlots], cols: 0 });
        caretIdx = 0;
      } else out.push(first);
      out.push(...middle);
      if (postSlots.length === 2) out.push({ t: 'msubsup', a: [], c: [[last], postSlots[0], postSlots[1]] });
      else if (postSlots.length) out.push({ t: 'mmultiscripts', a: [], c: [[last], ...postSlots], cols: post });
      else out.push(last);
      parentRow.splice(i, 1, ...out);
      this.caret = out[0].c ? { path: [...outer, [i, 0]], index: 1 } : { path: outer, index: i + 1 };
      void caretIdx;
    }
  }

  /* -------------------------------------------------------- modes etc. */
  /** Enter key */
  enter(): void {
    this.checkpoint();
    this.clearTransient();
    if (this.hasSelection()) this.takeSelection();
    const path = this.caret.path;
    // inside an elementary stack: a new row after the current one
    for (let d = path.length - 2; d >= 0; d--) {
      const [i] = path[d];
      const st = tryRowAt(this.row, path.slice(0, d))?.[i];
      if (st && st.t === 'mstack' && st.c) {
        const k = path[d + 1][0];
        st.c[0].splice(k + 1, 0, { t: 'msrow', a: [], c: [[]] });
        this.caret = { path: [...path.slice(0, d + 1), [k + 1, 0]], index: 0 };
        this.emit();
        return;
      }
    }
    // inside a table cell: a new row below the current one
    for (let d = path.length - 1; d >= 0; d--) {
      const [i, s] = path[d];
      const parentRow = tryRowAt(this.row, path.slice(0, d));
      const tbl = parentRow?.[i];
      if (tbl && tbl.t === 'mtable' && d === path.length - 1) {
        const cols = tbl.cols ?? 1;
        const r = Math.floor(s / cols);
        const c = s % cols;
        tbl.c!.splice((r + 1) * cols, 0, ...Array.from({ length: cols }, () => [] as Row));
        this.caret = { path: [...path.slice(0, -1), [i, (r + 1) * cols + c]], index: 0 };
        this.emit();
        return;
      }
    }
    // elsewhere the line break goes to the root row, after the structure that contains the caret
    if (path.length) {
      const top = path[0][0];
      this.row.splice(top + 1, 0, NEWLINE());
      this.caret = { path: [], index: top + 2 };
      this.emit();
      return;
    }
    const row = this.currentRow();
    row.splice(this.caret.index, 0, NEWLINE());
    this.caret.index++;
    this.emit();
  }

  /* ------------------------------------------------------- navigation */
  private navOrder(el: El): number[] {
    const n = el.c!.length;
    const ord = Array.from({ length: n }, (_, k) => k);
    if (el.t === 'mmultiscripts') {
      const post = el.cols ?? 0;
      // reading order: pre-scripts, base, post-scripts
      const pre = ord.slice(1 + post);
      return [...pre, 0, ...ord.slice(1, 1 + post)];
    }
    // visual order: index before radicand, overscript before base
    if (el.t === 'mroot') return [1, 0];
    if (el.t === 'mover') return [1, 0];
    if (el.t === 'munderover') return [2, 0, 1];
    return ord;
  }

  moveRight(extend = false): void {
    this.clearTransient();
    if (extend) return this.shiftStep(1);
    this.anchor = null;
    this.sel = null;
    this.stepRight();
    this.emit();
  }
  moveLeft(extend = false): void {
    this.clearTransient();
    if (extend) return this.shiftStep(-1);
    this.anchor = null;
    this.sel = null;
    this.stepLeft();
    this.emit();
  }

  private pos(): Caret {
    return { path: this.caret.path.map(([a, b]) => [a, b] as Step), index: this.caret.index };
  }

  private stepRight(): void {
    this.stepRightRaw();
    if (this.atScriptBaseStart()) this.stepRightRaw();
  }

  private stepLeft(): void {
    this.stepLeftRaw();
    if (this.atScriptBaseStart()) this.stepLeftRaw();
  }

  /** the start of the base of a script structure is not a caret stop (the base box is one stop) */
  private atScriptBaseStart(): boolean {
    const { path, index } = this.caret;
    if (!path.length || index !== 0) return false;
    const [i, s] = path[path.length - 1];
    if (s !== 0) return false;
    const parent = tryRowAt(this.row, path.slice(0, -1));
    const el = parent?.[i];
    if (!el || !(el.t === 'msup' || el.t === 'msub' || el.t === 'msubsup')) return false;
    return (el.c![0]?.length ?? 0) > 0;
  }

  /** the item of a stack level the caret travels into: rows are entered directly, groups are looked into */
  private descendStackItem(path: Step[], k: number, dir: 1 | -1): Caret | null {
    const level = rowAt(this.row, path);
    const it = level[k];
    if (!it || !it.c) return null;
    if (it.t === 'msrow') return { path: [...path, [k, 0]], index: dir === 1 ? 0 : it.c[0].length };
    if (it.t === 'msgroup') {
      const sub = [...path, [k, 0] as Step];
      const rows = it.c[0];
      for (let q = dir === 1 ? 0 : rows.length - 1; q >= 0 && q < rows.length; q += dir) {
        const r = this.descendStackItem(sub, q, dir);
        if (r) return r;
      }
    }
    return null;
  }

  /** leaving a row of an elementary stack: the next row is entered at once, only lines are stops of their own */
  private stackExit(pathIn: Step[], dir: 1 | -1): Caret {
    let level = pathIn.slice(0, -1);
    let k = pathIn[pathIn.length - 1][0];
    for (let guard = 0; guard < 16; guard++) {
      const items = rowAt(this.row, level);
      const nk = k + dir;
      if (nk >= 0 && nk < items.length) {
        const r = this.descendStackItem(level, nk, dir);
        if (r) return r;
        // an empty row is one with the gap next to it: the caret goes over that gap to the far side of the line
        const cur = items[k];
        const empty = cur && cur.t === 'msrow' && (cur.c?.[0] ?? []).length === 0;
        if (empty && items[nk].t === 'msline') return { path: level, index: dir === 1 ? nk + 1 : nk };
        return { path: level, index: dir === 1 ? nk : k };
      }
      // the end of this level: leave the group / stack
      const [e] = level[level.length - 1];
      const above = level.slice(0, -1);
      const owner = rowAt(this.row, above)[e];
      if (owner && owner.t === 'msgroup' && above.length > 0) {
        level = above;
        k = e;
        continue;
      }
      // a long division goes on with its quotient when the first row of the steps is left backwards
      if (owner && owner.t === 'mlongdiv' && dir === -1 && owner.c) return { path: [...above, [e, 1] as Step], index: owner.c[1].length };
      return { path: above, index: dir === 1 ? e + 1 : e };
    }
    return this.caret;
  }

  /** is the row at `path` the stack level (rows, lines, carries, groups) of a stack / long division? */
  private isStackLevel(path: Step[]): boolean {
    if (!path.length) return false;
    const [e, s] = path[path.length - 1];
    const owner = tryRowAt(this.row, path.slice(0, -1))?.[e];
    return !!owner && ((owner.t === 'mstack' && s === 0) || (owner.t === 'msgroup' && s === 0) || (owner.t === 'mlongdiv' && s === 2));
  }

  private stepRightRaw(): void {
    const row = this.currentRow();
    const { path } = this.caret;
    if (this.caret.index < row.length) {
      const el = row[this.caret.index];
      if (el.t === 'mstack' && el.c) {
        // the rows of an elementary stack are entered directly (the stack level is no stop)
        const base = [...path, [this.caret.index, 0] as Step];
        const r = this.descendStackItem(base, 0, 1);
        this.caret = r ?? { path: base, index: 0 };
        return;
      }
      if (el.c && navigable(el)) {
        const first = this.navOrder(el)[0];
        this.caret = { path: [...path, [this.caret.index, first]], index: 0 };
        return;
      }
      this.caret.index++;
      return;
    }
    if (!path.length) return;
    const [i, s] = path[path.length - 1];
    const parentRow = rowAt(this.row, path.slice(0, -1));
    const el = parentRow[i];
    if (el.t === 'msrow' && this.isStackLevel(path.slice(0, -1))) {
      this.caret = this.stackExit(path, 1);
      return;
    }
    const ord = this.navOrder(el);
    const k = ord.indexOf(s);
    if (k < ord.length - 1) {
      this.caret = { path: [...path.slice(0, -1), [i, ord[k + 1]]], index: 0 };
      // the items of a long division start with their first row
      if (el.t === 'mlongdiv' && ord[k + 1] === 2) this.caret = this.descendStackItem(this.caret.path, 0, 1) ?? this.caret;
    } else this.caret = { path: path.slice(0, -1), index: i + 1 };
  }

  private stepLeftRaw(): void {
    const row = this.currentRow();
    const { path } = this.caret;
    if (this.caret.index > 0) {
      const el = row[this.caret.index - 1];
      if (el.t === 'mstack' && el.c) {
        const base = [...path, [this.caret.index - 1, 0] as Step];
        const r = this.descendStackItem(base, el.c[0].length - 1, -1);
        this.caret = r ?? { path: base, index: el.c[0].length };
        return;
      }
      if (el.c && navigable(el)) {
        const ord = this.navOrder(el);
        const last = ord[ord.length - 1];
        const r = el.c[last];
        this.caret = { path: [...path, [this.caret.index - 1, last]], index: r.length };
        if (el.t === 'mlongdiv' && last === 2) this.caret = this.descendStackItem(this.caret.path, r.length - 1, -1) ?? this.caret;
        return;
      }
      this.caret.index--;
      return;
    }
    if (!path.length) return;
    const [i, s] = path[path.length - 1];
    const parentRow = rowAt(this.row, path.slice(0, -1));
    const el = parentRow[i];
    if (el.t === 'msrow' && this.isStackLevel(path.slice(0, -1))) {
      this.caret = this.stackExit(path, -1);
      return;
    }
    const ord = this.navOrder(el);
    const k = ord.indexOf(s);
    if (k > 0) {
      const t = ord[k - 1];
      this.caret = { path: [...path.slice(0, -1), [i, t]], index: el.c![t].length };
    } else this.caret = { path: path.slice(0, -1), index: i };
  }

  /** Shift+Arrow: the head moves over whole elements, never into structures */
  private anchor: Caret | null = null;
  private shiftStep(dir: 1 | -1): void {
    if (!this.anchor) this.anchor = this.pos();
    const row = this.currentRow();
    const { path, index } = this.caret;
    // the edge of a row of an elementary stack: the selection goes on over the neighbouring item of the stack
    if (path.length && ((dir === -1 && index === 0) || (dir === 1 && index === row.length))) {
      const parentPath = path.slice(0, -1);
      const [e] = path[path.length - 1];
      const level = tryRowAt(this.row, parentPath);
      if (level && level[e]?.t === 'msrow' && this.isStackLevel(parentPath) && this.anchor.path.length >= path.length && samePath(this.anchor.path.slice(0, path.length), path)) {
        this.anchor = { path: parentPath, index: dir === -1 ? e : e + 1 };
        this.caret = { path: parentPath, index: dir === -1 ? Math.max(0, e - 1) : Math.min(level.length, e + 2) };
        this.updateSelectionFromAnchor();
        this.emit();
        return;
      }
    }
    // inside a stack row an empty cell (none) is selected together with the element before it
    const inStackRow = path.length > 0 && tryRowAt(this.row, path.slice(0, -1))?.[path[path.length - 1][0]]?.t === 'msrow' && this.isStackLevel(path.slice(0, -1));
    if (dir === 1) {
      if (index < row.length) this.caret = { path, index: index + 1 };
      else if (path.length) this.caret = { path: path.slice(0, -1), index: path[path.length - 1][0] + 1 };
    } else if (index > 0) this.caret = { path, index: inStackRow && row[index - 1].t === 'none' && index > 1 ? index - 2 : index - 1 };
    else if (path.length) this.caret = { path: path.slice(0, -1), index: path[path.length - 1][0] };
    this.updateSelectionFromAnchor();
    this.emit();
  }

  /** build `sel` from anchor and caret (head) by lifting both to their lowest common row */
  private updateSelectionFromAnchor(): void {
    const a = this.anchor!;
    const h = this.caret;
    let k = 0;
    while (k < a.path.length && k < h.path.length && a.path[k][0] === h.path[k][0] && a.path[k][1] === h.path[k][1]) k++;
    const aLift = k < a.path.length;
    const hLift = k < h.path.length;
    const ai = aLift ? a.path[k][0] : a.index;
    const hi = hLift ? h.path[k][0] : h.index;
    // order: which one is first in document order
    const aFirst = ai < hi || (ai === hi && (aLift ? false : true) && !hLift);
    let from: number;
    let to: number;
    if (ai === hi && aLift && hLift) {
      // both inside the same structure but different slots: select the structure
      from = ai;
      to = ai + 1;
    } else if (aFirst) {
      from = ai;
      to = hLift ? hi + 1 : hi;
    } else {
      from = hLift ? hi : hi;
      to = aLift ? ai + 1 : ai;
    }
    if (from === to) {
      this.sel = null;
      return;
    }
    this.sel = { path: a.path.slice(0, k), from, to };
  }

  selectAll(): void {
    this.clearTransient();
    if (!this.row.length) {
      this.sel = null;
      return;
    }
    this.sel = { path: [], from: 0, to: this.row.length };
    this.caret = { path: [], index: this.row.length };
    this.anchor = { path: [], index: 0 };
    this.emit();
  }

  /** Home / End: start / end of the whole document (observed) */
  home(extend = false): void {
    this.clearTransient();
    if (extend && !this.anchor) this.anchor = this.pos();
    this.caret = { path: [], index: 0 };
    this.finishHomeEnd(extend);
  }
  end(extend = false): void {
    this.clearTransient();
    if (extend && !this.anchor) this.anchor = this.pos();
    this.caret = { path: [], index: this.row.length };
    this.finishHomeEnd(extend);
  }

  private finishHomeEnd(extend: boolean) {
    if (extend) this.updateSelectionFromAnchor();
    else {
      this.sel = null;
      this.anchor = null;
    }
    this.emit();
  }

  /* ------------------------------------------------------------ delete */
  /** structures that keep their base when removed by smart delete */
  private static readonly KEEP_BASE = new Set(['msup', 'msub', 'msubsup', 'mmultiscripts', 'munder', 'mover', 'munderover']);

  /** select a whole structure (smart delete mark: grey highlight, typing replaces it) */
  private markStructure(path: Step[], index: number): void {
    this.sel = { path, from: index, to: index + 1 };
    this.caret = { path, index: index + 1 };
    this.smart = true;
    this.anchor = null;
    this.emit();
  }

  private deleteSmartSelection(): void {
    const sel = this.sel!;
    const row = rowAt(this.row, sel.path);
    const el = row[sel.from];
    this.checkpoint();
    let repl: Row = [];
    if (el.c && EditorCore.KEEP_BASE.has(el.t) && el.c[0].length) repl = cloneRow(el.c[0]);
    row.splice(sel.from, 1, ...repl);
    this.caret = { path: sel.path, index: sel.from + repl.length };
    this.sel = null;
    this.smart = false;
    this.emit();
  }

  backspace(): void {
    if (this.hasSelection()) {
      if (this.smart && this.sel!.to - this.sel!.from === 1) {
        this.deleteSmartSelection();
        return;
      }
      this.checkpoint();
      this.takeSelection();
      this.emit();
      return;
    }
    const row = this.currentRow();
    const { path, index } = this.caret;
    if (index > 0) {
      const el = row[index - 1];
      if (el.c && navigable(el)) {
        this.markStructure(path, index - 1);
        return;
      }
      this.checkpoint();
      row.splice(index - 1, 1);
      this.caret.index = index - 1;
      this.emit();
      return;
    }
    if (path.length) {
      const sp = path.slice(0, -1);
      const [i] = path[path.length - 1];
      this.markStructure(sp, i);
    }
  }

  del(): void {
    if (this.hasSelection()) {
      if (this.smart && this.sel!.to - this.sel!.from === 1) {
        this.deleteSmartSelection();
        return;
      }
      this.checkpoint();
      this.takeSelection();
      this.emit();
      return;
    }
    const row = this.currentRow();
    const { path, index } = this.caret;
    if (index < row.length) {
      const el = row[index];
      if (el.c && navigable(el)) {
        this.markStructure(path, index);
        return;
      }
      this.checkpoint();
      row.splice(index, 1);
      this.emit();
      return;
    }
    if (path.length) {
      const sp = path.slice(0, -1);
      const [i] = path[path.length - 1];
      this.markStructure(sp, i);
    }
  }

  /* ------------------------------------------------------------ modes */
  toggleBold(): void {
    this.toggleStyle('bold');
  }
  toggleItalic(): void {
    this.toggleStyle('italic');
  }

  /** Bold / Italic on the selection or, without selection, on following input */
  private toggleStyle(kind: 'bold' | 'italic'): void {
    this.modes.lock = undefined;
    if (this.hasSelection()) {
      this.checkpoint();
      const sel = this.sel!;
      const row = rowAt(this.row, sel.path);
      const els = row.slice(Math.min(sel.from, sel.to), Math.max(sel.from, sel.to));
      const leaves: El[] = [];
      const collect = (e: El) => {
        if (e.c === undefined) leaves.push(e);
        else e.c.forEach((r) => r.forEach(collect));
      };
      els.forEach(collect);
      const tokens = leaves.filter((e) => e.t === 'mi' || e.t === 'mn' || e.t === 'mo' || e.t === 'mtext');
      const want = kind === 'bold' ? ['bold', 'bold-italic'] : ['italic', 'bold-italic'];
      const allOn = tokens.length > 0 && tokens.every((e) => want.includes(getAttr(e, 'mathvariant') ?? '') || (kind === 'italic' && e.t === 'mi' && this.modes.autoItalic && getAttr(e, 'mathvariant') === undefined));
      for (const e of tokens) this.applyVariant(e, kind, !allOn);
      this.modes[kind] = !allOn;
      this.emit();
      return;
    }
    this.modes[kind] = !this.modes[kind];
    this.emit();
  }

  private applyVariant(e: El, kind: 'bold' | 'italic', on: boolean): void {
    const cur = getAttr(e, 'mathvariant') ?? null;
    let bold = cur === 'bold' || cur === 'bold-italic';
    let italic = cur === 'italic' || cur === 'bold-italic';
    if (kind === 'bold') bold = on;
    else italic = on;
    const mi = e.t === 'mi';
    let v: string | null;
    if (bold && italic) v = 'bold-italic';
    else if (bold) v = mi && this.modes.autoItalic ? 'bold-italic' : 'bold';
    else if (italic) v = mi ? null : 'italic';
    else v = null;
    setAttr(e, 'mathvariant', v);
    if (mi) {
      e.g = newGroup();
      delete e.up;
    }
  }

  setAutoItalic(on: boolean): void {
    this.modes.lock = undefined;
    this.modes.autoItalic = on;
    this.emit();
  }
  setRegularText(on: boolean): void {
    this.modes.lock = undefined;
    if (this.hasSelection() && on) {
      this.checkpoint();
      const sel = this.sel!;
      const row = rowAt(this.row, sel.path);
      const from = Math.min(sel.from, sel.to);
      const els = row.slice(from, Math.max(sel.from, sel.to));
      const text = els.map((e) => leafText(e)).join('');
      const g = newGroup();
      const chars = Array.from(text).map((ch) => ({ t: 'mtext', a: [] as Attr[], x: ch, g }) as El);
      row.splice(from, els.length, ...chars);
      this.sel = { path: sel.path, from, to: from + chars.length };
      this.caret = { path: sel.path, index: from + chars.length };
      this.modes.text = true;
      this.emit();
      return;
    }
    this.modes.text = on;
    this.emit();
  }
  setColor(hex: string | null): void {
    const c = hex && hex.toUpperCase() !== '#000000' ? hex.toUpperCase() : null;
    if (this.hasSelection()) {
      this.checkpoint();
      const sel = this.sel!;
      const row = rowAt(this.row, sel.path);
      const paint = (e: El) => {
        if (e.c === undefined || e.t === 'mo' && e.c.length === 1) setAttr(e, 'mathcolor', c);
        if (e.c) e.c.forEach((r) => r.forEach(paint));
      };
      row.slice(Math.min(sel.from, sel.to), Math.max(sel.from, sel.to)).forEach(paint);
    }
    this.modes.color = c;
    this.emit();
  }
  setRtl(on: boolean, record = true): void {
    if (record) this.checkpoint();
    this.rtl = on;
    const i = this.attrs.findIndex(([k]) => k === 'dir');
    if (on && i < 0) this.attrs.unshift(['dir', 'rtl']);
    else if (!on && i >= 0) this.attrs.splice(i, 1);
    this.emit();
  }

  /** Font family of the whole equation (style attribute of <math>) */
  setFontFamily(v: string): void {
    this.checkpoint();
    const i = this.attrs.findIndex(([k]) => k === 'style');
    if (!v) {
      if (i >= 0) this.attrs.splice(i, 1);
    } else {
      const val = `font-family:${/\s/.test(v) ? `'${v}'` : v}`;
      if (i >= 0) this.attrs[i][1] = val;
      else this.attrs.unshift(['style', val]);
    }
    this.emit();
  }

  getFontFamily(): string {
    const st = getAttrList(this.attrs, 'style') ?? '';
    const m = /font-family:\s*'?([^';]+)'?/.exec(st);
    return m ? m[1].trim() : '';
  }

  /** Font size of the whole equation: <mstyle mathsize="Npx"> wrapper */
  setFontSize(px: number | null): void {
    this.checkpoint();
    const wrapped = this.row.length === 1 && this.row[0].t === 'mstyle' && getAttr(this.row[0], 'mathsize') !== undefined;
    if (px === null) {
      if (wrapped) {
        const inner = this.row[0].c![0];
        // caret path loses its first step
        if (this.caret.path.length && this.caret.path[0][0] === 0 && this.caret.path[0][1] === 0) this.caret = { path: this.caret.path.slice(1), index: this.caret.index };
        else this.caret = { path: [], index: inner.length };
        this.row = inner;
        this.sel = null;
      }
    } else if (wrapped) setAttr(this.row[0], 'mathsize', px + 'px');
    else {
      const w: El = { t: 'mstyle', a: [['mathsize', px + 'px']], c: [this.row] };
      this.caret = { path: [[0, 0], ...this.caret.path], index: this.caret.index };
      if (this.sel) this.sel = { ...this.sel, path: [[0, 0], ...this.sel.path] };
      this.row = [w];
    }
    this.emit();
  }

  getFontSize(): number | null {
    if (this.row.length === 1 && this.row[0].t === 'mstyle') {
      const v = getAttr(this.row[0], 'mathsize');
      if (v && /px$/.test(v)) return parseFloat(v);
    }
    return null;
  }

  setDigits(set: DigitSet): void {
    this.modes.digits = set;
    this.emit();
  }

  /** Ctrl+Shift+Arrow / contextual nudge buttons */
  nudge(dir: 'up' | 'down' | 'left' | 'right'): void {
    // the selected element, or the element before the caret when nothing is selected
    let path: Step[];
    let i: number;
    let saved = false;
    if (this.hasSelection()) {
      const sel = this.sel!;
      path = sel.path;
      i = Math.min(sel.from, sel.to);
      const n = Math.abs(sel.to - sel.from);
      if (n > 1) {
        // several elements: they move together inside one mpadded
        const r = rowAt(this.row, path);
        const part = r.slice(i, i + n);
        if (part.some((e) => e.t === 'mspace' && getAttr(e, 'linebreak') === 'newline')) return;
        this.checkpoint();
        saved = true;
        r.splice(i, n, { t: 'mpadded', a: [], c: [part] });
        this.sel = { path, from: i, to: i + 1 };
        this.caret = { path, index: i + 1 };
      }
    } else {
      path = this.caret.path;
      i = this.caret.index - 1;
      if (i < 0) return;
    }
    const row = rowAt(this.row, path);
    if (!row[i] || (row[i].t === 'mspace' && getAttr(row[i], 'linebreak') === 'newline')) return;
    if (!saved) this.checkpoint();
    let el = row[i];
    if (!(el.t === 'mpadded' && el.c)) {
      el = { t: 'mpadded', a: [], c: [[row[i]]] };
      row[i] = el;
    }
    const attr = dir === 'up' || dir === 'down' ? 'voffset' : 'lspace';
    const delta = dir === 'up' || dir === 'left' ? -1 : 1;
    const cur = parseInt((getAttr(el, attr) ?? '0').replace('px', ''), 10) || 0;
    const nv = cur + delta;
    const text = nv === 0 ? null : (nv > 0 ? '+' : '-') + Math.abs(nv) + 'px';
    setAttr(el, attr, text);
    this.emit();
  }

  /** ArrowUp / ArrowDown: nearest caret position above / below (geometry), otherwise structural */
  moveVertical(dir: 1 | -1, extend = false): void {
    this.clearTransient();
    if (extend) return;
    this.sel = null;
    this.anchor = null;
    const g = this.geometry;
    if (g && g.positions) {
      const cur = this.caret;
      const cx = g.xOf(cur);
      const cy = (g as any).yOf ? (g as any).yOf(cur) : null;
      if (cx !== null && cy !== null) {
        const all = g.positions();
        // candidates strictly above / below the caret baseline
        let hasNeighbour = false;
        // the stack level of an elementary stack (its lines are stops) belongs to the structure itself
        let stackDepth = 0;
        for (let d = cur.path.length - 1; d >= 0 && !hasNeighbour; d--) {
          const [i, sl] = cur.path[d];
          const el = rowAt(this.row, cur.path.slice(0, d))[i];
          if (['mfrac', 'mtable', 'munder', 'mover', 'munderover'].includes(el.t) && verticalNeighbor(el, sl, dir) !== null) hasNeighbour = true;
          // the rows of an elementary stack: the caret stays inside it
          if (el.t === 'mstack' || (el.t === 'mlongdiv' && sl === 2)) {
            hasNeighbour = true;
            stackDepth = d + 1;
          }
        }
        const cands: { p: (typeof all)[number]; dx: number; dy: number }[] = [];
        for (const p of all) {
          const dy = (p.y - cy) * dir; // positive = in the wanted direction
          if (dy <= 1) continue;
          if (p.path.length === cur.path.length && p.index === cur.index && samePath(p.path, cur.path)) continue;
          // an enclosing structure with a vertical neighbour slot wins over rows of its ancestors
          if (hasNeighbour && p.path.length < (stackDepth || cur.path.length) && samePath(p.path, cur.path.slice(0, p.path.length))) continue;
          cands.push({ p, dx: Math.abs(p.x - cx), dy });
        }
        // horizontal distance first (with a 1px tolerance), then the nearest line, then the exact x
        const minDx = cands.reduce((m, c) => Math.min(m, c.dx), Infinity);
        let best: (typeof cands)[number] | null = null;
        for (const c of cands) {
          if (c.dx > minDx + 1) continue;
          // lines half a pixel apart count as one line (the layout snaps baselines to the pixel grid)
          const sameLine = !!best && Math.abs(c.dy - best.dy) <= 0.6;
          if (!best || (!sameLine && c.dy < best.dy) || (sameLine && (c.p.x > best.p.x + 0.2 || (Math.abs(c.p.x - best.p.x) <= 0.2 && c.p.path.length > best.p.path.length)))) best = c;
        }
        if (best) {
          // root line movement: stay on the adjacent line
          this.caret = { path: best.p.path, index: best.p.index };
          this.emit();
          return;
        }
        this.emit();
        return;
      }
    }
    const { path } = this.caret;
    for (let d = path.length - 1; d >= 0; d--) {
      const [i, s] = path[d];
      const parentRow = rowAt(this.row, path.slice(0, d));
      const el = parentRow[i];
      const t = verticalNeighbor(el, s, dir);
      if (t !== null) {
        const target = el.c![t];
        const base = path.slice(0, d);
        const idx = Math.min(this.caret.index, target.length);
        this.caret = { path: [...base, [i, t]], index: idx };
        this.emit();
        return;
      }
    }
    this.emit();
  }

  /* ------------------------------------------------- pointer / clipboard API */
  setCaret(c: Caret): void {
    this.clearTransient();
    this.sel = null;
    this.anchor = null;
    this.caret = { path: c.path.map(([a, b]) => [a, b] as Step), index: c.index };
    this.emit();
  }

  /** selection between two caret positions (mouse drag) */
  selectRange(a: Caret, head: Caret): void {
    this.clearTransient();
    this.anchor = { path: a.path.map(([x, y]) => [x, y] as Step), index: a.index };
    this.caret = { path: head.path.map(([x, y]) => [x, y] as Step), index: head.index };
    this.updateSelectionFromAnchor();
    this.emit();
  }

  /** double / triple click: the whole run of elements of the clicked line */
  selectRun(at: Caret): void {
    this.clearTransient();
    const row = tryRowAt(this.row, at.path);
    if (!row || !row.length) return;
    let from = at.index;
    let to = at.index;
    if (at.path.length === 0) {
      while (from > 0 && !isNewline(row[from - 1])) from--;
      while (to < row.length && !isNewline(row[to])) to++;
    } else {
      from = 0;
      to = row.length;
    }
    if (from === to) return;
    // the head sits at the start: Shift+Left cannot shrink the selected run, Shift+Right can
    this.sel = { path: at.path, from, to };
    this.caret = { path: at.path, index: from };
    this.anchor = { path: at.path, index: to };
    this.emit();
  }

  /** serialised selection (clipboard) */
  selectionMathML(): string {
    if (!this.sel) return '';
    const r = tryRowAt(this.row, this.sel.path);
    if (!r) return '';
    const from = Math.min(this.sel.from, this.sel.to);
    const to = Math.max(this.sel.from, this.sel.to);
    return serializeMathML(cloneRow(r.slice(from, to)), []);
  }

  /** insert elements at the caret (replacing the selection); the caret ends after them or in the first cell */
  insertElement(el: El, caretInFirstCell = false): void {
    this.checkpoint();
    this.clearTransient();
    this.modes.text = false;
    if (this.hasSelection()) this.takeSelection();
    const row = this.currentRow();
    const idx = this.caret.index;
    row.splice(idx, 0, el);
    if (caretInFirstCell) {
      // descend to the first slot
      let path: Step[] = [...this.caret.path, [idx, 0]];
      let cur = el;
      for (;;) {
        const slot = cur.c?.[0];
        if (!slot) break;
        const first = slot[0];
        if (first && first.c && first.t === 'mtable') {
          path = [...path, [0, 0]];
          cur = first;
          continue;
        }
        break;
      }
      this.caret = { path, index: 0 };
    } else this.caret = { path: this.caret.path, index: idx + 1 };
    this.emit();
  }

  insertMathML(src: string): void {
    const d = parseMathML(src);
    this.checkpoint();
    this.clearTransient();
    if (this.hasSelection()) this.takeSelection();
    const row = this.currentRow();
    const idx = this.caret.index;
    const els = cloneRow(d.row);
    row.splice(idx, 0, ...els);
    this.caret = { path: this.caret.path, index: idx + els.length };
    this.emit();
  }

  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** short spoken description of the caret location (aria-live) */
  describeCaret(): string {
    const { path, index } = this.caret;
    const row = this.currentRow();
    if (!path.length) {
      if (row.length === 0) return 'empty expression';
      if (index >= row.length) return 'end expression';
      if (index === 0) return 'start expression';
      return 'expression';
    }
    const [i, s] = path[path.length - 1];
    const par = rowAt(this.row, path.slice(0, -1))[i];
    const pos = index >= row.length ? 'end' : index === 0 ? 'start' : '';
    const names: Record<string, string[]> = {
      mfrac: ['numerator', 'denominator'],
      msqrt: ['square root'],
      mroot: ['root', 'index'],
      msup: ['base', 'superscript'],
      msub: ['base', 'subscript'],
      msubsup: ['base', 'subscript', 'superscript'],
      munder: ['base', 'underscript'],
      mover: ['base', 'overscript'],
      munderover: ['base', 'underscript', 'overscript'],
      mfenced: ['parentheses'],
      menclose: ['enclosure'],
    };
    let name = (names[par.t] ?? [par.t])[s] ?? par.t;
    if (par.t === 'mtable') {
      const cols = par.cols ?? 1;
      name = `row ${Math.floor(s / cols) + 1} column ${(s % cols) + 1}`;
    } else if (par.t === 'mfenced') {
      const open = getAttr(par, 'open') ?? '(';
      name = open === '[' ? 'square brackets' : open === '{' ? 'curly brackets' : open === '|' ? 'vertical bars' : 'parentheses';
    }
    return `${name} ${pos}`.trim();
  }

  plainText(): string {
    const walk = (r: Row): string => r.map(one).join('');
    const arg = (r: Row) => {
      const t = walk(r);
      return r.length > 1 ? '(' + t + ')' : t;
    };
    const one = (e: El): string => {
      if (e.c === undefined) return e.t === 'mspace' ? (getAttr(e, 'linebreak') === 'newline' ? '\n' : ' ') : e.x === '\u00A0' ? ' ' : e.x ?? '';
      const c = e.c;
      switch (e.t) {
        case 'mfrac':
          return `${arg(c[0])}/${arg(c[1])}`;
        case 'msqrt':
          return `\u221A(${walk(c[0])})`;
        case 'mroot':
          return `root(${walk(c[1])}, ${walk(c[0])})`;
        case 'msup':
          return `${walk(c[0])}^${arg(c[1])}`;
        case 'msub':
          return `${walk(c[0])}_${arg(c[1])}`;
        case 'msubsup':
          return `${walk(c[0])}_${arg(c[1])}^${arg(c[2])}`;
        case 'munder':
          return `${walk(c[0])}_${arg(c[1])}`;
        case 'mover':
          return `${walk(c[0])}^${arg(c[1])}`;
        case 'munderover':
          return `${walk(c[0])}_${arg(c[1])}^${arg(c[2])}`;
        case 'mfenced': {
          const o = getAttr(e, 'open') ?? '(';
          const cl = getAttr(e, 'close') ?? ')';
          return o + c.map(walk).join(getAttr(e, 'separators') ?? ',') + cl;
        }
        case 'mtable': {
          const cols = e.cols ?? 1;
          const rows: string[] = [];
          for (let r = 0; r < c.length; r += cols) rows.push(c.slice(r, r + cols).map(walk).join(','));
          return '[' + rows.join(';') + ']';
        }
        default:
          return c.map(walk).join('');
      }
    };
    return walk(this.row);
  }

  /** run a toolbar control from the catalogue */
  activate(ctl: { id: string; A?: string; A2?: string; B?: string; C?: string }): void {
    if (!ctl.A) return;
    const spec = this.getSpec(ctl.id, { A: ctl.A, A2: ctl.A2, B: ctl.B, C: ctl.C });
    this.insertSpec(spec);
  }
}


const ARABIC_FN: Record<string, string> = { sin: 'جا', cos: 'جتا', tan: 'ظا', log: 'لو', ln: 'لط', csc: 'قتا', sec: 'قا', cot: 'ظتا' };

/** right-to-left editing writes function names in Arabic (arcsin → sin⁻¹); root-level indices are re-mapped */
function rtlize(spec: InsertSpec): InsertSpec {
  const idxMap: number[] = [];
  const mapRow = (r: Row, top: boolean): Row => {
    const out: Row = [];
    let i = 0;
    while (i < r.length) {
      const e = r[i];
      if (e.c === undefined && e.t === 'mi' && e.g !== undefined && e.x !== undefined) {
        let j = i;
        let text = '';
        while (j < r.length && r[j].c === undefined && r[j].t === 'mi' && r[j].g === e.g) text += r[j++].x ?? '';
        const inv = /^arc(sin|cos|tan)$/.exec(text);
        const fn = inv ? inv[1] : text;
        if (ARABIC_FN[fn] && /^[a-z]+$/.test(text)) {
          const letters: El[] = Array.from(ARABIC_FN[fn]).map((ch) => ({ t: 'mi', a: e.a.map((p) => [...p] as [string, string]), x: ch, g: e.g }));
          const start = out.length;
          if (inv) {
            const exp: Row = [{ t: 'mo', a: [], x: '-', g: newGroup() }, { t: 'mn', a: [], x: '1', g: newGroup() }];
            out.push({ t: 'msup', a: [], c: [letters, exp] });
          } else out.push(...letters);
          if (top) for (let k = i; k < j; k++) idxMap[k] = start;
          i = j;
          continue;
        }
      }
      if (top) idxMap[i] = out.length;
      const c = e.c ? { ...e, c: e.c.map((rr) => mapRow(rr, false)) } : e;
      out.push(c);
      i++;
    }
    if (top) idxMap[r.length] = out.length;
    return out;
  };
  const tree = mapRow(spec.tree, true);
  const fix = <T extends { path: Step[]; index: number } | null>(s: T): T => {
    if (!s) return s;
    if (s.path.length === 0) return { ...s, index: idxMap[s.index] ?? s.index } as T;
    const [first, ...rest] = s.path;
    return { ...s, path: [[idxMap[first[0]] ?? first[0], first[1]] as Step, ...rest] } as T;
  };
  return { ...spec, tree, caret: fix(spec.caret as any) as any, sel: fix(spec.sel as any) as any, takePrev: fix(spec.takePrev as any) as any };
}

function scriptOf(ch: string): string {
  if (/\p{Script=Hebrew}/u.test(ch)) return 'hebrew';
  if (/\p{Script=Han}/u.test(ch)) return 'han';
  if (/\p{Script=Hiragana}/u.test(ch)) return 'hiragana';
  if (/\p{Script=Katakana}/u.test(ch)) return 'katakana';
  if (/\p{Script=Hangul}/u.test(ch)) return 'hangul';
  return 'other';
}

function leafText(e: El): string {
  if (e.c === undefined) return e.x ?? '';
  if (e.t === 'mo' && e.c.length === 1) return e.c[0].map(leafText).join('');
  return e.c.map((r) => r.map(leafText).join('')).join('');
}

function verticalNeighbor(el: El, s: number, dir: 1 | -1): number | null {
  const n = el.c!.length;
  switch (el.t) {
    case 'mfrac':
      return dir === 1 && s === 0 ? 1 : dir === -1 && s === 1 ? 0 : null;
    case 'mtable': {
      const cols = el.cols ?? 1;
      const t = s + dir * cols;
      return t >= 0 && t < n ? t : null;
    }
    case 'munder':
      return dir === 1 && s === 0 ? 1 : dir === -1 && s === 1 ? 0 : null;
    case 'mover':
      return dir === -1 && s === 0 ? 1 : dir === 1 && s === 1 ? 0 : null;
    case 'munderover':
      // slots: base, under, over
      if (dir === 1) return s === 0 ? 1 : s === 2 ? 0 : null;
      return s === 0 ? 2 : s === 1 ? 0 : null;
    case 'msub':
      return dir === 1 && s === 0 ? 1 : dir === -1 && s === 1 ? 0 : null;
    case 'msup':
      return dir === -1 && s === 0 ? 1 : dir === 1 && s === 1 ? 0 : null;
    case 'msubsup':
      // slots: base, sub, sup
      if (dir === -1) return s === 0 ? 2 : s === 1 ? 0 : null;
      return s === 0 ? 1 : s === 2 ? 0 : null;
    case 'mroot':
      return dir === -1 && s === 0 ? 1 : dir === 1 && s === 1 ? 0 : null;
    default:
      return null;
  }
}

function getAttrList(a: Attr[], k: string): string | undefined {
  for (const [n, v] of a) if (n === k) return v;
  return undefined;
}

/** structures into which the caret may enter (everything with slots, except wrappers that are atomic) */
export function navigable(el: El): boolean {
  if (!el.c) return false;
  if (el.t === 'mo' && el.c.length === 1) return true; // empty big operator text slot
  return true;
}

function canBeBase(el: El): boolean {
  return !isNewline(el);
}

export { MathMLError };
