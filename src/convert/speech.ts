/**
 * mathml2accessible: spoken description of a formula in the style of the reference service
 * ("x plus 1 fraction numerator a greater than over denominator blank end fraction").
 * The structure rules are shared by all languages; a language pack (speech-lang.ts) holds the phrase
 * templates, the names of tokens and the string that joins the items of a row.
 */
import { parseNormalised, N } from './xml';
import symbols from '../data/symbols.json';
import { SpeechPack, EN, packFor, fill } from './speech-lang';
import signs from '../data/speech/signs.json';

const SYM = symbols as unknown as Record<string, [string | null, string | null]>;

const ASCII_NAMES: Record<string, string> = {
  '+': 'plus', '-': 'minus', '−': 'minus', '=': 'equals', '<': 'less than', '>': 'greater than',
  '(': 'open parenthesis', ')': 'close parenthesis', '[': 'open bracket', ']': 'close bracket', '{': 'open brace', '}': 'close brace',
  ',': 'comma', '.': 'point', ';': 'semicolon', ':': 'colon', '!': 'factorial', '?': 'question mark', '|': 'vertical bar', '\\': 'backslash',
  '%': 'percent sign', '&': 'ampersand', '#': 'number sign', '$': 'dollar', '@': 'at', '^': 'caret', '~': 'tilde', '`': 'grave accent',
  "'": 'prime', '"': 'double quote', ' ': 'space', '×': 'times', '÷': 'divided by', '±': 'plus or minus',
  '∓': 'minus-or-plus', '¯': 'bar', '‥': 'two dots', '⋅': 'times', 'ℜ': 'real part', 'ℑ': 'imaginary part', '∇': 'nabla',
};

const LR: Record<string, string> = {
  '(': 'left parenthesis', ')': 'right parenthesis', '[': 'left square bracket', ']': 'right square bracket', '{': 'left curly bracket', '}': 'right curly bracket',
};

const GREEK: Record<string, string> = {
  α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'epsilon', ζ: 'zeta', η: 'eta', θ: 'theta', ι: 'iota', κ: 'kappa', λ: 'lambda', μ: 'mu', ν: 'nu',
  ξ: 'xi', ο: 'omicron', π: 'pi', ρ: 'rho', ς: 'final sigma', σ: 'sigma', τ: 'tau', υ: 'upsilon', φ: 'phi', χ: 'chi', ψ: 'psi', ω: 'omega',
};

export const FENCE_NAMES: Record<string, string> = {
  '(': 'parentheses', ')': 'parentheses', '[': 'square brackets', ']': 'square brackets', '{': 'curly brackets', '}': 'curly brackets',
  '|': 'vertical bar', '||': 'double vertical bar', '<': 'angle brackets', '>': 'angle brackets', '〈': 'angle brackets', '〉': 'angle brackets',
  '⌊': 'floor', '⌋': 'floor', '⌈': 'ceil', '⌉': 'ceil', '⟦': 'white square brackets', '⟧': 'white square brackets',
  '⟨': 'angle brackets', '⟩': 'angle brackets',
};

/** the reference service answers some inputs with "Error converting …" */
export class AccessibleError extends Error {}

/** empty big operators that are the placeholder of an editable operator slot (maction argument) */
const inPlaceholder = new WeakSet<object>();

const TABLE_ATTR_ORDER = ['columnalign', 'columnspacing', 'rowspacing', 'rowalign', 'framespacing'];

/** tokens after which a minus is a subtraction (recorded from the reference: tools/gen/speech_signs.mjs) */
const OPERAND_END = new Set<string>((signs as { minusAfter: string[] }).minusAfter);

/** the text of a big operator is a word / identifier (letters, digits after a letter) or symbols only, never a mixture */
function bigOpText(x: string): boolean {
  const letter = /[\p{L}\p{M}]/u.test(x);
  const digit = /\p{Nd}/u.test(x);
  const symbol = /[^\p{L}\p{M}\p{Nd}]/u.test(x);
  if (symbol && (letter || digit)) return false;
  return !(digit && !letter);
}

const FENCE_OPEN = ['(', '[', '{', '|', '||', '<', '\u2308', '\u230A'];
const FENCE_CLOSE = [')', ']', '}', '|', '||', '>', '\u2309', '\u230B'];

function flat(ns: N[]): N[] {
  return ns.flatMap((n) => (n.t === 'mrow' ? flat(n.c) : [n]));
}

class Speaker {
  /** more than one token in the formula: delimiters typed as operators are read left/right */
  paren = false;

  constructor(private readonly P: SpeechPack = EN) {}

  private get T(): Record<string, string> {
    return this.P.t;
  }

  /** name of a single token */
  tokenName(tag: string, attrs: Record<string, string>, text: string): string {
    const P = this.P;
    const mv = attrs.mathvariant;
    if (P.names) {
      // table of single-token names recorded from the reference service
      const named = P.names[`${tag}|${mv ?? ''}|${text}`];
      if (named !== undefined) return named;
    }
    const key = `${tag}|${mv ? `mathvariant="${mv}"` : ''}|${text}`;
    const hit = P.chain ? SYM[key] : undefined;
    if (hit && hit[0]) return hit[0];
    if (tag === 'mn') return text;
    if (tag === 'mi') {
      if (P.chain && [...text].length === 1) {
        const g = GREEK[text.toLowerCase()];
        if (g) return text === text.toLowerCase() ? g : fill(this.T.capital, g);
      }
      const base = text;
      if (mv === 'script') return fill(this.T.calligraphic, base);
      if (mv === 'fraktur') return fill(this.T.fraktur, base);
      if (mv === 'double-struck') return fill(this.T.doubleStruck, base);
      if (mv === 'bold' || mv === 'bold-italic') return fill(this.T.bold, base);
      return base;
    }
    if (!P.chain) return text;
    const any = SYM[`${tag}||${text}`];
    if (any && any[0]) return any[0];
    if (text.length === 1 && ASCII_NAMES[text]) return ASCII_NAMES[text];
    if (tag === 'mtext') return text.replace(/ /g, ' ');
    return text;
  }

  /** join the spoken items of one row */
  private join(acc: string, w: string): string {
    const mark = this.P.rowMark;
    if (acc === '') return w;
    if (mark) return w === '\n' ? acc + mark + w : acc + mark + ' ' + w;
    return acc.endsWith('\n') || w === '\n' ? acc + w : acc + ' ' + w;
  }

  /** speak a list of sibling nodes */
  list(ns0: N[]): string {
    const ns = flat(ns0);
    // paired delimiters typed as plain operators are read "left … right"
    const open = new Map<N, string>();
    const stack: { n: N; ch: string }[] = [];
    const CLOSE: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    const NAMES: Record<string, [string, string]> = this.P.lr
      ? { '(': [this.P.lr['('], this.P.lr[')']], '[': [this.P.lr['['], this.P.lr[']']], '{': [this.P.lr['{'], this.P.lr['}']] }
      : { '(': [LR['('], LR[')']], '[': [LR['['], LR[']']], '{': [LR['{'], LR['}']] };
    for (const n of ns) {
      if (n.t !== 'mo') continue;
      const x = n.x ?? '';
      if (NAMES[x]) stack.push({ n, ch: x });
      else if (CLOSE[x]) {
        const k = stack.length - 1;
        if (k >= 0 && stack[k].ch === CLOSE[x]) {
          open.set(stack[k].n, NAMES[CLOSE[x]][0]);
          open.set(n, NAMES[CLOSE[x]][1]);
          stack.pop();
        }
      }
    }
    // number . number → "3.14"; leading / trailing decimal point
    const out: N[] = [];
    const arabic = !!this.P.rowMark;
    for (let i = 0; i < ns.length; i++) {
      const n = ns[i];
      const nx = ns[i + 1];
      const pv = out[out.length - 1];
      if (n.t === 'mo' && n.x === '.' && ((pv && pv.t === 'mn' && nx && nx.t === 'mn') || (!arabic && ((nx && nx.t === 'mn' && (!pv || pv.t !== 'mn')) || (pv && pv.t === 'mn' && !nx))))) {
        if (pv && pv.t === 'mn' && nx && nx.t === 'mn') {
          out[out.length - 1] = { t: 'mn', a: pv.a, x: (pv.x ?? '') + '.' + (nx.x ?? ''), c: [] };
          i++;
        } else if (pv && pv.t === 'mn') out[out.length - 1] = { t: 'mn', a: pv.a, x: (pv.x ?? '') + '.', c: [] };
        else if (nx) {
          out.push({ t: 'mn', a: nx.a, x: '.' + (nx.x ?? ''), c: [] });
          i++;
        }
        continue;
      }
      out.push(n);
    }
    return out
      .map((n, i, ns) => {
        if (open.has(n)) return open.get(n)!;
        // a sign: first in the row (with something after it) or after an operator that does not end an operand
        const afterOp = i > 0 && ns[i - 1].t === 'mo' && !OPERAND_END.has(ns[i - 1].x ?? '');
        if (n.t === 'mo' && n.x === '\u2213') return i === 0 ? this.T.negativeOrPlus : this.T.minusOrPlus;
        if (n.t === 'mo' && (n.x === '-' || n.x === '\u2212') && (i === 0 ? i + 1 < ns.length : afterOp)) return this.T.negative;
        return this.node(n);
      })
      .filter((s) => s !== '')
      .reduce((acc, w) => this.join(acc, w), '');
  }

  /** a slot read without "end …" markers: one plain token or nothing; a wrapping mrow always counts as a group */
  simpleRaw(c: N | undefined): boolean {
    if (!c) return true;
    if (c.t === 'mrow') return c.c.length === 0;
    if (c.t === 'maction') return this.kids(c).length === 0 || (this.kids(c).length === 1 && this.kids(c)[0].t === 'mo' && this.kids(c)[0].a.largeop === 'true');
    return c.t === 'mi' || c.t === 'mn' || c.t === 'mo' || c.t === 'mspace';
  }

  /** numerator/denominator that may be spoken without the long fraction form */
  fracSimpleRaw(c: N | undefined): boolean {
    if (this.simpleRaw(c)) return true;
    if (c && (c.t === 'msup' || c.t === 'msub' || c.t === 'msubsup')) return c.c.every((x) => this.simpleRaw(x));
    return false;
  }

  arg(ns: N[]): string {
    return ns.length ? this.list(ns) : this.T.blank;
  }

  slot(n: N, i: number): N[] {
    const c = n.c[i];
    if (!c) return [];
    return this.slotOf(c);
  }

  /** children of `n` with transparent mrow wrappers expanded */
  kids(n: N): N[] {
    return flat(n.c);
  }

  node(n: N): string {
    const T = this.T;
    const tok = (tag: string, a: Record<string, string>, x: string) => this.tokenName(tag, a, x);
    switch (n.t) {
      case 'mi':
      case 'mn':
      case 'mo':
        if (n.t === 'mo' && n.a.largeop === 'true' && !n.x && !inPlaceholder.has(n)) throw new AccessibleError('empty big operator');
        if (n.t === 'mo' && n.a.largeop === 'true' && !bigOpText(n.x ?? '')) throw new AccessibleError('text in a big operator');
        if (n.t === 'mo' && /^\p{Nd}/u.test(n.x ?? '')) throw new AccessibleError('digit as operator');
        if (n.t === 'mi' && (n.x ?? '').includes('\\')) throw new AccessibleError('backslash');
        if (n.a.mathvariant && /^(bold-fraktur|bold-script|sans-serif|bold-sans-serif|sans-serif-italic|sans-serif-bold-italic|monospace)$/.test(n.a.mathvariant)) throw new AccessibleError('unsupported variant');
        if (n.t === 'mn' && n.a.mathvariant === 'double-struck') return fill(T.doubleStruck, (n.x ?? '').replace(/,/g, ''));
        if (n.t === 'mo' && n.a.largeop === 'true') return n.x ? fill(T.largeOp, tok(n.t, {}, n.x)) : T.largeBlank;
        if (n.t === 'mo' && this.paren && (this.P.lr ?? LR)[n.x ?? '']) return (this.P.lr ?? LR)[n.x!];
        if (n.t === 'mo' && n.x === ' ') return T.numberSpace;
        if (n.t === 'mo' && (n.x ?? '').length > 1 && /^[ ]+$/.test(n.x!)) return n.x!;
        if (n.t === 'mn' && n.a.mathvariant === 'bold') return fill(T.bold, (n.x ?? '').replace(/,/g, ''));
        if (n.t === 'mn' && n.a.mathvariant === 'italic') return fill(T.italic, (n.x ?? '').replace(/,/g, ''));
        if (n.t === 'mn') return (n.x ?? '').replace(/,/g, '');
        if (n.t === 'mo' && n.a.mathvariant === 'bold') return fill(T.bold, tok('mo', {}, n.x ?? ''));
        if (n.t === 'mi' && n.a.mathvariant === 'bold-italic') return fill(T.boldItalic, tok('mi', {}, n.x ?? ''));
        if (n.t === 'mi' && n.a.mathvariant === 'italic') return [...(n.x ?? '')].length > 1 ? fill(T.italic, n.x ?? '') : tok('mi', {}, n.x ?? '');
        if (n.t === 'mi' && !n.a.mathvariant && [...(n.x ?? '')].length > 1 && /\p{Script=Greek}/u.test(n.x ?? '')) {
          // Greek letters inside a longer identifier are read one by one, upright; Latin runs stay words
          return (n.x ?? '').match(/[A-Za-z]+|./gsu)!.map((r) => (/^[A-Za-z]{2,}$/.test(r) ? r : fill(T.straight, tok('mi', {}, r)))).reduce((acc, w) => this.join(acc, w), '');
        }
        if (n.t === 'mo' && /^[A-Za-z]{2,}$/.test(n.x ?? '')) return n.x!;
        if (n.t === 'mi' && n.a.mathvariant === 'normal' && [...(n.x ?? '')].length === 1 && !SYM[`mi|mathvariant="normal"|${n.x}`]) return fill(T.straight, tok('mi', {}, n.x ?? ''));
        if (n.t === 'mo' && n.x === ' ') return ' ';
        return tok(n.t, n.a, n.x ?? '');
      case 'mtext':
        return fill(T.text, n.x ?? '');
      case 'mspace': {
        if (n.a.linebreak === 'newline') return '\n';
        if (n.a.width === '-0.2em') return T.spaceBack;
        if (n.a.width) return fill(T.spaceOf, n.a.width);
        return T.blank;
      }
      case 'none':
      case 'mprescripts':
        return '';
      case 'mfrac': {
        const num = this.slot(n, 0);
        const den = this.slot(n, 1);
        const bev = n.a.bevelled === 'true';
        const wrap = (s: string) => (bev ? fill(T.fracBev, s) : s);
        if (this.fracSimpleRaw(n.c[0]) && this.fracSimpleRaw(n.c[1])) {
          const a = this.arg(num);
          const b = this.arg(den);
          const ord: Record<string, string> = { '2': T.ord2, '3': T.ord3, '4': T.ord4, '5': T.ord5 };
          if (a === '1' && ord[b] && den[0]?.t === 'mn') return wrap(fill(T.fracOrd, ord[b]));
          return wrap(fill(T.fracOver, a, b));
        }
        return wrap(fill(T.fracLong, this.arg(num), this.arg(den)));
      }
      case 'msqrt': {
        const body = this.kids(n);
        if (body.length === 0) return n.c.length ? fill(T.sqrt, T.blank) : T.sqrtBlank;
        if (n.c.length === 1 && this.simpleRaw(n.c[0])) return fill(T.sqrt, this.list(body));
        return fill(T.sqrtEnd, this.list(body));
      }
      case 'mroot': {
        const rad = this.slot(n, 0);
        const idx = this.slot(n, 1);
        const end = this.simpleRaw(n.c[0]) ? '' : ' ' + T.endRoot;
        const i0 = idx[0];
        const iraw = n.c[1];
        if (iraw && iraw.t === 'mn') {
          const words: Record<string, string> = { '2': T.root2, '3': T.root3, '4': T.root4, '5': T.root5 };
          if (words[i0.x ?? '']) return fill(words[i0.x!], this.arg(rad)) + end;
        }
        if (iraw && iraw.t === 'mi') return fill(T.rootTh, this.arg(rad), i0.x ?? '') + end;
        return fill(T.rootIdx, this.arg(rad), this.arg(idx)) + end;
      }
      case 'msup': {
        const base = this.slot(n, 0);
        const e = this.slot(n, 1);
        if (n.c[1] && n.c[1].t === 'mn') {
          if (n.c[1].x === '2') return fill(T.squared, this.arg(base));
          if (n.c[1].x === '3') return fill(T.cubed, this.arg(base));
        }
        if (this.simpleRaw(n.c[1])) return fill(T.pow, this.arg(base), this.arg(e));
        return fill(T.powEnd, this.arg(base), this.arg(e));
      }
      case 'msub': {
        const base = this.slot(n, 0);
        const s = this.slot(n, 1);
        if (this.simpleRaw(n.c[1])) return `${this.arg(base)} ${T.subscript} ${this.arg(s)}`;
        return `${this.arg(base)} ${T.subscript} ${this.arg(s)} ${T.endSubscript}`;
      }
      case 'msubsup': {
        const base = this.slot(n, 0);
        const sb = this.slot(n, 1);
        const sp = this.slot(n, 2);
        const subEnd = this.simpleRaw(n.c[1]) ? '' : ` ${T.endSubscript}`;
        const supEnd = this.simpleRaw(n.c[2]) ? '' : ` ${T.endSuperscript}`;
        return `${this.arg(base)} ${T.subscript} ${this.arg(sb)}${subEnd} ${T.superscript} ${this.arg(sp)}${supEnd}`;
      }
      case 'mmultiscripts': {
        const kids = n.c;
        const pre = kids.findIndex((k) => k.t === 'mprescripts');
        const base = kids[0] ? this.slotOf(kids[0]) : [];
        const post = pre < 0 ? kids.slice(1) : kids.slice(1, pre);
        const prescr = pre < 0 ? [] : kids.slice(pre + 1);
        let o = this.simpleRaw(kids[0]) ? this.arg(base) : fill(T.scriptBase, this.arg(base));
        const emit = (list: N[], subW: string, supW: string, subEnd: string, supEnd: string) => {
          for (let i = 0; i < list.length; i += 2) {
            const sub = list[i];
            const sup = list[i + 1];
            if (sub && sub.t !== 'none') {
              const x = this.slotOf(sub);
              o += ` ${subW} ${this.arg(x)}${this.simpleRaw(sub) ? '' : ` ${subEnd}`}`;
            }
            if (sup && sup.t !== 'none') {
              const x = this.slotOf(sup);
              o += ` ${supW} ${this.arg(x)}${this.simpleRaw(sup) ? '' : ` ${supEnd}`}`;
            }
          }
        };
        emit(prescr, T.presubscript, T.presuperscript, T.endPresubscript, T.endPresuperscript);
        emit(post, T.subscript, T.superscript, T.endSubscript, T.endSuperscript);
        return o;
      }
      case 'munder':
      case 'mover':
      case 'munderover':
        return this.underOver(n);
      case 'mfenced': {
        const open = n.a.open ?? '(';
        const close = n.a.close ?? ')';
        const hasO = n.a.open !== undefined;
        const hasC = n.a.close !== undefined;
        const hasS = n.a.separators !== undefined;
        const seps = (n.a.separators ?? ',').replace(/[ \t\r\n]+/g, '');
        // the service only reads the forms of the editor: known fences, one separator, explicit attributes in all-or-none
        if (n.c.length === 0) throw new AccessibleError('empty fence');
        if (open === '' && close === '') throw new AccessibleError('no fence');
        if ((open !== '' && !FENCE_OPEN.includes(open)) || (close !== '' && !FENCE_CLOSE.includes(close))) throw new AccessibleError('unknown fence');
        if (hasS && n.c.length >= 2 && (seps.length !== 1 || /[A-Za-z0-9&]/.test(seps) || n.c.length > 2)) throw new AccessibleError('separators');
        if (n.c.length === 2 && (hasO || hasC || hasS) && !(hasO && hasC && hasS)) throw new AccessibleError('partial attributes');
        const parts: string[] = [];
        n.c.forEach((c, i) => {
          parts.push(this.arg(this.slotOf(c)));
          if (i < n.c.length - 1 && seps.length) parts.push(this.tokenName('mo', {}, seps[0]));
        });
        const spoken = parts.join(' ');
        const openWord = (ch: string) => (ch === '' ? T.open : this.P.fenceOpen ? this.P.fenceOpen[ch] ?? `${T.open} ${ch}` : `${T.open} ${FENCE_NAMES[ch] ?? ch}`);
        const closeWord = (ch: string) => (ch === '' ? T.close : this.P.fenceClose ? this.P.fenceClose[ch] ?? `${T.close} ${ch}` : `${T.close} ${FENCE_NAMES[ch] ?? ch}`);
        let o = hasO ? openWord(open) : T.fenceDefaultOpen;
        let c = hasC ? closeWord(close) : T.fenceDefaultClose;
        if (this.P.fenceSwap && hasO !== hasC) {
          // one attribute only: the phrase of the given fence lands in the other slot
          if (hasO) {
            o = open === '' ? openWord('') : T.fenceDefaultOpen;
            c = open === '' ? closeWord(')') : openWord(open);
          } else {
            o = close === '' ? openWord('(') : closeWord(close);
            c = close === '' ? closeWord('') : T.fenceDefaultClose;
          }
        }
        return `${o} ${spoken} ${c}`;
      }
      case 'mtable':
        return this.table(n);
      case 'menclose': {
        const nt = (n.a.notation ?? 'longdiv').trim().replace(/\s+/g, ' ');
        const words = this.P.encloseWords ?? {};
        const parts = nt.split(' ');
        if (parts.some((w) => words[w] === undefined)) throw new AccessibleError('unknown notation');
        const strike = parts.every((w) => /strike$/.test(w));
        const name = n.a.notation === undefined ? T.encloseDefault : fill(strike ? T.strikeTpl : T.encloseTpl, parts.map((w) => words[w]).join(' '));
        const body = this.kids(n);
        const endW = strike ? T.endStrike : T.endEnclose;
        if (body.length === 0 && n.c.length > 0) return `${name} ${T.blank}`;
        if (body.length === 0) return `${name} ${T.blank} ${endW}`;
        return `${name} ${this.list(body)}${n.c.length > 1 || !this.simpleRaw(n.c[0]) ? ` ${endW}` : ''}`;
      }
      case 'mstyle': {
        if (n.a.displaystyle === 'false') return fill(T.styleInline, this.list(this.kids(n)));
        if (n.a.displaystyle === 'true') return fill(T.styleDisplay, this.list(this.kids(n)));
        if (n.a.mathsize) return fill(T.styleSize, n.a.mathsize, this.list(this.kids(n)));
        return this.list(this.kids(n));
      }
      case 'maction': {
        // only the empty argument placeholders of the editor are read; anything else is refused
        if (n.a.actiontype !== 'argument') throw new AccessibleError('maction');
        const k = this.kids(n);
        if (k.length === 0) return T.blank;
        if (k.length === 1 && k[0].t === 'mo' && k[0].a.largeop === 'true' && !k[0].x) return this.list(k);
        throw new AccessibleError('argument with content');
      }
      case 'mpadded':
      case 'mrow':
      case 'merror':
      case 'mphantom':
        return this.list(this.kids(n));
      case 'mlongdiv': {
        if (n.a.longdivstyle !== undefined && n.a.longdivstyle !== 'shortstackedrightright') throw new AccessibleError('long division style');
        const style = n.a.longdivstyle === 'shortstackedrightright' ? T.longdivLeft : T.longdivBy;
        const divisor = this.arg(this.slotOf(n.c[0]));
        const group = n.c.slice(2);
        const rows = group.flatMap((g) => (g.t === 'msgroup' ? flat(g.c) : [g]));
        const spoken = rows.map((r) => (r.t === 'msline' ? T.hline : this.arg(this.slotOf(r))));
        return `${style} ${divisor} ${T.yields} ${this.arg(this.slotOf(n.c[1]))} ${T.pile} ${spoken.join(' ')} ${T.pileEnd} ${T.longdivEnd}`;
      }
      case 'mstack': {
        // the service only reads stacks that carry both alignments; empty rows and carries are errors
        if (n.a.charalign === undefined || n.a.stackalign === undefined) throw new AccessibleError('stack without alignment');
        const items: string[] = [];
        for (const r of n.c) {
          if (r.t === 'mscarries') throw new AccessibleError('carries');
          if (r.t === 'none') items.push(T.none);
          else if (r.t === 'msline') items.push(T.hline);
          else if (r.t === 'msrow') {
            if (r.c.length === 0) throw new AccessibleError('empty row');
            items.push(fill(T.stackRow, this.list(r.c.map((c) => (c.t === 'none' ? ({ ...c, t: 'mi', x: T.none } as N) : c)))));
          } else items.push(this.arg(this.slotOf(r)));
        }
        return `${fill(T.stackAttrs, n.a.charalign, n.a.stackalign)} ${items.join(' ')} ${T.stackEnd}`;
      }
      case 'msrow':
      case 'msgroup':
      default:
        return this.list(this.kids(n));
    }
  }

  /** children of a wrapper node as a list (maction argument / mrow transparency) */
  slotOf(n: N | undefined): N[] {
    if (!n) return [];
    if (n.t === 'maction' && n.a.actiontype === 'argument') {
      const k = flat(n.c);
      if (k.length && !(k.length === 1 && k[0].t === 'mo' && k[0].a.largeop === 'true' && !k[0].x)) throw new AccessibleError('argument with content');
      return k;
    }
    if (n.t === 'msrow' || n.t === 'mrow') return flat(n.c);
    return [n];
  }

  underOver(n: N): string {
    const T = this.T;
    const base = this.slot(n, 0);
    const b0 = base[0];
    const isOp = base.length === 1 && b0 && (b0.t === 'mo' || b0.t === 'mi');
    const under = n.t === 'mover' ? null : this.slot(n, 1);
    const over = n.t === 'munder' ? null : this.slot(n, n.t === 'mover' ? 1 : 2);
    const baseText = this.arg(base);
    // any operator under or over which something is written reads "… for … of" / "… from … to … of"
    const bigOp = isOp && b0.t === 'mo';
    // only a limit with one under-script reads "limit as … of"; other function names are ordinary bases
    const lim = b0 && b0.t === 'mi' && base.length === 1 && b0.x === 'lim' && n.t === 'munder';

    if ((bigOp || lim) && n.t !== 'mover') {
      if (n.t === 'munder') return lim ? fill(T.limitAs, this.arg(under!)) : fill(T.forOf, baseText, this.arg(under!));
      return fill(T.fromTo, baseText, this.arg(under!), this.arg(over!));
    }
    const complex = !this.simpleRaw(n.c[0]);
    const b = complex ? fill(T.stack, baseText) : baseText;
    if (n.t === 'munder') return fill(T.below, b, this.arg(under!));
    if (n.t === 'mover') return fill(T.onTop, b, this.arg(over!));
    return fill(complex ? T.stackBelowTop : T.belowTop, b, this.arg(under!), this.arg(over!));
  }

  table(n: N): string {
    const T = this.T;
    // table attributes the service cannot write down
    const a = n.a;
    if (a.align !== undefined || a.displaystyle !== undefined || a.width !== undefined || a.frame === 'solid') throw new AccessibleError('table attribute');
    if (a.columnalign !== undefined && /decimalpoint/.test(a.columnalign)) throw new AccessibleError('column alignment');
    if (a.rowalign !== undefined && /axis/.test(a.rowalign)) throw new AccessibleError('row alignment');
    if (a.framespacing !== undefined && (a.columnalign !== undefined || a.columnspacing !== undefined || a.rowspacing !== undefined || a.rowalign !== undefined)) throw new AccessibleError('frame spacing');
    if (a.columnspacing !== undefined && a.rowalign !== undefined) throw new AccessibleError('spacing and alignment');
    const attrs = TABLE_ATTR_ORDER.filter((k) => n.a[k] !== undefined);
    const an = this.P.attr ?? {};
    const rows = n.c.filter((r) => r.t === 'mtr');
    const cells = (r: N) =>
      r.c
        .map((cell) => {
          const direct = cell.t === 'mtd' ? cell.c : [cell];
          const kids = flat(direct);
          if (direct.length === 0) return T.cellBlank;
          if (kids.length === 0) return T.blank;
          // a cell holding one plain token is read as is, anything else is wrapped in "cell … end cell"
          const plain = direct.length === 1 && ['mi', 'mn', 'mo', 'mspace'].includes(direct[0].t);
          return plain ? this.arg(kids) : `${T.cell} ${this.list(kids)} ${T.cellEnd}`;
        })
        .join(' ');
    let o = T.table;
    let first = 0;
    const mask = TABLE_ATTR_ORDER.reduce((m, k, i) => (n.a[k] !== undefined ? m | (1 << i) : m), 0);
    const tpl = mask && rows.length ? this.P.tableHeaders?.[String(mask)] : undefined;
    if (tpl) {
      // the reference writes the header of some combinations with its own spelling: recorded per combination
      o = fill(tpl, ...TABLE_ATTR_ORDER.map((k) => n.a[k] ?? '')) + ' ' + cells(rows[0]);
      first = 1;
    } else if (attrs.length) o += ` ${T.tableAttrs} ` + attrs.map((k) => `${an[k] ?? k} ${n.a[k]}`).join(' ') + ` ${T.tableAttrsEnd}`;
    for (const r of rows.slice(first)) o += ` ${T.tableRow} ` + cells(r);
    return `${o} ${T.tableEnd}`;
  }
}

export function mathml2accessible(mml: string, lang?: string): string {
  const { root, kids, rootName } = parseNormalised(mml);
  // the service reads <math> documents only
  if (rootName !== 'math') throw new AccessibleError('not a math document');
  const mark = (ns: N[]): void => {
    for (const n of ns) {
      if (n.t === 'maction') for (const c of n.c) if (c.t === 'mo') inPlaceholder.add(c);
      mark(n.c);
    }
  };
  mark(kids);
  const P = packFor(lang);
  const a = root.a;
  // root attributes the service reads: dir="rtl", display="block|inline"; some others make it fail
  if ((a.dir !== undefined && a.dir !== 'rtl') || a.mathsize !== undefined || a.displaystyle !== undefined) throw new AccessibleError('root attribute');
  const prefix: string[] = [];
  if (a.dir === 'rtl') prefix.push(P.t.rtl);
  if (a.display === 'block') prefix.push(P.t.displayBlock);
  else if (a.display === 'inline') prefix.push(P.t.displayInline);
  const sp = new Speaker(P);
  const count = (ns: N[]): number => ns.reduce((x, n) => x + (n.c.length ? count(n.c) : 1), 0);
  sp.paren = count(kids) > 1;
  const body = kids.length === 0 ? P.t.blank : sp.list(kids);
  const all = prefix.length ? `${prefix.join(' ')}${body.startsWith('\n') ? '' : ' '}${body}` : body;
  // the reference attaches a point to the word before it ("x. y", "C.35", "open parentheses.")
  return all.replace(/ +/g, ' ').replace(/ \./g, '.').replace(/^ +| +$/g, '');
}
