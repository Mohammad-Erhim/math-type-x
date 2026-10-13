/**
 * Data-driven insertion specs. Each toolbar control carries the MathML observed in four states
 * (A empty editor, A2 typed "7" afterwards, B after "x", C "x" selected); the spec that reproduces
 * those states is derived from them (SRS 8.1 principle 4).
 */
import { El, Row, Step, cloneRow, getAttr } from './model';
import { parseMathML, serializeMathML } from './mathml';

export interface Slot {
  path: Step[];
  index: number;
  /** true when the target slot holds an argument placeholder (maction[argument]) that is replaced */
  replace: boolean;
}

export interface InsertSpec {
  /** elements inserted at the caret (root level) */
  tree: Row;
  /** caret position after insertion (relative to `tree`, path[0][0] is an index into `tree`) */
  caret: Slot | null;
  /** true when the caret ends after the inserted elements */
  caretAfter: boolean;
  /** where the selection goes; null → the selection is simply replaced */
  sel: Slot | null;
  /** when set, the element before the caret becomes content of this slot (script bases) */
  takePrev: Slot | null;
  /** ids of derivation problems */
  problems: string[];
}

export interface CasesIn {
  A: string;
  A2?: string;
  B?: string;
  C?: string;
}

const X = (): El => ({ t: 'mi', a: [], x: 'x' });

export function isPlaceholder(e: El | undefined): boolean {
  return !!e && e.t === 'maction' && getAttr(e, 'actiontype') === 'argument';
}

/** every insertion point of `tree` as {path,index,replace} */
function candidates(tree: Row): Slot[] {
  const out: Slot[] = [];
  const visit = (row: Row, path: Step[]) => {
    for (let i = 0; i <= row.length; i++) out.push({ path, index: i, replace: false });
    row.forEach((e, i) => {
      if (isPlaceholder(e) && e.c![0].length === 0) out.push({ path, index: i, replace: true });
      if (e.c) e.c.forEach((r, s) => visit(r, [...path, [i, s]]));
    });
  };
  visit(tree, []);
  return out;
}

function rowByPath(tree: Row, path: Step[]): Row {
  let r = tree;
  for (const [i, s] of path) r = r[i].c![s];
  return r;
}

export function applySlot(tree: Row, slot: Slot, marker: Row): Row {
  const t = cloneRow(tree);
  const row = rowByPath(t, slot.path);
  if (slot.replace) row.splice(slot.index, 1, ...cloneRow(marker));
  else row.splice(slot.index, 0, ...cloneRow(marker));
  return t;
}

const ser = (r: Row) => serializeMathML(r, [], { xmlns: false });

function locate(tree: Row, target: Row, marker: Row, prefer?: (s: Slot) => number): Slot | null {
  const want = ser(target);
  const found: Slot[] = [];
  for (const c of candidates(tree)) {
    if (ser(applySlot(tree, c, marker)) === want) found.push(c);
  }
  if (!found.length) return null;
  if (prefer) found.sort((a, b) => prefer(a) - prefer(b));
  return found[0];
}

export function deriveSpec(cs: CasesIn): InsertSpec {
  const problems: string[] = [];
  const rowOf = (m?: string) => (m ? parseMathML(m.includes('xmlns') ? m : m.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"')).row : null);
  const A = rowOf(cs.A)!;
  const A2 = rowOf(cs.A2);
  const B = rowOf(cs.B);
  const C = rowOf(cs.C);
  const spec: InsertSpec = { tree: A, caret: null, caretAfter: false, sel: null, takePrev: null, problems };
  const seven: Row = [{ t: 'mn', a: [], x: '7' }];
  if (A2) {
    const hit = locate(A, A2, seven);
    if (!hit) problems.push('A2');
    else if (hit.path.length === 0 && hit.index === A.length && !hit.replace) spec.caretAfter = true;
    else spec.caret = hit;
  }
  // C: selection
  if (C) {
    if (ser(C) === ser(A)) spec.sel = null;
    else {
      const hit = locate(A, C, [X()]);
      if (hit) spec.sel = hit;
      else {
        // the selection replaces the template at root (symbols): C === A
        problems.push('C');
      }
    }
  }
  // B: base taking
  if (B) {
    const norm = ser([X(), ...cloneRow(A)]);
    if (ser(B) !== norm) {
      const hit = locate(A, B, [X()]);
      if (hit) spec.takePrev = hit;
      else problems.push('B');
    }
  }
  return spec;
}
