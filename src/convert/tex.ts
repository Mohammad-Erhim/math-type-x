/** MathML → LaTeX serialiser in the compact style of the reference service (\frac ab, \sqrt x, x^{a+b}). */
import { parseNormalised, N } from './xml';
import symbols from '../data/symbols.json';

const SYM = symbols as unknown as Record<string, [string | null, string | null]>;

const FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'sinh', 'cosh', 'tanh', 'coth', 'arcsin', 'arccos', 'arctan', 'log', 'ln', 'lg', 'exp', 'lim', 'liminf', 'limsup', 'max', 'min', 'sup', 'inf', 'det', 'dim', 'ker', 'gcd', 'deg', 'arg', 'hom', 'Pr', 'mod']);

const GREEK_TEX: Record<string, string> = {
  α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'epsilon', ζ: 'zeta', η: 'eta', θ: 'theta', ι: 'iota', κ: 'kappa', λ: 'lambda', μ: 'mu', ν: 'nu', ξ: 'xi',
  π: 'pi', ρ: 'rho', σ: 'sigma', τ: 'tau', υ: 'upsilon', φ: 'phi', χ: 'chi', ψ: 'psi', ω: 'omega', ς: 'varsigma', ϑ: 'vartheta', ϕ: 'varphi', ϖ: 'varpi', ϱ: 'varrho', ϵ: 'varepsilon',
  Γ: 'Gamma', Δ: 'Delta', Θ: 'Theta', Λ: 'Lambda', Ξ: 'Xi', Π: 'Pi', Σ: 'Sigma', Υ: 'Upsilon', Φ: 'Phi', Ψ: 'Psi', Ω: 'Omega',
};

const MO_TEX: Record<string, string> = {
  '{': '\\{', '}': '\\}', '%': '\\%', '#': '\\#', '$': '\\$', '&': '\\&', '_': '\\_', '[': '\\lbrack', ']': '\\rbrack', '→': '\\rightarrow', '←': '\\leftarrow',
  '×': '\\times', '±': '\\pm', '∓': '\\mp', '·': '\\cdot', '⋅': '\\cdot', '÷': '\\div', '≤': '\\leq', '≥': '\\geq', '≠': '\\neq',
  '≈': '\\approx', '≡': '\\equiv', '∈': '\\in', '∉': '\\not\\in', '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '∪': '\\cup', '∩': '\\cap', '∅': '\\varnothing', '∞': '\\infty', '∂': '\\partial', '∇': '\\nabla', '∀': '\\forall', '∃': '\\exists',
  '⇒': '\\Rightarrow', '⇔': '\\Leftrightarrow', '↔': '\\leftrightarrow', '…': '\\dots', '⋯': '\\cdots', '⋮': '\\vdots', '⋱': '\\ddots',
  '∧': '\\wedge', '∨': '\\vee', '¬': '\\neg', '∠': '\\angle', '∆': '\\triangle', 'ℜ': '\\Re', 'ℑ': '\\Im', '∑': '\\sum', '∏': '\\prod',
  '∫': '\\int', '∬': '\\iint', '∭': '\\iiint', '∮': '\\oint', ' ': '\\,', ' ': '\;', '′': "'", '−': '-', '∗': '*',
  '⋀': '\\bigwedge', '⋁': '\\bigvee', '⋂': '\\bigcap', '⋃': '\\bigcup', '√': '\\surd', '°': '\\textdegree', '∘': '\\circ',
};

const FENCE_L: Record<string, string> = { '(': '(', '[': '[', '{': '\\{', '|': '|', '||': '\\|', '<': '\\langle', '⌈': '\\lceil', '⌊': '\\lfloor', '⟦': '\\llbracket', '〈': '\\langle', '⟨': '\\langle', ')': ')', ']': ']', '}': '\\}', '>': '\\rangle', '⌉': '\\rceil', '⌋': '\\rfloor', '⟧': '\\rrbracket', '〉': '\\rangle', '⟩': '\\rangle' };
const FENCE_R: Record<string, string> = { ')': ')', ']': ']', '}': '\\}', '|': '|', '||': '\\|', '>': '\\rangle', '⌉': '\\rceil', '⌋': '\\rfloor', '⟧': '\\rrbracket', '〉': '\\rangle', '⟩': '\\rangle' };

const ACCENT_OVER: Record<string, string> = { '¯': '\\overline', '^': '\\widehat', 'ˆ': '\\widehat', '~': '\\widetilde', '˜': '\\widetilde', '˙': '\\dot', '‥': '\\ddot', '→': '\\overrightarrow', '←': '\\overleftarrow', '↔': '\\overleftrightarrow', '⏞': '\\overbrace', '¨': '\\ddot', 'ˇ': '\\check', '´': '\\acute', '`': '\\grave' };
const ACCENT_UNDER: Record<string, string> = { '¯': '\\underline', '_': '\\underline', '⏟': '\\underbrace' };
const BIG_CMD: Record<string, string> = { '∩': '\\bigcap', '∪': '\\bigcup', '⊔': '\\bigsqcup', '∨': '\\bigvee', '∧': '\\bigwedge', '⊗': '\\bigotimes', '⊕': '\\bigoplus', '⊙': '\\bigodot', '⨄': '\\biguplus' };
const ARROW_X = new Set(['\u2192', '\u2190']);
const BIGOPS = new Set(['∑', '∏', '∐', '∫', '∬', '∭', '∮', '⋀', '⋁', '⋂', '⋃', '⨀', '⨁', '⨂', '⨆']);
const ENCLOSE_TEX: Record<string, string> = { updiagonalstrike: '\\cancel', downdiagonalstrike: '\\bcancel', horizontalstrike: '\\cancel', verticalstrike: '\\bcancel', 'downdiagonalstrike updiagonalstrike': '\\xcancel', 'updiagonalstrike downdiagonalstrike': '\\xcancel', 'verticalstrike horizontalstrike': '\\xcancel', 'horizontalstrike verticalstrike': '\\xcancel', box: '\\boxed', roundedbox: '\\boxed', circle: '\\boxed', top: '\\overline', bottom: '\\underline' };

export class TexError extends Error {}

function flat(ns: N[]): N[] {
  return ns.flatMap((n) => (n.t === 'mrow' ? flat(n.c) : [n]));
}

/** a rendered fragment; `lead`: first char class for spacing, `cmd`: ends with a control word */
interface F {
  s: string;
  /** true when the fragment is a single token that does not need braces as an argument */
  atom: boolean;
}

class Tex {
  join(parts: string[]): string {
    let o = '';
    for (const p of parts) {
      if (p === '') continue;
      if (o && /\\[A-Za-z]+$/.test(o) && /^[A-Za-z]/.test(p)) o += ' ';
      o += p;
    }
    return o;
  }

  list(ns: N[]): string {
    const f = flat(ns);
    return this.join(f.map((n, i) => {
      if (i > 0 && n.t === 'mo' && n.x === '°') return '^\\circ';
      const t = this.node(n);
      // an inline-style group that follows other content is braced so that it stays local
      if (i > 0 && n.t === 'mstyle' && n.a.displaystyle === 'false' && t.startsWith('\\textstyle')) return '{' + t + '}';
      return t;
    }));
  }

  /** argument of a command: braces unless a single token */
  arg(ns: N[]): string {
    const f = flat(ns);
    if (f.length === 0) return '{}';
    if (f.length === 1 && this.isAtom(f[0])) return this.node(f[0]);
    return '{' + this.list(f) + '}';
  }

  isAtom(n: N): boolean {
    if (n.t === 'mn') return (n.x ?? '').length === 1 || /^\d+$/.test(n.x ?? '') && (n.x ?? '').length === 1;
    if (n.t === 'mi') return [...(n.x ?? '')].length === 1 && !n.a.mathvariant;
    if (n.t === 'mo') {
      const s = this.token(n);
      return s.length === 1 || /^\\[A-Za-z]+$/.test(s);
    }
    return false;
  }

  slot(n: N, i: number): N[] {
    const c = n.c[i];
    if (!c) return [];
    if (c.t === 'maction' && c.a.actiontype === 'argument') return flat(c.c);
    return flat([c]);
  }

  token(n: N): string {
    const x = n.x ?? '';
    const mv = n.a.mathvariant;
    if (n.t === 'mn') {
      if (mv === 'bold') return `\\mathbf{${x}}`;
      if (mv === 'double-struck') throw new TexError('unsupported variant');
      return x;
    }
    if (n.t === 'mtext') return `\\text{${x.replace(/ /g, ' ')}}`;
    // mathematical double-struck letters written as characters
    {
      const cp = x.codePointAt(0) ?? 0;
      const ch = [...x];
      if (ch.length === 1 && ((cp >= 0x1d538 && cp <= 0x1d56b) || (cp >= 0x1d7d8 && cp <= 0x1d7e1))) {
        const letter = cp >= 0x1d7d8 ? String.fromCharCode(0x30 + cp - 0x1d7d8) : cp >= 0x1d552 ? String.fromCharCode(0x61 + cp - 0x1d552) : String.fromCharCode(0x41 + cp - 0x1d538);
        return '\\mathbb{' + letter + '}';
      }
    }
    // variants the service cannot write
    if (mv && /^(double-struck|bold-fraktur|bold-script|sans-serif|bold-sans-serif|sans-serif-italic|sans-serif-bold-italic)$/.test(mv)) throw new TexError('unsupported variant');
    if (mv === 'monospace' && n.t === 'mi' && [...x].length === 1) return '\\mathtt ' + x;
    if (n.t === 'mi') {
      const chars = [...x];
      if (chars.length === 1) {
        const k = `mi|${mv ? `mathvariant="${mv}"` : ''}|${x}`;
        const hit = SYM[k];
        if (hit && hit[1]) return hit[1];
        if (mv === 'script') return `\\mathcal ${x}`;
        if (mv === 'fraktur') return `\\mathfrak ${x}`;
        if (mv === 'double-struck') return `\\mathbb{${x}}`;
        if (mv === 'bold' || mv === 'bold-italic') return `\\mathbf ${GREEK_TEX[x] ? '\\' + GREEK_TEX[x] : x}`;
        if (mv === 'normal') return /[A-Za-z]/.test(x) ? `\\mathrm ${x}` : GREEK_TEX[x] ? `\\mathrm\\${GREEK_TEX[x]}` : x;
        if (GREEK_TEX[x]) return '\\' + GREEK_TEX[x];
        if (x === 'ℏ') return '\\hslash';
        if (x === 'ℓ') return '\\ell';
        return x;
      }
      if (FUNCS.has(x)) return `\\${x}`;
      if (mv === 'italic') return `\\mathit{${x}}`;
      if (mv === 'bold' || mv === 'bold-italic') return `\\mathbf{${x}}`;
      return /^[A-Za-z]+$/.test(x) ? `\\mathrm{${x}}` : x;
    }
    // mo
    const NB = String.fromCharCode(160);
    if (x === NB) return '\\;';
    if (x === NB + NB) return '\\quad';
    if (n.a.largeop === 'true' && x === '') throw new TexError('empty big operator');
    if (n.a.largeop === 'true' && BIG_CMD[x]) return BIG_CMD[x];
    const hit = SYM[`mo|${n.a.largeop ? 'largeop="true"' : ''}|${x}`] ?? SYM[`mo||${x}`];
    if (MO_TEX[x]) return MO_TEX[x];
    if (hit && hit[1]) return hit[1];
    if ([...x].length > 1 && /^[A-Za-z]+$/.test(x)) return `\\operatorname{${x}}`;
    return x;
  }

  node(n: N): string {
    switch (n.t) {
      case 'mi':
      case 'mn':
      case 'mo':
      case 'mtext':
        return this.token(n);
      case 'mspace': {
        if (n.a.linebreak === 'newline') return '\\\\';
        const w = n.a.width;
        if (w === '-0.2em') return '\\!';
        if (w === '1em') return '\\quad';
        return '\;';
      }
      case 'mfrac': {
        const lt = n.a.linethickness;
        const num = this.arg(this.slot(n, 0));
        const den = this.arg(this.slot(n, 1));
        if (lt === '0') return this.join(['\\binom', num, den]);
        return this.join(['\\frac', num, den]);
      }
      case 'msqrt': {
        const k = flat(n.c);
        return this.join(['\\sqrt', this.arg(k)]);
      }
      case 'mroot': {
        const idx = this.slot(n, 1);
        return this.join(['\\sqrt', '[' + this.list(idx) + ']'.replace(/^\[\]$/, '[{}]'), this.arg(this.slot(n, 0))]).replace('[]', '[{}]');
      }
      case 'msup':
      case 'msub':
      case 'msubsup':
        return this.scripts(n);
      case 'munder':
      case 'mover':
      case 'munderover':
        return this.limits(n);
      case 'mfenced':
        return this.fenced(n);
      case 'mtable':
        return this.table(n, 'array');
      case 'mstack':
        return this.stack(n);
      case 'mlongdiv':
      case 'msgroup':
      case 'mscarries':
      case 'msrow':
      case 'msline':
        throw new TexError('unsupported element ' + n.t);
      case 'menclose': {
        const k = flat(n.c);
        const nt = (n.a.notation ?? 'longdiv').trim();
        if (nt === 'left') return `\\left|${this.list(k)}\\right.`;
        if (nt === 'right') return `\\left.${this.list(k)}\\right|`;
        if (nt === 'actuarial') return `\\overline{\\left.${this.list(k)}\\right|}`;
        if (nt === 'longdiv') return `\\overline{\\left)${this.list(k)}\\right.}`;
        if (nt === 'madruwb' || nt === 'radical' || nt === 'phasorangle') throw new TexError('unsupported notation');
        const cmd = ENCLOSE_TEX[nt] ?? '\\boxed';
        if (k.length === 0 && n.c.length === 0) throw new TexError('empty enclosure');
        if (k.length === 0) return cmd + '{}';
        return this.join([cmd, this.arg(k)]);
      }
      case 'mstyle': {
        const k = flat(n.c);
        if (n.a.displaystyle === 'false') return this.join(['\\textstyle', this.list(k)]);
        return this.list(k);
      }
      case 'maction':
        if (n.a.actiontype === 'argument' && flat(n.c).length === 0) return '{}';
        return this.list(n.c);
      case 'mpadded':
      case 'mrow':
      case 'merror':
      case 'mphantom':
        return this.list(n.c);
      case 'none':
      case 'mprescripts':
        return '';
      case 'mmultiscripts':
        return this.multi(n);
      default:
        throw new TexError('unsupported element ' + n.t);
    }
  }

  multi(n: N): string {
    const kids = n.c;
    const pre = kids.findIndex((k) => k.t === 'mprescripts');
    const base = this.arg(this.slotOfKid(kids[0]));
    const post = pre < 0 ? kids.slice(1) : kids.slice(1, pre);
    const prescr = pre < 0 ? [] : kids.slice(pre + 1);
    const sc = (list: N[]) => {
      let o = '';
      for (let i = 0; i < list.length; i += 2) {
        const sub = list[i];
        const sup = list[i + 1];
        if (sub && sub.t !== 'none') o += '_' + this.brace(this.slotOfKid(sub));
        if (sup && sup.t !== 'none') o += '^' + this.brace(this.slotOfKid(sup));
      }
      return o;
    };
    const p = sc(prescr);
    const q = sc(post);
    return (p ? '{}' + p : '') + this.join([base]) + q;
  }

  slotOfKid(n: N | undefined): N[] {
    if (!n) return [];
    if (n.t === 'maction' && n.a.actiontype === 'argument') return flat(n.c);
    return flat([n]);
  }

  /** script argument: braces unless single atom */
  brace(ns: N[]): string {
    const f = flat(ns);
    if (f.length === 0) return '{}';
    if (f.length === 1 && this.isAtom(f[0])) {
      const s = this.node(f[0]);
      return s.startsWith('\\') ? s : s.length === 1 ? s : '{' + s + '}';
    }
    return '{' + this.list(f) + '}';
  }

  scripts(n: N): string {
    const baseN = this.slot(n, 0);
    let base: string;
    if (baseN.length === 0) base = n.t === 'msub' ? '{{}}' : '{}';
    else if (baseN.length === 1 && baseN[0].t === 'mfenced') base = '{' + this.node(baseN[0]) + '}';
    else if (baseN.length === 1 && (baseN[0].t === 'mover' || baseN[0].t === 'munder') && /^\\(overbrace|underbrace)/.test(this.node(baseN[0]))) base = this.node(baseN[0]);
    else if (baseN.length === 1 && (this.isAtom(baseN[0]) || ['mn', 'mi', 'mo'].includes(baseN[0].t))) base = this.node(baseN[0]);
    else base = '{' + this.list(baseN) + '}';
    const b0 = baseN[0];
    const bigop = baseN.length === 1 && b0.t === 'mo' && BIGOPS.has(b0.x ?? '');
    let o = base;
    const sub = n.t === 'msup' ? null : this.slot(n, 1);
    const sup = n.t === 'msub' ? null : this.slot(n, n.t === 'msup' ? 1 : 2);
    if (sub) o += '_' + this.brace(sub);
    if (sup) o += '^' + this.brace(sup);
    void bigop;
    return o;
  }

  limits(n: N): string {
    const base = this.slot(n, 0);
    const b0 = base[0];
    const under = n.t === 'mover' ? null : this.slot(n, 1);
    const over = n.t === 'munder' ? null : this.slot(n, n.t === 'mover' ? 1 : 2);
    const op = base.length === 1 && b0 && b0.t === 'mo' ? b0.x ?? '' : '';
    const isLim = base.length === 1 && b0 && b0.t === 'mi' && FUNCS.has(b0.x ?? '');
    // accents
    if (n.t === 'mover' && over && over.length === 1 && over[0].t === 'mo' && ACCENT_OVER[over[0].x ?? ''] && !(ARROW_X.has(op))) {
      const cmd = over[0].x === '\u2192' && n.a.accent === 'true' ? '\\vec' : ACCENT_OVER[over[0].x!];
      return this.join([cmd, this.arg(base)]);
    }
    if (n.t === 'munder' && under && under.length === 1 && under[0].t === 'mo' && ACCENT_UNDER[under[0].x ?? '']) {
      return this.join([ACCENT_UNDER[under[0].x!], this.arg(base)]);
    }
    // braces on a nested stack: \underbrace{a+b}_{n}
    if (n.t === 'munder' && b0 && base.length === 1 && b0.t === 'munder') {
      const inner = this.slot(b0, 1);
      if (inner.length === 1 && inner[0].t === 'mo' && inner[0].x === '⏟') return this.join(['\\underbrace', this.arg(this.slot(b0, 0)), '_' + this.brace(under!)]);
    }
    if (n.t === 'mover' && b0 && base.length === 1 && b0.t === 'mover') {
      const inner = this.slot(b0, 1);
      if (inner.length === 1 && inner[0].t === 'mo' && inner[0].x === '⏞') return this.join(['\\overbrace', this.arg(this.slot(b0, 0)), '^' + this.brace(over!)]);
    }
    if (ARROW_X.has(op) && n.t !== 'munder' && n.t !== 'mover') {
      const cmd = { '→': '\\xrightarrow', '←': '\\xleftarrow' }[op] ?? '\\xrightarrow';
      return this.join([cmd, '[' + this.list(under!) + ']'.replace('[]', '[{}]'), this.arg(over!)]).replace('[]', '[{}]');
    }
    if (ARROW_X.has(op) && n.t === 'munder') {
      const cmd = { '→': '\\xrightarrow', '←': '\\xleftarrow' }[op] ?? '\\xrightarrow';
      return this.join([cmd, '[' + (under!.length ? this.list(under!) : '{}') + ']', '{}']);
    }
    if (ARROW_X.has(op) && n.t === 'mover') {
      const cmd = { '→': '\\xrightarrow', '←': '\\xleftarrow' }[op] ?? '\\xrightarrow';
      return this.join([cmd, this.arg(over!)]);
    }
    if (BIGOPS.has(op) || isLim || (b0 && b0.t === 'mo' && b0.a.largeop === 'true')) {
      let o = this.node(b0);
      if (b0.t === 'mo' && b0.a.largeop === 'true' && op !== '' && !MO_TEX[op] && !(SYM[`mo||${op}`] && SYM[`mo||${op}`][1])) o = `\\mbox{\\large$${op}$}`;
      if (n.t === 'munderover' && ['∫', '∬', '∭', '∮'].includes(op)) o += '\\limits';
      if (under) o += '_' + this.brace(under);
      if (over) o += '^' + this.brace(over);
      return o;
    }
    // generic
    let o: string;
    if (n.t === 'mover') o = this.join(['\\overset', this.arg(over!), this.arg(base)]);
    else if (n.t === 'munder') o = this.join(['\\underset', this.arg(under!), this.arg(base)]);
    else o = this.join(['\\overset', this.arg(over!), '{' + this.join(['\\underset', this.arg(under!), this.arg(base)]) + '}']);
    return o;
  }

  fenced(n: N): string {
    const open = n.a.open ?? '(';
    const close = n.a.close ?? ')';
    const kids = n.c;
    // binomial coefficient: default parentheses around a zero-thickness fraction
    if (open === '(' && close === ')' && kids.length === 1) {
      const only = flat([kids[0]]);
      if (only.length === 1 && only[0].t === 'mfrac' && only[0].a.linethickness === '0') return this.node(only[0]);
    }
    // matrices
    if (kids.length === 1 && flat([kids[0]]).length === 1 && flat([kids[0]])[0].t === 'mtable') {
      const t = flat([kids[0]])[0];
      const env: Record<string, string> = { '(|)': 'pmatrix', '[|]': 'bmatrix', '||': 'vmatrix', '{|}': 'Bmatrix' };
      const key = open === '|' && close === '|' ? '||' : `${open}|${close}`;
      const noAttr = !t.a.columnalign && !t.a.columnspacing;
      if (env[key] && noAttr) return this.table(t, env[key]);
      return `\\left${FENCE_L[open] ?? (open === '' ? '.' : open)}${this.table(t, 'array')}\\right${FENCE_R[close] ?? (close === '' ? '.' : close)}`;
    }
    const seps = (n.a.separators ?? ',').replace(/\s+/g, '');
    const parts = kids.map((k) => this.list(this.slotOfKid(k)));
    let body = '';
    parts.forEach((p, i) => {
      body += p === '' && kids.length > 1 && i < parts.length - 1 ? '{}' : p;
      if (i < parts.length - 1) {
        const sc = seps.length ? seps[Math.min(i, seps.length - 1)] : '';
        body += sc === '|' ? '\\vert{}' : sc === '' ? '' : sc;
      }
    });
    if (kids.length === 0 || (kids.length === 1 && parts[0] === '')) body = '';
    const o = open === '' ? '.' : FENCE_L[open] ?? open;
    const c = close === '' ? '.' : FENCE_R[close] ?? close;
    return `\\left${o}${/\\[A-Za-z]+$/.test(o) && /^[A-Za-z]/.test(body) ? ' ' : ''}${body}\\right${c}`;
  }

  /** an elementary stack: one right aligned column, lines as \hline (the service writes nothing else) */
  stack(n: N): string {
    let out = '';
    let first = true;
    let afterLine = false;
    for (const it of n.c) {
      if (it.t === 'msline') {
        if (afterLine) throw new TexError('two lines');
        if (!first) out += '\\\\';
        out += '\\hline';
        afterLine = true;
        first = false;
        continue;
      }
      if (it.t === 'mscarries' || it.t === 'msgroup' || it.t === 'mlongdiv') throw new TexError('unsupported stack item');
      let row: string;
      if (it.t === 'msrow') {
        if (it.c.length === 0 || it.c.some((c) => c.t === 'none')) throw new TexError('empty cell');
        row = this.list(it.c);
      } else row = this.list([it]);
      if (!first && !afterLine) out += '\\\\';
      out += row;
      afterLine = false;
      first = false;
    }
    return '\\begin{array}{r}' + out + '\\end{array}';
  }

  table(n: N, env: string): string {
    const rows = n.c.filter((r) => r.t === 'mtr');
    const cols = Math.max(1, ...rows.map((r) => r.c.length));
    const al = (n.a.columnalign ?? 'center').split(/\s+/);
    const letters = Array.from({ length: cols }, (_, i) => ({ left: 'l', right: 'r', center: 'c' } as Record<string, string>)[al[i]] ?? 'c').join('');
    const body = rows.map((r) => r.c.map((cell) => this.list(cell.t === 'mtd' ? cell.c : [cell])).join('&')).join('\\\\');
    return env === 'array' ? `\\begin{array}{${letters}}${body}\\end{array}` : `\\begin{${env}}${body}\\end{${env}}`;
  }
}

export function mathml2latex(mml: string): string {
  const { kids } = parseNormalised(mml);
  return new Tex().list(kids);
}
