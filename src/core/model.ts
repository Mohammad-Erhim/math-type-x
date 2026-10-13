/**
 * Document model of the equation editor.
 *
 * The document is a MathML-shaped tree that is normalised for editing:
 *  - a *token* element (mi, mn, mo, mtext, mspace, none, msline …) carries text and no slots;
 *  - a *structure* element owns a fixed list of *slots*; each slot is a row (array) of elements.
 *    Serialisation re-creates the MathML child layout of the element (see ./mathml.ts).
 *
 * Positions inside the document are expressed by {@link Caret} (path + index).
 */

export type Attr = [string, string];

export interface El {
  /** element name, e.g. "mi", "mfrac" */
  t: string;
  /** attributes in serialisation order */
  a: Attr[];
  /** text content of token elements */
  x?: string;
  /** slots (rows) of structure elements */
  c?: El[][];
  /** number of columns of an mtable (cells are stored row-major in `c`) */
  cols?: number;
  /** group id: adjacent token characters with the same group (and tag and attributes) are serialised as one element */
  g?: number;
  /** typed with Automatic italic off: a single-letter group is written with mathvariant="normal" */
  up?: boolean;
}

let groupSeq = 1;
export function newGroup(): number {
  return groupSeq++;
}

export type Row = El[];

/** Elements that carry text and have no slots. */
export const TOKENS = new Set(['mi', 'mn', 'mo', 'mtext', 'ms', 'mspace', 'none', 'mprescripts', 'msline', 'mglyph']);

export function isToken(e: El): boolean {
  return e.c === undefined;
}

export function tok(t: string, x: string, a: Attr[] = []): El {
  return { t, a, x };
}

export function st(t: string, slots: El[][], a: Attr[] = [], extra: Partial<El> = {}): El {
  return { t, a, c: slots, ...extra };
}

export function cloneEl(e: El): El {
  const r: El = { t: e.t, a: e.a.map(([k, v]) => [k, v] as Attr) };
  if (e.x !== undefined) r.x = e.x;
  if (e.c) r.c = e.c.map(cloneRow);
  if (e.cols !== undefined) r.cols = e.cols;
  if (e.g !== undefined) r.g = e.g;
  if (e.up) r.up = true;
  return r;
}

export function cloneRow(r: Row): Row {
  return r.map(cloneEl);
}

export function getAttr(e: El, k: string): string | undefined {
  for (const [n, v] of e.a) if (n === k) return v;
  return undefined;
}

export function setAttr(e: El, k: string, v: string | null, order?: string[]): void {
  const i = e.a.findIndex(([n]) => n === k);
  if (v === null) {
    if (i >= 0) e.a.splice(i, 1);
    return;
  }
  if (i >= 0) e.a[i][1] = v;
  else e.a.push([k, v]);
  if (order) sortAttrs(e, order);
}

export function sortAttrs(e: El, order: string[]): void {
  const idx = (n: string) => {
    const i = order.indexOf(n);
    return i < 0 ? 1000 : i;
  };
  e.a = e.a
    .map((p, i) => ({ p, i }))
    .sort((u, v) => idx(u.p[0]) - idx(v.p[0]) || u.i - v.i)
    .map((o) => o.p);
}

/* ---------------------------------------------------------------- positions */

/** One step into a structure: element index in the current row, slot index in that element. */
export type Step = [number, number];

export interface Caret {
  path: Step[];
  index: number;
}

export interface Selection {
  /** row that contains the selected range */
  path: Step[];
  from: number;
  to: number;
}

export function samePath(a: Step[], b: Step[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  return true;
}

/** Resolve the row addressed by a path (root row is `doc`). */
export function rowAt(root: Row, path: Step[]): Row {
  let row = root;
  for (const [i, s] of path) {
    const el = row[i];
    if (!el || !el.c || !el.c[s]) throw new Error('bad path');
    row = el.c[s];
  }
  return row;
}

export function tryRowAt(root: Row, path: Step[]): Row | null {
  let row = root;
  for (const [i, s] of path) {
    const el = row[i];
    if (!el || !el.c || !el.c[s]) return null;
    row = el.c[s];
  }
  return row;
}

export function isEmptyRow(r: Row): boolean {
  return r.length === 0;
}

/** Visit every element (depth first, document order). */
export function walk(root: Row, fn: (e: El, path: Step[], index: number, row: Row) => void, path: Step[] = []): void {
  root.forEach((e, i) => {
    fn(e, path, i, root);
    if (e.c) e.c.forEach((r, s) => walk(r, fn, [...path, [i, s]]));
  });
}

export function countNodes(root: Row): number {
  let n = 0;
  walk(root, () => n++);
  return n;
}
