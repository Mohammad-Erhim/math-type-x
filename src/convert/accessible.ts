/** accessible2mathml: inverse of mathml2accessible for the supported phrase grammar (SVC-005). */
import symbols from '../data/symbols.json';
import { escText } from '../core/mathml';
import { EN, EN_TEMPLATES, packFor, SpeechPack } from './speech-lang';
import { FENCE_NAMES } from './speech';

const SYM = symbols as unknown as Record<string, [string | null, string | null]>;
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';

interface Phrase {
  words: string[];
  tag: string;
  text: string;
  mv: string;
}
const PHRASES: Phrase[] = [];
{
  const seen = new Set<string>();
  for (const [key, v] of Object.entries(SYM)) {
    if (!v[0]) continue;
    const [tag, mv, text] = key.split('|');
    if (seen.has(v[0])) continue;
    seen.add(v[0]);
    PHRASES.push({ words: v[0].split(/\s+/), tag, text, mv });
  }
  const extra: [string, string, string][] = [
    ['left parenthesis', 'mo', '('], ['right parenthesis', 'mo', ')'], ['open parenthesis', 'mo', '('], ['close parenthesis', 'mo', ')'],
    ['left square bracket', 'mo', '['], ['right square bracket', 'mo', ']'], ['left curly bracket', 'mo', '{'], ['right curly bracket', 'mo', '}'],
    ['open bracket', 'mo', '['], ['close bracket', 'mo', ']'], ['open brace', 'mo', '{'], ['close brace', 'mo', '}'],
    ['comma', 'mo', ','], ['point', 'mo', '.'], ['semicolon', 'mo', ';'], ['colon', 'mo', ':'], ['factorial', 'mo', '!'], ['vertical bar', 'mo', '|'],
    ['plus', 'mo', '+'], ['minus', 'mo', '-'], ['equals', 'mo', '='], ['less than', 'mo', '<'], ['greater than', 'mo', '>'], ['divided by', 'mo', '/'],
    ['plus or minus', 'mo', '±'], ['prime', 'mo', "'"], ['degree', 'mo', '°'], ['percent sign', 'mo', '%'],
  ];
  for (const [p, tag, text] of extra) PHRASES.push({ words: p.split(' '), tag, text, mv: '' });
}
PHRASES.sort((a, b) => b.words.length - a.words.length);
const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ',
  omicron: 'ο', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
};
const FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'sinh', 'cosh', 'tanh', 'log', 'ln', 'exp', 'min', 'max', 'lim']);
const ORD: Record<string, string> = { cube: '3', fourth: '4', fifth: '5', sixth: '6', seventh: '7', eighth: '8', ninth: '9', tenth: '10' };
const FENCES: Record<string, [string, string]> = { parentheses: ['(', ')'], 'square brackets': ['[', ']'], 'curly brackets': ['{', '}'], 'vertical bar': ['|', '|'], 'vertical bars': ['|', '|'] };

const tok = (tag: string, text: string, mv = '') => `<${tag}${mv ? ` mathvariant="${mv}"` : ''}>${escText(text)}</${tag}>`;
const row = (xs: string[]) => (xs.length === 1 ? xs[0] : `<mrow>${xs.join('')}</mrow>`);

class Parser {
  constructor(private w: string[]) {}
  i = 0;
  private at(...p: string[]): boolean {
    return p.every((x, k) => this.w[this.i + k] === x);
  }
  private match(p: string): boolean {
    const ws = p.split(' ');
    if (this.at(...ws)) {
      this.i += ws.length;
      return true;
    }
    return false;
  }
  private stopAt(stops: string[]): boolean {
    return stops.some((s) => this.at(...s.split(' ')));
  }

  seq(stops: string[]): string[] {
    const out: string[] = [];
    while (this.i < this.w.length && !this.stopAt(stops)) {
      const a = this.item();
      if (a === null) break;
      out.push(a);
    }
    return out;
  }

  /** an argument: a complex one is closed by `end` marker, otherwise a single atom */
  private arg(end: string): string {
    const open = this.w[this.i - 1];
    // look for the matching end marker with depth counting
    let depth = 1;
    let found = -1;
    for (let k = this.i; k < this.w.length; k++) {
      if (this.w[k] === open) depth++;
      if (this.w[k] === 'end' && this.w[k + 1] === end) {
        depth--;
        if (depth === 0) {
          found = k;
          break;
        }
      }
    }
    if (found >= 0) {
      const xs = this.seq(['end ' + end]);
      this.match('end ' + end);
      return row(xs);
    }
    return this.atomWithPostfix() ?? '<mrow/>';
  }

  private atomWithPostfix(): string | null {
    let a = this.atom();
    if (a === null) return null;
    for (;;) {
      if (this.match('squared')) a = `<msup>${a}<mn>2</mn></msup>`;
      else if (this.match('cubed')) a = `<msup>${a}<mn>3</mn></msup>`;
      else if (this.match('to the power of')) a = `<msup>${a}${this.arg('exponent')}</msup>`;
      else if (this.match('subscript')) {
        const sub = this.arg('subscript');
        if (this.match('superscript')) a = `<msubsup>${a}${sub}${this.arg('superscript')}</msubsup>`;
        else a = `<msub>${a}${sub}</msub>`;
      } else if (this.match('superscript')) a = `<msup>${a}${this.arg('superscript')}</msup>`;
      else if (this.match('with bar on top')) a = `<mover>${a}<mo>&#xAF;</mo></mover>`;
      else if (this.match('with hat on top')) a = `<mover>${a}<mo>^</mo></mover>`;
      else if (this.match('with tilde on top')) a = `<mover>${a}<mo>~</mo></mover>`;
      else if (this.match('with arrow on top')) a = `<mover>${a}<mo>&#x2192;</mo></mover>`;
      else if (this.at('over') && this.w[this.i + 1] !== 'denominator' && this.i + 1 < this.w.length) {
        this.i++;
        a = `<mfrac>${a}${this.atomWithPostfix() ?? '<mrow/>'}</mfrac>`;
      }
      else break;
    }
    return a;
  }

  private atom(): string | null {
    const w = this.w[this.i];
    if (w === undefined) return null;
    if (this.match('blank')) return '<mrow/>';
    if (this.match('fraction numerator')) {
      const n = this.seq(['over denominator']);
      this.match('over denominator');
      const d = this.seq(['end fraction']);
      this.match('end fraction');
      return `<mfrac>${row(n)}${row(d)}</mfrac>`;
    }
    if (this.match('square root of')) return `<msqrt>${this.rootBody()}</msqrt>`;
    if (this.match('n-th root of')) {
      return `<mroot>${this.rootBody()}<mi>n</mi></mroot>`;
    }
    for (const [o, n] of Object.entries(ORD)) {
      if (this.match(o + ' root of')) return `<mroot>${this.rootBody()}<mn>${n}</mn></mroot>`;
    }
    for (const [name, [o, c]] of Object.entries(FENCES)) {
      const openers = [`open ${name}`, `left ${name}`];
      for (const op of openers) {
        if (this.match(op)) {
          const xs = this.seq([`close ${name}`, `right ${name}`]);
          if (!this.match(`close ${name}`)) this.match(`right ${name}`);
          const def = o === '(' && c === ')';
          return `<mfenced${def ? '' : ` open="${o}" close="${c}"`}>${row(xs)}</mfenced>`;
        }
      }
    }
    if (this.match('negative')) {
      const a = this.atomWithPostfix();
      return `<mrow>${tok('mo', '-')}${a ?? ''}</mrow>`.replace(/^<mrow>(.*)<\/mrow>$/, '$1');
    }
    for (const big of [['sum', '∑'], ['product', '∏'], ['integral', '∫']] as const) {
      if (this.match(big[0] + ' from')) {
        const lo = this.seq(['to']);
        this.match('to');
        const hi = this.atomWithPostfix() ?? '<mrow/>';
        this.match('of');
        const tag = big[0] === 'integral' ? 'msubsup' : 'munderover';
        return `<${tag}>${tok('mo', big[1])}${row(lo)}${hi}</${tag}>`;
      }
    }
    if (/^\d+(\.\d+)?$/.test(w) || /^\.\d+$/.test(w)) {
      this.i++;
      return tok('mn', w);
    }
    // multi-word phrases (longest first)
    for (const p of PHRASES) {
      if (p.words.length > 1 && this.at(...p.words)) {
        this.i += p.words.length;
        return tok(p.tag, p.text, p.mv);
      }
    }
    if (FUNCS.has(w)) {
      this.i++;
      return tok('mi', w);
    }
    if (GREEK[w]) {
      this.i++;
      return tok('mi', GREEK[w]);
    }
    if (w === 'capital' && GREEK[this.w[this.i + 1]]) {
      const g = GREEK[this.w[this.i + 1]].toUpperCase();
      this.i += 2;
      return tok('mi', g);
    }
    const single = PHRASES.find((p) => p.words.length === 1 && p.words[0] === w);
    if (single) {
      this.i++;
      return tok(single.tag, single.text, single.mv);
    }
    if (/^[A-Za-z]$/.test(w)) {
      this.i++;
      return tok('mi', w);
    }
    // unknown word: keep as text
    this.i++;
    return tok('mtext', w);
  }

  private rootBody(): string {
    const stops = ['end root'];
    // complex radicand is closed by "end root"; otherwise a single atom
    for (let k = this.i; k < this.w.length; k++) if (this.w[k] === 'end' && this.w[k + 1] === 'root') {
      const xs = this.seq(stops);
      this.match('end root');
      return xs.join('');
    }
    return this.atomWithPostfix() ?? '';
  }

  private item(): string | null {
    return this.atomWithPostfix();
  }
}

/** phrases of a language → the English phrases of the grammar above (templates, token names, fences) */
const INVERSE = new Map<SpeechPack, Map<string, string>>();
function inverseOf(P: SpeechPack): Map<string, string> {
  let m = INVERSE.get(P);
  if (m) return m;
  m = new Map();
  const add = (ar: string | undefined, en: string | undefined) => {
    const a = (ar ?? '').replace(/\u200f/g, '').replace(/\s+/g, ' ').trim();
    if (a && en && a !== en && !m!.has(a)) m!.set(a, en);
  };
  // fixed words of the templates: "{0} على {1}" ↔ "{0} over {1}"
  for (const [k, en] of Object.entries(EN_TEMPLATES)) {
    const ar = P.t[k];
    if (!ar || ar === en) continue;
    // ordinals ("1 half") read like "over" in Arabic; templates that reorder their arguments cannot be aligned
    if (/^ord|^fracOrd/.test(k)) continue;
    const order = (t: string) => (t.match(/\{\d\}/g) ?? []).join('');
    if (order(en) !== order(ar)) continue;
    const ea = en.split(/\{\d\}/);
    const aa = ar.split(/\{\d\}/);
    if (ea.length === aa.length) ea.forEach((f, i) => add(aa[i], f.trim()));
    else if (ea.length === 1 && aa.length === 1) add(ar, en);
  }
  // names of tokens
  const en = EN.names ?? {};
  for (const [k, v] of Object.entries(P.names ?? {})) add(v, en[k]);
  // fences
  for (const [ch, name] of Object.entries(FENCE_NAMES)) {
    add(P.fenceOpen?.[ch], `open ${name}`);
    add(P.fenceClose?.[ch], `close ${name}`);
  }
  add(P.t.fenceDefaultOpen, 'open parentheses');
  add(P.t.fenceDefaultClose, 'close parentheses');
  m.delete('ل');
  INVERSE.set(P, m);
  return m;
}

/** translate a spoken formula of another language word by word into the English grammar */
function toEnglish(text: string, P: SpeechPack): string {
  const inv = inverseOf(P);
  const w = text.replace(/\u200f/g, ' ').trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < w.length; ) {
    let hit = false;
    for (let n = Math.min(10, w.length - i); n >= 1 && !hit; n--) {
      const en = inv.get(w.slice(i, i + n).join(' '));
      if (en !== undefined) {
        out.push(en);
        i += n;
        hit = true;
      }
    }
    if (!hit) out.push(w[i++]);
  }
  // the Arabic "ل" stands for both "for" and "of": pair them (for … of), a lone one is "of"
  const idx = out.map((t, k) => (t === 'ل' ? k : -1)).filter((k) => k >= 0);
  for (let k = 0; k < idx.length; k++) out[idx[k]] = (idx.length - k) % 2 === 0 ? 'for' : 'of';
  return out.join(' ').replace(/(\d) \./g, '$1.').replace(/\. (?=\d)/g, '.');
}

export function accessible2mathml(text: string, lang?: string): string {
  const P = packFor(lang);
  if (P !== EN) text = toEnglish(text, P);
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length || (words.length === 1 && words[0] === 'blank')) return `<math ${NS}/>`;
  const p = new Parser(words);
  const body = p.seq([]).join('');
  return `<math ${NS}>${body}</math>`;
}
