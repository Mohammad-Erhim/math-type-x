/**
 * mathml2accessible: English description of a formula in the style of the reference service
 * ("x plus 1 fraction numerator a greater than over denominator blank end fraction").
 */
import { parseNormalised, N } from './xml';
import symbols from '../data/symbols.json';

const SYM = symbols as unknown as Record<string, [string | null, string | null]>;

const ASCII_NAMES: Record<string, string> = {
  '+': 'plus', '-': 'minus', '\u2212': 'minus', '=': 'equals', '<': 'less than', '>': 'greater than',
  '(': 'open parenthesis', ')': 'close parenthesis', '[': 'open bracket', ']': 'close bracket', '{': 'open brace', '}': 'close brace',
  ',': 'comma', '.': 'point', ';': 'semicolon', ':': 'colon', '!': 'factorial', '?': 'question mark', '|': 'vertical bar', '\\': 'backslash',
  '%': 'percent sign', '&': 'ampersand', '#': 'number sign', '$': 'dollar', '@': 'at', '^': 'caret', '~': 'tilde', '`': 'grave accent',
  "'": 'prime', '"': 'double quote', '\u00A0': 'space', '\u00D7': 'times', '\u00F7': 'divided by', '\u00B1': 'plus or minus',
  '\u2213': 'minus-or-plus', '\u00AF': 'bar', '\u2025': 'two dots', '\u22C5': 'times', '\u211C': 'real part', '\u2111': 'imaginary part', '\u2207': 'nabla',
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
  '|': 'vertical bar', '||': 'double vertical bar', '<': 'angle brackets', '>': 'angle brackets', '〈': 'angle brackets', '〉': 'angle brackets',
  '⌊': 'floor', '⌋': 'floor', '⌈': 'ceil', '⌉': 'ceil', '⟦': 'white square brackets', '⟧': 'white square brackets',
  '⟨': 'angle brackets', '⟩': 'angle brackets',
};

const SEP_NAMES: Record<string, string> = { ',': 'comma', '.': 'point', ';': 'semicolon', ':': 'colon', ' ': 'space', '|': 'vertical line' };

/** the reference service answers some inputs with "Error converting …" */
export class AccessibleError extends Error {}

/** empty big operators that are the placeholder of an editable operator slot (maction argument) */
const inPlaceholder = new WeakSet<object>();

const ENCLOSE: Record<string, string> = {
  longdiv: 'long division enclose', actuarial: 'actuarial enclose', box: 'box enclose', roundedbox: 'rounded box enclose', circle: 'circle enclose',
  left: 'left enclose', right: 'right enclose', top: 'top enclose', bottom: 'bottom enclose',
  updiagonalstrike: 'up diagonal strike', downdiagonalstrike: 'down diagonal strike', verticalstrike: 'vertical strike', horizontalstrike: 'horizontal strike',
  'downdiagonalstrike updiagonalstrike': 'down diagonal up diagonal strike', 'updiagonalstrike downdiagonalstrike': 'up diagonal down diagonal strike',
  madruwb: 'arabic factorial enclose', radical: 'square root enclose', phasorangle: 'phasor angle enclose',
  'verticalstrike horizontalstrike': 'vertical horizontal strike', 'horizontalstrike verticalstrike': 'vertical horizontal strike',
};

const TABLE_ATTR_ORDER = ['columnalign', 'columnspacing'];

function tokenName(tag: string, attrs: Record<string, string>, text: string): string {
  const mv = attrs.mathvariant;
  const key = `${tag}|${mv ? `mathvariant="${mv}"` : ''}|${text}`;
  const hit = SYM[key];
  if (hit && hit[0]) return hit[0];
  if (tag === 'mn') return text;
  if (tag === 'mi') {
    if (text.length === 1 || [...text].length === 1) {
      const g = GREEK[text.toLowerCase()];
      if (g) return text === text.toLowerCase() ? g : 'capital ' + g;
    }
    const base = text;
    if (mv === 'script') return 'calligraphic ' + base;
    if (mv === 'fraktur') return 'fraktur ' + base;
    if (mv === 'double-struck') return 'double-struck ' + base;
    if (mv === 'bold' || mv === 'bold-italic') return 'bold ' + base;
    return base;
  }
  const any = SYM[`${tag}||${text}`];
  if (any && any[0]) return any[0];
  if (text.length === 1 && ASCII_NAMES[text]) return ASCII_NAMES[text];
  if (tag === 'mtext') return text.replace(/ /g, ' ');
  return text.split('').map((c) => ASCII_NAMES[c] ?? c).join(' ');
}

function flat(ns: N[]): N[] {
  return ns.flatMap((n) => (n.t === 'mrow' ? flat(n.c) : [n]));
}

class Speaker {
  /** more than one token in the formula: delimiters typed as operators are read left/right */
  paren = false;

  /** speak a list of sibling nodes */
  list(ns0: N[]): string {
    const ns = flat(ns0);
    // paired delimiters typed as plain operators are read "left … right"
    const open = new Map<N, string>();
    const stack: { n: N; ch: string }[] = [];
    const CLOSE: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    const NAMES: Record<string, [string, string]> = { '(': ['left parenthesis', 'right parenthesis'], '[': ['left square bracket', 'right square bracket'], '{': ['left curly bracket', 'right curly bracket'] };
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
    for (let i = 0; i < ns.length; i++) {
      const n = ns[i];
      const nx = ns[i + 1];
      const pv = out[out.length - 1];
      if (n.t === 'mo' && n.x === '.' && ((pv && pv.t === 'mn' && nx && nx.t === 'mn') || (nx && nx.t === 'mn' && (!pv || pv.t !== 'mn')) || (pv && pv.t === 'mn' && !nx))) {
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
        // unary minus before a number / identifier at the start or after an operator or open fence
        if (n.t === 'mo' && n.x === '\u2213' && i > 0) return 'minus-or-plus';
        if (n.t === 'mo' && (n.x === '-' || n.x === '\u2212') && ns[i + 1] && (ns[i + 1].t !== 'mo' || /^[0-9]/.test(ns[i + 1].x ?? '')) && (i === 0 || (ns[i - 1].t === 'mo' && !/[)\]}]/.test(ns[i - 1].x ?? '')))) return 'negative';
        return this.node(n);
      })
      .filter((s) => s !== '')
      .reduce((acc, w) => (acc === '' ? w : acc.endsWith('\n') || w === '\n' ? acc + w : acc + ' ' + w), '');
  }

  /** numerator/denominator that may be spoken without the long fraction form */
  fracSimple(ns: N[]): boolean {
    if (ns.length === 0) return true;
    if (ns.length !== 1) return false;
    const n = ns[0];
    if (['mi', 'mn', 'mo', 'mtext', 'mspace'].includes(n.t)) return true;
    if (n.t === 'msup' || n.t === 'msub' || n.t === 'msubsup') return n.c.every((c) => this.fracSimple(this.slotOf(c)) && flat([c]).every((k) => k.c.length === 0 || k.t === 'maction'));
    return false;
  }

  isSimple(ns: N[]): boolean {
    return ns.length === 0 || (ns.length === 1 && ['mi', 'mn', 'mo', 'mtext', 'mspace'].includes(ns[0].t));
  }

  arg(ns: N[]): string {
    return ns.length ? this.list(ns) : 'blank';
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
    switch (n.t) {
      case 'mi':
      case 'mn':
      case 'mo':
        if (n.t === 'mo' && n.a.largeop === 'true' && !n.x && !inPlaceholder.has(n)) throw new AccessibleError('empty big operator');
        if (n.a.mathvariant && /^(bold-fraktur|bold-script|sans-serif|bold-sans-serif|sans-serif-italic|sans-serif-bold-italic|monospace)$/.test(n.a.mathvariant)) throw new AccessibleError('unsupported variant');
        if (n.t === 'mn' && n.a.mathvariant === 'double-struck') return 'double-struck ' + (n.x ?? '').replace(/,/g, '');
        if (n.t === 'mo' && n.a.largeop === 'true') return 'large ' + (n.x ? tokenName(n.t, {}, n.x) : 'blank');
        if (n.t === 'mo' && this.paren && LR[n.x ?? '']) return LR[n.x!];
        if (n.t === 'mo' && n.x === '\u2007') return 'number space';
        if (n.t === 'mo' && (n.x ?? '').length > 1 && /^[\u00A0]+$/.test(n.x!)) return n.x!;
        if (n.t === 'mn' && n.a.mathvariant === 'bold') return 'bold ' + (n.x ?? '').replace(/,/g, '');
        if (n.t === 'mn' && n.a.mathvariant === 'italic') return 'italic ' + (n.x ?? '').replace(/,/g, '');
        if (n.t === 'mn') return (n.x ?? '').replace(/,/g, '');
        if (n.t === 'mo' && n.a.mathvariant === 'bold') return 'bold ' + tokenName('mo', {}, n.x ?? '');
        if (n.t === 'mi' && n.a.mathvariant === 'bold-italic') return 'bold italic ' + tokenName('mi', {}, n.x ?? '');
        if (n.t === 'mi' && n.a.mathvariant === 'italic') return [...(n.x ?? '')].length > 1 ? 'italic ' + (n.x ?? '') : tokenName('mi', {}, n.x ?? '');
        if (n.t === 'mo' && /^[A-Za-z]{2,}$/.test(n.x ?? '')) return n.x!;
        if (n.t === 'mi' && n.a.mathvariant === 'normal' && [...(n.x ?? '')].length === 1 && !SYM[`mi|mathvariant="normal"|${n.x}`]) return 'straight ' + tokenName('mi', {}, n.x ?? '');
        if (n.t === 'mo' && n.x === '\u200A') return '\u200A';
        return tokenName(n.t, n.a, n.x ?? '');
      case 'mtext':
        return `text ${n.x ?? ''} end text`;
      case 'mspace': {
        if (n.a.linebreak === 'newline') return '\n';
        if (n.a.width === '-0.2em') return 'back space';
        if (n.a.width) return `space of ${n.a.width}`;
        return 'blank';
      }
      case 'none':
      case 'mprescripts':
        return '';
      case 'mfrac': {
        const num = this.slot(n, 0);
        const den = this.slot(n, 1);
        const bev = n.a.bevelled === 'true' ? 'bevelled ' : '';
        if (this.fracSimple(num) && this.fracSimple(den)) {
          const a = this.arg(num);
          const b = this.arg(den);
          const ord: Record<string, string> = { '2': 'half', '3': 'third', '4': 'fourth', '5': 'fifth' };
          if (!bev && a === '1' && ord[b] && den[0]?.t === 'mn') return `1 ${ord[b]}`;
          return `${bev}${a} over ${b}`;
        }
        return `${bev}fraction numerator ${this.arg(num)} over denominator ${this.arg(den)} end fraction`;
      }
      case 'msqrt': {
        const body = this.kids(n);
        if (body.length === 0) return 'square root of blank end root';
        if (this.isSimple(body)) return `square root of ${this.list(body)}`;
        return `square root of ${this.list(body)} end root`;
      }
      case 'mroot': {
        const rad = this.slot(n, 0);
        const idx = this.slot(n, 1);
        const end = this.isSimple(rad) ? '' : ' end root';
        const i0 = idx[0];
        if (idx.length === 1 && i0.t === 'mn') {
          const words: Record<string, string> = { '2': 'square root of', '3': 'cube root of', '4': 'fourth root of', '5': 'fifth root of' };
          if (words[i0.x ?? '']) return `${words[i0.x!]} ${this.arg(rad)}${end}`;
        }
        if (idx.length === 1 && i0.t === 'mi') return `${i0.x}-th root of ${this.arg(rad)}${end}`;
        return `root index ${this.arg(idx)} of ${this.arg(rad)}${end}`;
      }
      case 'msup': {
        const base = this.slot(n, 0);
        const e = this.slot(n, 1);
        if (this.isSimple(e) && e.length === 1 && e[0].t === 'mn') {
          if (e[0].x === '2') return `${this.arg(base)} squared`;
          if (e[0].x === '3') return `${this.arg(base)} cubed`;
        }
        if (this.isSimple(e)) return `${this.arg(base)} to the power of ${this.arg(e)}`;
        return `${this.arg(base)} to the power of ${this.arg(e)} end exponent`;
      }
      case 'msub': {
        const base = this.slot(n, 0);
        const s = this.slot(n, 1);
        if (this.isSimple(s)) return `${this.arg(base)} subscript ${this.arg(s)}`;
        return `${this.arg(base)} subscript ${this.arg(s)} end subscript`;
      }
      case 'msubsup': {
        const base = this.slot(n, 0);
        const sb = this.slot(n, 1);
        const sp = this.slot(n, 2);
        const subEnd = sb.length > 1 || (sb.length === 1 && !['mi', 'mn', 'mo'].includes(sb[0].t)) ? ' end subscript' : '';
        const supEnd = sp.length > 1 || (sp.length === 1 && !['mi', 'mn', 'mo'].includes(sp[0].t)) ? ' end superscript' : '';
        return `${this.arg(base)} subscript ${this.arg(sb)}${subEnd} superscript ${this.arg(sp)}${supEnd}`;
      }
      case 'mmultiscripts': {
        const kids = n.c;
        const pre = kids.findIndex((k) => k.t === 'mprescripts');
        const base = kids[0] ? this.slotOf(kids[0]) : [];
        const post = pre < 0 ? kids.slice(1) : kids.slice(1, pre);
        const prescr = pre < 0 ? [] : kids.slice(pre + 1);
        let o = this.arg(base);
        const emit = (list: N[], pfx: string) => {
          for (let i = 0; i < list.length; i += 2) {
            const sub = list[i];
            const sup = list[i + 1];
            if (sub && sub.t !== 'none') o += ` ${pfx}subscript ${this.arg(this.slotOf(sub))}`;
            if (sup && sup.t !== 'none') o += ` ${pfx}superscript ${this.arg(this.slotOf(sup))}`;
          }
        };
        emit(prescr, 'pre');
        emit(post, '');
        return o;
      }
      case 'munder':
      case 'mover':
      case 'munderover':
        return this.underOver(n);
      case 'mfenced': {
        const open = n.a.open ?? '(';
        const close = n.a.close ?? ')';
        const seps = n.a.separators ?? ',';
        const parts: string[] = [];
        n.c.forEach((c, i) => {
          parts.push(this.arg(this.slotOf(c)));
          if (i < n.c.length - 1) {
            const sc = seps.replace(/\s+/g, '').length ? seps.replace(/\s+/g, '')[Math.min(i, seps.replace(/\s+/g, '').length - 1)] : '';
            if (sc) parts.push(SEP_NAMES[sc] ?? sc);
          }
        });
        if (n.c.length === 0) parts.push('blank');
        const o = open === '' ? 'open' : `open ${FENCE_NAMES[open] ?? open}`;
        const c = close === '' ? 'close' : `close ${FENCE_NAMES[close] ?? close}`;
        return `${o} ${parts.join(' ')} ${c}`;
      }
      case 'mtable':
        return this.table(n);
      case 'menclose': {
        const nt = (n.a.notation ?? 'longdiv').trim().replace(/\s+/g, ' ');
        const name = ENCLOSE[nt] ?? nt + ' enclose';
        const strike = / strike$/.test(name);
        const body = this.kids(n);
        if (body.length === 0 && n.c.length > 0) return `${name} blank`;
        if (body.length === 0) return `${name} blank end ${strike ? 'strike' : 'enclose'}`;
        return `${name} ${this.list(body)}${body.length > 1 ? ` end ${strike ? 'strike' : 'enclose'}` : ''}`;
      }
      case 'mstyle': {
        if (n.a.displaystyle === 'false') return `begin inline style ${this.list(this.kids(n))} end style`;
        if (n.a.displaystyle === 'true') return `begin display style ${this.list(this.kids(n))} end style`;
        if (n.a.mathsize) return `begin mathsize ${n.a.mathsize} style ${this.list(this.kids(n))} end style`;
        return this.list(this.kids(n));
      }
      case 'maction':
        if (n.a.actiontype === 'argument' && this.kids(n).length === 0) return 'blank';
        return this.list(this.kids(n));
      case 'mpadded':
      case 'mrow':
      case 'merror':
      case 'mphantom':
        return this.list(this.kids(n));
      case 'mlongdiv': {
        const style = n.a.longdivstyle === 'shortstackedrightright' ? 'long division with stack on the left by' : 'long division by';
        const divisor = this.arg(this.slotOf(n.c[0]));
        const group = n.c.slice(2);
        const rows = group.flatMap((g) => (g.t === 'msgroup' ? flat(g.c) : [g]));
        const spoken = rows.map((r) => (r.t === 'msline' ? 'horizontal line' : this.arg(this.slotOf(r))));
        return `${style} ${divisor} yields ${this.arg(this.slotOf(n.c[1]))} pile ${spoken.join(' ')} end pile end long division`;
      }
      case 'mstack': {
        // the service only reads stacks that carry both alignments; empty rows and carries are errors
        if (n.a.charalign === undefined || n.a.stackalign === undefined) throw new AccessibleError('stack without alignment');
        const items: string[] = [];
        for (const r of n.c) {
          if (r.t === 'mscarries') throw new AccessibleError('carries');
          if (r.t === 'msline') items.push('horizontal line');
          else if (r.t === 'msrow') {
            if (r.c.length === 0) throw new AccessibleError('empty row');
            items.push(`row ${this.list(r.c.map((c) => (c.t === 'none' ? ({ ...c, t: 'mi', x: 'none' } as N) : c)))} end row`);
          } else items.push(this.arg(this.slotOf(r)));
        }
        return `stack attributes charalign ${n.a.charalign} stackalign ${n.a.stackalign} end attributes ${items.join(' ')} end stack`;
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
    if (n.t === 'maction' && n.a.actiontype === 'argument') return flat(n.c);
    if (n.t === 'msrow' || n.t === 'mrow') return flat(n.c);
    return [n];
  }

  underOver(n: N): string {
    const base = this.slot(n, 0);
    const b0 = base[0];
    const isOp = base.length === 1 && b0 && (b0.t === 'mo' || b0.t === 'mi');
    const under = n.t === 'mover' ? null : this.slot(n, 1);
    const over = n.t === 'munder' ? null : this.slot(n, n.t === 'mover' ? 1 : 2);
    const baseText = this.arg(base);
    const bigOp = isOp && b0.t === 'mo' && (/[\u2211\u220F\u222B\u22C0-\u22C3\u2210]/.test(b0.x ?? '') || b0.a.largeop === 'true' || /[\u2190-\u21FF\u27F0-\u27FF\u2900-\u297F]/.test(b0.x ?? ''));
    const lim = b0 && b0.t === 'mi' && base.length === 1 && ['lim', 'max', 'min', 'sup', 'inf'].includes(b0.x ?? '');
    if ((bigOp || lim) && n.t !== 'mover') {
      if (n.t === 'munder') return `${lim ? 'limit as' : baseText + ' for'} ${this.arg(under!)} of`;
      return `${lim ? 'limit' : baseText} from ${this.arg(under!)} to ${this.arg(over!)} of`;
    }
    const complex = base.length > 1 || (base.length === 1 && !['mi', 'mn', 'mo', 'mtext'].includes(base[0].t) && !(base[0].t === 'maction'));
    const pre = complex ? 'stack ' : '';
    if (n.t === 'munder') return `${pre}${baseText} with ${this.arg(under!)} below`;
    if (n.t === 'mover') return `${pre}${baseText} with ${this.arg(over!)} on top`;
    return `${pre}${baseText} with ${this.arg(under!)} below and ${this.arg(over!)} on top`;
  }

  table(n: N): string {
    const attrs = TABLE_ATTR_ORDER.filter((k) => n.a[k] !== undefined && !k.startsWith('wrs'));
    let o = 'table';
    if (attrs.length) o += ' attributes ' + attrs.map((k) => `${k} ${n.a[k]}`).join(' ') + ' end attributes';
    for (const r of n.c) {
      if (r.t !== 'mtr') continue;
      o += ' row ' + r.c.map((cell) => {
        const kids = flat(cell.t === 'mtd' ? cell.c : [cell]);
        return kids.length > 1 ? `cell ${this.list(kids)} end cell` : this.arg(kids);
      }).join(' ');
    }
    return o + ' end table';
  }
}

export function mathml2accessible(mml: string): string {
  const { kids } = parseNormalised(mml);
  const mark = (ns: N[]): void => {
    for (const n of ns) {
      if (n.t === 'maction') for (const c of n.c) if (c.t === 'mo') inPlaceholder.add(c);
      mark(n.c);
    }
  };
  mark(kids);
  if (kids.length === 0) return 'blank';
  const sp = new Speaker();
  const count = (ns: N[]): number => ns.reduce((a, n) => a + (n.c.length ? count(n.c) : 1), 0);
  sp.paren = count(kids) > 1;
  return sp.list(kids).replace(/ +/g, ' ').replace(/^ +| +$/g, '');
}
