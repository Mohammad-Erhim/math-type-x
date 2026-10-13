/** Classification of typed characters into MathML tokens (SRS EDT-003…007, Appendix E). */
import { El, Attr } from './model';
import { zulfiSymbol } from '../layout/zulfi';

export type DigitSet = 'western' | 'arabicIndic' | 'easternArabicIndic';

/** the digits a language types by default: Arabic-Indic for every Arabic language, Eastern Arabic-Indic for Persian,
 * Pashto and Urdu (`eastern`), Western otherwise; `arabicIndic` lists further languages that use the Arabic-Indic set */
export function digitsForLanguage(lang: string, arabicIndic: string[] = [], eastern: string[] = []): DigitSet {
  const l = (lang || 'en').toLowerCase().replace('-', '_');
  if (eastern.includes(l)) return 'easternArabicIndic';
  return /^ar(_|$)/.test(l) || arabicIndic.includes(l) ? 'arabicIndic' : 'western';
}

export interface TypeModes {
  bold: boolean;
  italic: boolean;
  autoItalic: boolean;
  arabicLigature: boolean;
  color: string | null;
  digits: DigitSet;
  /** set after a toolbar insertion while bold / italic is on: typed tokens get exactly this variant */
  lock?: { v: string | null };
}

/** typed letters that form one function name: the Latin names and their Arabic counterparts (جا جتا ظل لو لط) */
export const RESERVED_WORDS = ['sin', 'cos', 'tan', 'log', 'ln', '\u062C\u0627', '\u062C\u062A\u0627', '\u0638\u0644', '\u0644\u0648', '\u0644\u0637'];

const DIGIT_BASE: Record<DigitSet, number> = { western: 0x30, arabicIndic: 0x660, easternArabicIndic: 0x6f0 };

export function mapDigit(ch: string, set: DigitSet): string {
  if (ch >= '0' && ch <= '9') return String.fromCharCode(DIGIT_BASE[set] + (ch.charCodeAt(0) - 0x30));
  return ch;
}

const reDigit = /^\p{Nd}$/u;
const reLetter = /^\p{L}$/u;
const reArabic = /^\p{Script=Arabic}$/u;
const reGreek = /^\p{Script=Greek}$/u;
const reCjkHeb = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Hebrew}]$/u;

export type CharClass = 'digit' | 'letter' | 'arabic' | 'cjk' | 'greek' | 'space' | 'op' | 'under';

export function classify(ch: string): CharClass {
  if (ch === ' ' || ch === ' ') return 'space';
  if (ch === '_') return 'under';
  if (ch === '\u210F') return 'op'; // the reference types the reduced Planck constant as an operator
  if (reDigit.test(ch)) return 'digit';
  // the Arabic blocks: letters, marks and punctuation of the basic / supplement blocks are identifiers (mi), the signs
  // U+0600–060F and every presentation form are operators (recorded with tools/probe_ar_classify.js)
  const cp = ch.codePointAt(0)!;
  if ((cp >= 0x610 && cp <= 0x6ff) || (cp >= 0x750 && cp <= 0x77f) || (cp >= 0x8a0 && cp <= 0x8ff)) return 'arabic';
  // the Arabic mathematical symbols (private use): identifiers or operators as their table says
  const zs = zulfiSymbol(cp);
  if (zs) return zs.m === 'mi' ? 'arabic' : 'op';
  if (cp >= 0x600 && cp <= 0x60f) return 'op';
  if ((cp >= 0xfb50 && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff) || (cp >= 0x1ee00 && cp <= 0x1eeff)) return 'op';
  if (reArabic.test(ch) && reLetter.test(ch)) return 'arabic';
  if (reCjkHeb.test(ch)) return 'cjk';
  if (reGreek.test(ch) && reLetter.test(ch)) return 'greek';
  if (reLetter.test(ch)) return 'letter';
  return 'op';
}

/** Letterlike symbols (ℝ, ℂ …) are letters but upright: the reference writes mathvariant="normal". */
export function isLetterlike(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  return (cp >= 0x2100 && cp <= 0x214f && cp !== 0x2118) || (cp >= 0x1d400 && cp <= 0x1d7ff);
}

export function styleAttrs(kind: 'mi' | 'mn' | 'mo' | 'mtext', m: TypeModes, extra: Attr[] = []): Attr[] {
  const a: Attr[] = [];
  const mv = variant(kind, m);
  if (mv) a.push(['mathvariant', mv]);
  if (m.color) a.push(['mathcolor', m.color]);
  return [...extra.filter(([k]) => k !== 'mathvariant' || !mv), ...a];
}

function variant(kind: string, m: TypeModes): string | null {
  if (m.lock) return m.lock.v;
  if (m.bold && m.italic) return 'bold-italic';
  if (m.bold) return kind === 'mi' && m.autoItalic ? 'bold-italic' : 'bold';
  if (m.italic) return kind === 'mi' ? null : 'italic';
  return null;
}

export function sameStyle(e: El, attrs: Attr[]): boolean {
  const norm = (a: Attr[]) =>
    a
      .filter(([k]) => k === 'mathvariant' || k === 'mathcolor')
      .map(([k, v]) => k + '=' + v)
      .sort()
      .join(';');
  return norm(e.a) === norm(attrs);
}
