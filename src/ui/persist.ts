/**
 * Keeps the editor's state in the browser (local storage) so that a reload, a closed tab or a swipe back loses nothing:
 * the formula (which carries font family, size and direction), the active toolbar tab, the typing modes and the output
 * format of the output panel. One JSON record under one key, versioned; anything unreadable is ignored.
 */
export interface Modes {
  bold?: boolean;
  italic?: boolean;
  autoItalic?: boolean;
  text?: boolean;
  arabicLigature?: boolean;
  digits?: 'western' | 'arabicIndic' | 'easternArabicIndic';
  /** the digits were chosen with the toolbar (not the default of the language / direction / font) */
  digitsChosen?: boolean;
  color?: string | null;
}

export interface Saved {
  v: 1;
  mml?: string;
  tab?: number;
  modes?: Modes;
  output?: string;
  /** the editor language the record was made in: typing defaults of another language are not carried over */
  lang?: string;
}

/** a formula larger than this is not kept (storage quotas are a few MB for the whole origin) */
const MAX_MML = 200_000;
const DIGITS = ['western', 'arabicIndic', 'easternArabicIndic'];

/** keep only what has the right shape: a hand-edited or older record never breaks the editor */
export function sanitize(raw: unknown): Saved | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1) return null;
  const out: Saved = { v: 1 };
  if (typeof r.mml === 'string' && r.mml.length <= MAX_MML && /^\s*<math[\s>/]/.test(r.mml)) out.mml = r.mml;
  if (typeof r.tab === 'number' && Number.isInteger(r.tab) && r.tab >= 0 && r.tab <= 8) out.tab = r.tab;
  if (typeof r.output === 'string' && /^[a-z]{1,16}$/.test(r.output)) out.output = r.output;
  if (typeof r.lang === 'string' && /^[A-Za-z_-]{2,12}$/.test(r.lang)) out.lang = r.lang;
  if (r.modes && typeof r.modes === 'object') {
    const m = r.modes as Record<string, unknown>;
    const o: Modes = {};
    for (const k of ['bold', 'italic', 'autoItalic', 'text', 'arabicLigature', 'digitsChosen'] as const) if (typeof m[k] === 'boolean') o[k] = m[k] as boolean;
    if (typeof m.digits === 'string' && DIGITS.includes(m.digits)) o.digits = m.digits as Modes['digits'];
    if (m.color === null || (typeof m.color === 'string' && /^#[0-9a-fA-F]{3,8}$|^[a-zA-Z]{3,20}$/.test(m.color))) o.color = m.color as string | null;
    out.modes = o;
  }
  return out;
}

export class Store {
  private cur: Saved = { v: 1 };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  /** false once a write failed (private window, quota, blocked storage): the page then keeps its own confirmation */
  ok = true;

  constructor(readonly key: string) {}

  /** the saved record, or null (nothing saved, unreadable, storage blocked) */
  read(): Saved | null {
    try {
      const s = sanitize(JSON.parse(localStorage.getItem(this.key) ?? 'null'));
      if (s) this.cur = { ...s };
      return s;
    } catch {
      this.ok = false;
      return null;
    }
  }

  /** remember `patch`; the record is written once the changes pause (`wait` ms), or at once with flush() */
  set(patch: Partial<Omit<Saved, 'v'>>, wait = 250): void {
    this.cur = { ...this.cur, ...patch, v: 1 };
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = wait > 0 ? setTimeout(() => this.flush(), wait) : null;
    if (wait <= 0) this.flush();
  }

  flush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.dirty) return;
    this.dirty = false;
    try {
      localStorage.setItem(this.key, JSON.stringify(this.cur));
      this.ok = true;
    } catch {
      this.ok = false;
    }
  }

  clear(): void {
    this.cur = { v: 1 };
    this.dirty = false;
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* nothing to clear */
    }
  }
}
