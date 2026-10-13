/** LaTeX → Presentation MathML (subset used in mathematical authoring), output in the editor's profile. */
import { escText } from '../core/mathml';
import symbols from '../data/symbols.json';

export class LatexError extends Error {}

/** output element */
interface E {
  t: string;
  a?: [string, string][];
  x?: string;
  c?: E[];
}

const tok = (t: string, x: string, a?: [string, string][]): E => ({ t, x, a });
const el = (t: string, c: E[], a?: [string, string][]): E => ({ t, c, a });
const mo = (x: string) => tok('mo', x);
const mi = (x: string) => tok('mi', x);

const U = (s: string) => s;

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν',
  xi: 'ξ', pi: 'π', varpi: 'ϖ', rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};

const FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'sinh', 'cosh', 'tanh', 'coth', 'arcsin', 'arccos', 'arctan', 'log', 'ln', 'lg', 'exp', 'lim', 'liminf', 'limsup', 'max', 'min', 'sup', 'inf', 'det', 'dim', 'ker', 'gcd', 'deg', 'arg', 'hom', 'Pr']);

const OPS: Record<string, string> = {
  cdot: '·', times: '×', pm: '±', mp: '∓', div: '÷', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈',
  equiv: '≡', in: '∈', notin: '∉', ni: '∋', subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇', cup: '∪', cap: '∩',
  emptyset: '∅', varnothing: '∅', infty: '∞', partial: '∂', nabla: '∇', forall: '∀', exists: '∃', to: '→', rightarrow: '→', leftarrow: '←',
  gets: '←', leftrightarrow: '↔', Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', implies: '⇒', iff: '⇔', mapsto: '↦', uparrow: '↑', downarrow: '↓',
  ldots: '…', dots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱', neg: '¬', lnot: '¬', land: '∧', wedge: '∧', lor: '∨', vee: '∨',
  angle: '∠', triangle: '∆', prime: "'", ast: '*', star: '⋆', circ: '∘', bullet: '∙', oplus: '⊕', otimes: '⊗', ominus: '⊖', odot: '⊙',
  sim: '∼', simeq: '≃', cong: '≅', propto: '∝', perp: '⊥', parallel: '∥', mid: '∣', ll: '≪', gg: '≫', Re: 'ℜ', Im: 'ℑ',
  aleph: 'ℵ', wp: '℘', setminus: '∖', backslash: '\\', langle: '〈', rangle: '〉', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉',
  checkmark: '✓', textdegree: '°', sharp: '♯', flat: '♭', natural: '♮', dagger: '†', ddagger: '‡', S: '§', P: '¶',
  surd: '√', top: '⊤', bot: '⊥', vert: '|', Vert: '‖', lbrace: '{', rbrace: '}', lbrack: '[', rbrack: ']', lt: '<', gt: '>', colon: ':',
  nleq: '≰', ngeq: '≱', nless: '≮', ngtr: '≯', models: '⊧', vdash: '⊢', dashv: '⊣', square: '□', blacksquare: '■',
  iint: '∬', iiint: '∭', oint: '∮', int: '∫', sum: '∑', prod: '∏', coprod: '∐',
};
const MI_SYM: Record<string, string> = { hbar: 'ℏ', hslash: 'ℏ', ell: 'ℓ', imath: 'ı', jmath: 'ȷ' };
const BIG: Record<string, string> = { bigcup: '∪', bigcap: '∩', bigvee: '∨', bigwedge: '∧', bigoplus: '⊕', bigotimes: '⊗', bigodot: '⊙', bigsqcup: '⊔', biguplus: '⨄' };
const NOLIM_BIG = new Set(['∫', '∬', '∭', '∮']);
const LIMIT_BIG = new Set(['∑', '∏', '∐']);

const SCRIPT_LETTER: Record<string, string> = { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' };
const DOUBLE: Record<string, string> = { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' };

const FENCE: Record<string, string> = { '(': '(', ')': ')', '[': '[', ']': ']', '|': '|', '.': '', '/': '/', '<': '<', '>': '>', '\\{': '{', '\\}': '}', '\\lbrace': '{', '\\rbrace': '}', '\\|': '||', '\\Vert': '||', '\\vert': '|', '\\langle': '<', '\\rangle': '>', '\\lfloor': '⌊', '\\rfloor': '⌋', '\\lceil': '⌈', '\\rceil': '⌉', '\\llbracket': '⟦', '\\rrbracket': '⟧', '\\lbrack': '[', '\\rbrack': ']' };

const SYM_REV: Record<string, string> = {};
for (const [k, v] of Object.entries(symbols as unknown as Record<string, [string | null, string | null]>)) {
  const m = /^mo\|[^|]*\|(.+)$/.exec(k);
  const tex = v[1];
  if (m && tex && /^\\[A-Za-z]+$/.test(tex)) SYM_REV[tex.slice(1)] = m[1];
}

type Tk = { k: 'cmd' | 'char' | 'open' | 'close' | 'amp' | 'nl' | 'sup' | 'sub' | 'end'; v: string; s?: number; e?: number };

function tokenize(src: string): Tk[] {
  const out: Tk[] = [];
  let i = 0;
  let last = 0;
  const stamp = () => {
    const t = out[out.length - 1];
    if (t && t.s === undefined) {
      t.s = last;
      t.e = i;
    }
  };
  while (i < src.length) {
    stamp();
    last = i;
    const c = src[i];
    if (c === '%') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '\\') {
      const m = /^\\([A-Za-z]+)/.exec(src.slice(i, i + 64));
      if (m) {
        out.push({ k: 'cmd', v: m[1] });
        i += m[0].length;
      } else if (src[i + 1] === '\\') {
        out.push({ k: 'nl', v: '\\\\' });
        i += 2;
      } else if (i + 1 < src.length) {
        out.push({ k: 'cmd', v: src[i + 1] });
        i += 2;
      } else i++;
      continue;
    }
    if (c === '{') out.push({ k: 'open', v: c });
    else if (c === '}') out.push({ k: 'close', v: c });
    else if (c === '&') out.push({ k: 'amp', v: c });
    else if (c === '^') out.push({ k: 'sup', v: c });
    else if (c === '_') out.push({ k: 'sub', v: c });
    else out.push({ k: 'char', v: String.fromCodePoint(src.codePointAt(i)!) });
    i += out[out.length - 1].v.length;
  }
  stamp();
  return out;
}

class P {
  i = 0;
  constructor(private t: Tk[], private src = '', private depth = 0) {}

  peek(): Tk | undefined {
    return this.t[this.i];
  }

  /** parse items until a stopper (close brace, \right, &, \\ or \end) */
  seq(stop: (t: Tk) => boolean): E[] {
    const items: E[] = [];
    for (;;) {
      const t = this.peek();
      if (!t || stop(t)) break;
      if (t.k === 'cmd' && (t.v === 'choose' || t.v === 'over' || t.v === 'atop')) {
        this.i++;
        const rest = this.seq(stop);
        const f = el('mfrac', [this.one(items.splice(0)), this.one(rest)], t.v === 'over' ? [] : [['linethickness', '0']]);
        return [t.v === 'choose' ? el('mfenced', [f]) : f];
      }
      const a = this.atom();
      if (a) items.push(...a);
    }
    return items;
  }

  /** single required argument ({...} group or one token) as element list */
  argument(): E[] {
    const t = this.peek();
    if (!t) throw new LatexError('missing argument');
    if (t.k === 'open') {
      this.i++;
      const items = this.seq((x) => x.k === 'close');
      if (this.peek()?.k !== 'close') throw new LatexError('missing }');
      this.i++;
      return items;
    }
    if (t.k === 'char') {
      this.i++;
      const c = t.v;
      return [/[0-9]/.test(c) ? tok('mn', c) : /\p{L}/u.test(c) ? mi(c) : mo(c)];
    }
    const a = this.atomNoScripts();
    return a ?? [];
  }

  one(items: E[]): E {
    return items.length === 1 ? items[0] : el('mrow', items);
  }

  atom(): E[] | null {
    const base = this.atomNoScripts();
    if (!base) return null;
    return this.scripts(base);
  }

  scripts(base: E[]): E[] {
    let sub: E[] | null = null;
    let sup: E[] | null = null;
    let limits: boolean | null = null;
    for (;;) {
      const t = this.peek();
      if (!t) break;
      if (t.k === 'sub' && sub === null) {
        this.i++;
        sub = this.argument();
      } else if (t.k === 'sup' && sup === null) {
        this.i++;
        sup = this.argument();
      } else if (t.k === 'cmd' && t.v === 'limits' && limits === null) {
        this.i++;
        limits = true;
      } else if (t.k === 'cmd' && t.v === 'nolimits' && limits === null) {
        this.i++;
        limits = false;
      } else break;
    }
    if (sub === null && sup === null) return base;
    const head = base.length ? base[base.length - 1] : null;
    const rest = base.slice(0, -1);
    const subE = sub ? this.one(sub.length ? sub : []) : null;
    const supE = sup ? this.one(sup.length ? sup : []) : null;
    const emptyRow = el('mrow', []);
    if (!head) {
      const b = el('mrow', []);
      return [this.compose(b, subE, supE)];
    }
    // limits on big operators / functions
    const isOp = head.t === 'mo' && head.x && (LIMIT_BIG.has(head.x) || (head.a && head.a.some(([k]) => k === 'largeop')));
    const isInt = head.t === 'mo' && head.x && NOLIM_BIG.has(head.x);
    const isLim = head.t === 'mi' && ['lim', 'liminf', 'limsup', 'max', 'min', 'sup', 'inf'].includes(head.x ?? '') && sub !== null && sup === null;
    if ((isOp && limits !== false) || (isInt && limits === true) || isLim) {
      const t = subE && supE ? 'munderover' : subE ? 'munder' : 'mover';
      const kids = [head, ...(subE ? [subE] : []), ...(supE ? [supE] : [])];
      void emptyRow;
      return [...rest, el(t, kids)];
    }
    // braces: underbrace + sub → munder, overbrace + sup → msup
    if (head.t === 'munder' && subE && !supE && head.c && head.c[1] && head.c[1].x === '⏟') return [...rest, el('munder', [head, subE])];
    return [...rest, this.compose(head, subE, supE)];
  }

  compose(base: E, sub: E | null, sup: E | null): E {
    if (sub && sup) return el('msubsup', [base, sub, sup]);
    if (sub) return el('msub', [base, sub]);
    return el('msup', [base, sup!]);
  }

  /** the variable-length body of a command that takes one braced group, as one element */
  group(): E {
    const items = this.argument();
    return this.one(items);
  }

  atomNoScripts(): E[] | null {
    const t = this.t[this.i++];
    if (!t) return null;
    switch (t.k) {
      case 'open': {
        const items = this.seq((x) => x.k === 'close');
        if (this.peek()?.k !== 'close') throw new LatexError('missing }');
        this.i++;
        return items.length ? [el('mrow', items)] : [el('mrow', [])];
      }
      case 'close':
        throw new LatexError('unexpected }');
      case 'char':
        return [this.charToken(t.v)];
      case 'amp':
      case 'nl':
        throw new LatexError('unexpected alignment character');
      case 'sup':
      case 'sub':
        // script without base
        this.i--;
        return [el('mrow', [])];
      case 'cmd':
        return this.command(t.v);
      default:
        return null;
    }
  }

  charToken(c: string): E {
    if (/[0-9]/.test(c)) {
      let n = c;
      while (this.peek()?.k === 'char' && /[0-9]/.test(this.peek()!.v)) n += this.t[this.i++].v;
      return tok('mn', n);
    }
    if (/\p{L}/u.test(c)) return mi(c);
    return mo(c);
  }

  command(name: string): E[] {
    const g = GREEK[name];
    if (g) return [mi(g)];
    if (MI_SYM[name]) return [mi(MI_SYM[name])];
    if (FUNCS.has(name)) return [mi(name)];
    if (BIG[name]) return [tok('mo', BIG[name], [['largeop', 'true']])];
    switch (name) {
      case ',':
        return [mo(' ')];
      case ';':
      case ':':
      case ' ':
      case '>':
        return [mo(' ')];
      case 'quad':
        return [mo('  ')];
      case 'qquad':
        return [mo('    ')];
      case '!':
        return [el('mspace', [], [['width', '-0.2em']])];
      case '%':
      case '#':
      case '$':
      case '&':
      case '_':
        return [mo(name)];
      case '{':
      case '}':
        return [mo(name)];
      case '|':
        return [mo('‖')];
      case 'bmod':
      case 'mod':
      case 'pmod':
        return [mi('mod')];
      case 'frac':
      case 'dfrac':
      case 'tfrac': {
        const a = this.group();
        const b = this.group();
        const f = el('mfrac', [a, b]);
        return [name === 'tfrac' ? el('mstyle', [f], [['displaystyle', 'false']]) : f];
      }
      case 'binom':
      case 'dbinom':
      case 'tbinom': {
        const a = this.group();
        const b = this.group();
        return [el('mfenced', [el('mfrac', [a, b], [['linethickness', '0']])])];
      }
      case 'sqrt': {
        let idx: E | null = null;
        if (this.peek()?.k === 'char' && this.peek()!.v === '[') {
          this.i++;
          const items = this.seq((x) => x.k === 'char' && x.v === ']');
          this.i++;
          idx = this.one(items);
        }
        const body = this.argument();
        if (idx) return [el('mroot', [this.one(body), idx])];
        return [el('msqrt', body)];
      }
      case 'text':
      case 'mbox':
      case 'textrm':
      case 'hbox': {
        const t = this.t[this.i];
        if (t && t.k === 'open') {
          let depth = 1;
          let j = this.i + 1;
          while (j < this.t.length && depth > 0) {
            if (this.t[j].k === 'open') depth++;
            else if (this.t[j].k === 'close') depth--;
            if (depth > 0) j++;
          }
          const raw = this.src.slice(t.e ?? 0, this.t[j]?.s ?? this.src.length);
          this.i = j + 1;
          return [tok('mtext', raw.replace(/\\ /g, ' '))];
        }
        return [tok('mtext', this.t[this.i++]?.v ?? '')];
      }
      case 'operatorname': {
        const s = this.rawGroup();
        return [mo(s)];
      }
      case 'mathrm':
      case 'rm':
      case 'textit':
      case 'mathit':
      case 'mathbf':
      case 'bf':
      case 'boldsymbol':
      case 'mathbb':
      case 'mathcal':
      case 'mathfrak':
      case 'mathsf':
      case 'mathtt':
      case 'mathscr':
        return this.styled(name);
      case 'overline':
      case 'bar':
        return [el('mover', [this.group(), mo('¯')])];
      case 'underline':
        return [el('munder', [this.group(), mo('¯')])];
      case 'hat':
      case 'widehat':
        return [el('mover', [this.group(), mo('^')])];
      case 'tilde':
      case 'widetilde':
        return [el('mover', [this.group(), mo('~')])];
      case 'vec':
        return [el('mover', [this.group(), mo('→')], [['accent', 'true']])];
      case 'overrightarrow':
        return [el('mover', [this.group(), mo('→')])];
      case 'overleftarrow':
        return [el('mover', [this.group(), mo('←')])];
      case 'dot':
        return [el('mover', [this.group(), mo('˙')])];
      case 'ddot':
        return [el('mover', [this.group(), mo('‥')])];
      case 'overbrace':
        return [el('mover', [this.group(), mo('⏞')])];
      case 'underbrace':
        return [el('munder', [this.group(), mo('⏟')])];
      case 'cancel':
        return [el('menclose', this.argument(), [['notation', 'updiagonalstrike']])];
      case 'bcancel':
        return [el('menclose', this.argument(), [['notation', 'downdiagonalstrike']])];
      case 'xcancel':
        return [el('menclose', this.argument(), [['notation', 'updiagonalstrike downdiagonalstrike']])];
      case 'boxed':
        return [el('menclose', this.argument(), [['notation', 'box']])];
      case 'overset':
      case 'stackrel': {
        const a = this.group();
        const b = this.group();
        return [el('mover', [b, a])];
      }
      case 'underset': {
        const a = this.group();
        const b = this.group();
        return [el('munder', [b, a])];
      }
      case 'xrightarrow':
      case 'xleftarrow': {
        let under: E | null = null;
        if (this.peek()?.k === 'char' && this.peek()!.v === '[') {
          this.i++;
          under = this.one(this.seq((x) => x.k === 'char' && x.v === ']'));
          this.i++;
        }
        const over = this.group();
        const arrow = mo(name === 'xrightarrow' ? '→' : '←');
        return [el(under ? 'munderover' : 'mover', under ? [arrow, under, over] : [arrow, over])];
      }
      case 'left':
        return this.fenced();
      case 'right':
        throw new LatexError('unexpected \\right');
      case 'begin':
        return this.environment();
      case 'choose':
      case 'over': {
        throw new LatexError('infix ' + name + ' handled by the caller');
      }
      case 'displaystyle':
      case 'textstyle':
      case 'scriptstyle':
      case 'limits':
      case 'nolimits':
      case 'bigl':
      case 'bigr':
      case 'Bigl':
      case 'Bigr':
        return [];
      case 'textdegree':
        return [mo('°')];
    }
    if (OPS[name] !== undefined) {
      const x = OPS[name];
      // big operators carry no explicit largeop for sums/integrals
      return [mo(x)];
    }
    if (SYM_REV[name]) return [mo(SYM_REV[name])];
    return [mi('\\' + name)];
  }

  rawGroup(): string {
    const t = this.t[this.i];
    if (t && t.k === 'open') {
      let s = '';
      this.i++;
      while (this.i < this.t.length && this.t[this.i].k !== 'close') s += this.t[this.i++].v;
      this.i++;
      return s;
    }
    return this.t[this.i++]?.v ?? '';
  }

  styled(name: string): E[] {
    const text = this.rawGroup();
    if (name === 'mathrm' || name === 'rm') {
      // each character becomes an upright identifier / number
      return Array.from(text).map((c) => (/[0-9]/.test(c) ? tok('mn', c) : tok('mi', c, [['mathvariant', 'normal']])));
    }
    if (name === 'mathbf' || name === 'bf' || name === 'boldsymbol') return [tok('mi', text, [['mathvariant', 'bold']])];
    if (name === 'mathit' || name === 'textit') return [tok('mi', text, [['mathvariant', 'italic']])];
    if (name === 'mathbb') return Array.from(text).map((c) => tok('mi', DOUBLE[c] ?? c, [['mathvariant', 'normal']]));
    if (name === 'mathcal' || name === 'mathscr') return Array.from(text).map((c) => (SCRIPT_LETTER[c] ? mo(SCRIPT_LETTER[c]) : tok('mi', c, [['mathvariant', 'script']])));
    if (name === 'mathfrak') return Array.from(text).map((c) => tok('mi', c, [['mathvariant', 'fraktur']]));
    return [tok('mi', text)];
  }

  fenced(): E[] {
    const d = this.t[this.i++];
    if (!d) throw new LatexError('missing delimiter');
    const open = this.delim(d);
    const body = this.seq((x) => x.k === 'cmd' && x.v === 'right');
    if (!(this.peek()?.k === 'cmd' && this.peek()!.v === 'right')) throw new LatexError('missing \\right');
    this.i++;
    const d2 = this.t[this.i++];
    if (!d2) throw new LatexError('missing delimiter');
    const close = this.delim(d2);
    // body may contain a single matrix environment
    const attrs: [string, string][] = [];
    if (close !== ')') attrs.push(['close', close]);
    if (open !== '(') attrs.push(['open', open]);
    const inner = body.length ? [this.one(body)] : [el('mrow', [])];
    return [el('mfenced', body.length === 1 ? body : inner, attrs)];
  }

  delim(t: Tk): string {
    if (t.k === 'cmd') return FENCE['\\' + t.v] ?? OPS[t.v] ?? t.v;
    if (t.k === 'char') return FENCE[t.v] ?? t.v;
    throw new LatexError('bad delimiter');
  }

  environment(): E[] {
    const name = this.rawGroup();
    let colspec = '';
    if (name === 'array' && this.peek()?.k === 'open') colspec = this.rawGroup();
    const rows: E[][][] = [[[]]];
    for (;;) {
      const t = this.peek();
      if (!t) throw new LatexError('missing \\end');
      if (t.k === 'cmd' && t.v === 'end') {
        this.i++;
        this.rawGroup();
        break;
      }
      const cell = this.seq((x) => x.k === 'amp' || x.k === 'nl' || (x.k === 'cmd' && x.v === 'end'));
      rows[rows.length - 1][rows[rows.length - 1].length - 1] = cell;
      const n = this.peek();
      if (n?.k === 'amp') {
        this.i++;
        rows[rows.length - 1].push([]);
      } else if (n?.k === 'nl') {
        this.i++;
        rows.push([[]]);
      }
    }
    // a trailing empty row after the final \\ is dropped
    if (rows.length > 1 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0].length === 0) rows.pop();
    const mkTable = (attrs: [string, string][] = []) =>
      el('mtable', rows.map((r) => el('mtr', r.map((c) => el('mtd', c)))), attrs);
    const align = colspec ? colspec.split('').map((c) => ({ l: 'left', r: 'right', c: 'center' } as Record<string, string>)[c]).filter(Boolean) : [];
    const ca: [string, string][] = align.length && align.some((a) => a !== 'center') ? [['columnalign', align.join(' ')]] : [];
    switch (name) {
      case 'matrix':
      case 'array':
        return [mkTable(ca)];
      case 'pmatrix':
        return [el('mfenced', [mkTable()])];
      case 'bmatrix':
        return [el('mfenced', [mkTable()], [['close', ']'], ['open', '[']])];
      case 'Bmatrix':
        return [el('mfenced', [mkTable()], [['close', '}'], ['open', '{']])];
      case 'vmatrix':
        return [el('mfenced', [mkTable()], [['close', '|'], ['open', '|']])];
      case 'Vmatrix':
        return [el('mfenced', [mkTable()], [['close', '||'], ['open', '||']])];
      case 'cases':
        return [el('mfenced', [mkTable([['columnalign', 'left']])], [['close', ''], ['open', '{']])];
      case 'aligned':
      case 'align':
      case 'align*':
      case 'split':
        return [mkTable([['columnalign', 'right left']])];
      default:
        throw new LatexError('unknown environment ' + name);
    }
  }
}

/* -------------------------------------------------------------- output */

function out(e: E): string {
  const a = (e.a ?? []).map(([k, v]) => ` ${k}="${escText(v)}"`).join('');
  if (e.x !== undefined) return e.x === '' ? `<${e.t}${a}/>` : `<${e.t}${a}>${escText(e.x)}</${e.t}>`;
  const c = e.c ?? [];
  if (e.t === 'mrow' && c.length === 0) return '<mrow/>';
  if (c.length === 0) return `<${e.t}${a}/>`;
  return `<${e.t}${a}>${c.map(out).join('')}</${e.t}>`;
}

function flatten(e: E): E[] {
  // a plain mrow group in a sequence is transparent
  return e.t === 'mrow' ? (e.c ?? []).flatMap(flatten) : [e];
}

/** convert to a Presentation MathML string */
export function latex2mathml(latex: string): string {
  // infix \over and \choose: split the group at the operator
  let src = latex.trim();
  const p = new P(tokenize(src), src);
  let items = p.seq(() => false);
  void src;
  const normalised = items.flatMap((e) => (e.t === 'mrow' && !(e.a && e.a.length) ? flatten(e) : [e]));
  const inf = normalised.findIndex((e) => e.t === 'mi' && e.x === '\\choose');
  void inf;
  items = normalised;
  const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
  if (items.length === 0) return `<math${NS}/>`;
  return `<math${NS}>${items.map(out).join('')}</math>`;
}

export { U };
