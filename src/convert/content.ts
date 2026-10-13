/** Presentation ⇄ Content MathML for the semantically unambiguous subset (SVC-004). */
import { parseNormalised, N } from './xml';
import { parseXml, escText } from '../core/mathml';

const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const REL: Record<string, string> = { '=': 'eq', '<': 'lt', '>': 'gt', '≤': 'leq', '≥': 'geq', '≠': 'neq', '≈': 'approx', '≡': 'equivalent', '→': 'tendsto' };
const REL_REV: Record<string, string> = { eq: '=', lt: '<', gt: '>', leq: '≤', geq: '≥', neq: '≠', approx: '≈', equivalent: '≡', tendsto: '→' };
const FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'sinh', 'cosh', 'tanh', 'arcsin', 'arccos', 'arctan', 'ln', 'log', 'exp', 'min', 'max', 'gcd', 'det']);
const CONSTS: Record<string, string> = { 'π': 'pi', 'ⅇ': 'exponentiale', 'ⅈ': 'imaginaryi', '∞': 'infinity' };
const CONST_REV: Record<string, string> = { pi: 'π', exponentiale: 'ⅇ', imaginaryi: 'ⅈ', infinity: '∞' };

const isOp = (n: N | undefined, chars: string) => !!n && n.t === 'mo' && chars.includes(n.x ?? '\u0000') && (n.x ?? '') !== '';

function flatRow(c: N[]): N[] {
  const out: N[] = [];
  for (const n of c) {
    if (n.t === 'mrow' && !Object.keys(n.a).length) out.push(...flatRow(n.c));
    else out.push(n);
  }
  return out;
}

class Unsupported extends Error {}

function atomToContent(n: N): string {
  switch (n.t) {
    case 'mn':
      return `<cn>${escText(n.x ?? '')}</cn>`;
    case 'mi': {
      const x = n.x ?? '';
      if (CONSTS[x]) return `<${CONSTS[x]}/>`;
      return `<ci>${escText(x)}</ci>`;
    }
    case 'mtext':
      return `<cs>${escText(n.x ?? '')}</cs>`;
    case 'mrow':
      return seqToContent(n.c);
    case 'mfenced': {
      const inner = n.c.length === 1 ? n.c[0] : { t: 'mrow', a: {}, c: n.c };
      const kind = n.a.open ?? '(';
      if (kind === '|') return `<apply><abs/>${atomToContent(inner)}</apply>`;
      return atomToContent(inner);
    }
    case 'mfrac':
      return `<apply><divide/>${atomToContent(n.c[0])}${atomToContent(n.c[1])}</apply>`;
    case 'msqrt':
      return `<apply><root/>${seqToContent(n.c)}</apply>`;
    case 'mroot':
      return `<apply><root/><degree>${atomToContent(n.c[1])}</degree>${atomToContent(n.c[0])}</apply>`;
    case 'msup':
      return `<apply><power/>${atomToContent(n.c[0])}${atomToContent(n.c[1])}</apply>`;
    case 'msub':
      return `<apply><selector/>${atomToContent(n.c[0])}${atomToContent(n.c[1])}</apply>`;
    default:
      throw new Unsupported(n.t);
  }
}

function seqToContent(items: N[]): string {
  const c = flatRow(items);
  if (!c.length) throw new Unsupported('empty');
  // relations (lowest precedence)
  for (let i = 0; i < c.length; i++) {
    const n = c[i];
    if (n.t === 'mo' && REL[n.x ?? '']) {
      const op = REL[n.x ?? ''];
      return `<apply><${op}/>${seqToContent(c.slice(0, i))}${seqToContent(c.slice(i + 1))}</apply>`;
    }
  }
  // additive: split at top-level + / - (not at the start)
  const terms: { sign: number; items: N[] }[] = [];
  let cur: N[] = [];
  let sign = 1;
  for (let i = 0; i < c.length; i++) {
    const n = c[i];
    if (isOp(n, '+-−') && i > 0 && !(c[i - 1].t === 'mo')) {
      terms.push({ sign, items: cur });
      cur = [];
      sign = n.x === '+' ? 1 : -1;
    } else if (isOp(n, '+-−') && i === 0) {
      sign = n.x === '+' ? 1 : -1;
    } else cur.push(n);
  }
  terms.push({ sign, items: cur });
  if (terms.length > 1 || terms[0].sign < 0) {
    const parts = terms.map((t) => ({ sign: t.sign, xml: productToContent(t.items) }));
    if (parts.length === 1) return `<apply><minus/>${parts[0].xml}</apply>`;
    let out = parts[0].sign < 0 ? `<apply><minus/>${parts[0].xml}</apply>` : parts[0].xml;
    const plusTerms = [out];
    for (let k = 1; k < parts.length; k++) {
      if (parts[k].sign > 0) plusTerms.push(parts[k].xml);
      else plusTerms.push(`<apply><minus/>${parts[k].xml}</apply>`);
    }
    // a - b is minus(a,b) when the whole expression is a binary difference
    if (parts.length === 2 && parts[1].sign < 0 && parts[0].sign > 0) return `<apply><minus/>${parts[0].xml}${parts[1].xml}</apply>`;
    out = `<apply><plus/>${plusTerms.join('')}</apply>`;
    return out;
  }
  return productToContent(terms[0].items);
}

function productToContent(c: N[]): string {
  if (!c.length) throw new Unsupported('empty');
  // function application: sin x
  if (c[0].t === 'mi' && FUNCS.has(c[0].x ?? '') && c.length > 1) {
    return `<apply><${c[0].x}/>${productToContent(c.slice(1))}</apply>`;
  }
  const factors: { div: boolean; xml: string }[] = [];
  let div = false;
  let buf: N[] = [];
  const flush = () => {
    if (buf.length) {
      for (const b of buf) factors.push({ div, xml: atomToContent(b) });
      buf = [];
    }
  };
  for (const n of c) {
    if (isOp(n, '×·⋅*⁢')) {
      flush();
      div = false;
    } else if (isOp(n, '÷/')) {
      flush();
      div = true;
    } else buf.push(n);
  }
  flush();
  if (factors.length === 1) return factors[0].xml;
  if (factors.some((f) => f.div)) {
    if (factors.length === 2 && factors[1].div && !factors[0].div) return `<apply><divide/>${factors[0].xml}${factors[1].xml}</apply>`;
    throw new Unsupported('division chain');
  }
  return `<apply><times/>${factors.map((f) => f.xml).join('')}</apply>`;
}

export function mathml2content(mml: string): string {
  try {
    const { kids } = parseNormalised(mml);
    if (!kids.length) return `<math ${NS}/>`;
    return `<math ${NS}>${seqToContent(kids)}</math>`;
  } catch (e) {
    if (e instanceof Unsupported) return 'Error: this formula has no unambiguous Content MathML equivalent';
    throw e;
  }
}

/* ------------------------------------------------------------------ content → presentation */

type X = ReturnType<typeof parseXml>;
const kids = (x: X): X[] => x.children.filter((c): c is X => typeof c !== 'string');
const textOf = (x: X): string => x.children.filter((c): c is string => typeof c === 'string').join('').trim();
const mrow = (s: string[]) => (s.length === 1 ? s[0] : `<mrow>${s.join('')}</mrow>`);
const paren = (s: string) => `<mfenced><mrow>${s}</mrow></mfenced>`;

const PREC: Record<string, number> = { eq: 1, lt: 1, gt: 1, leq: 1, geq: 1, neq: 1, approx: 1, equivalent: 1, tendsto: 1, plus: 2, minus: 2, times: 3, divide: 4, power: 5 };

function cnv(x: X): { xml: string; prec: number } {
  const name = x.name.replace(/^[a-z]+:/, '');
  const k = kids(x);
  switch (name) {
    case 'cn':
      return { xml: `<mn>${escText(textOf(x))}</mn>`, prec: 9 };
    case 'ci':
      return { xml: `<mi>${escText(textOf(x))}</mi>`, prec: 9 };
    case 'cs':
      return { xml: `<mtext>${escText(textOf(x))}</mtext>`, prec: 9 };
    case 'pi':
    case 'exponentiale':
    case 'imaginaryi':
    case 'infinity':
      return { xml: `<mi>${escText(CONST_REV[name])}</mi>`, prec: 9 };
    case 'apply': {
      if (!k.length) throw new Error('empty apply');
      const op = k[0].name.replace(/^[a-z]+:/, '');
      const args = k.slice(1);
      const sub = (a: X, min: number) => {
        const r = cnv(a);
        return r.prec < min ? paren(r.xml) : r.xml;
      };
      if (op === 'plus') {
        const parts: string[] = [];
        args.forEach((a, i) => {
          if (i) parts.push('<mo>+</mo>');
          parts.push(sub(a, 2));
        });
        return { xml: mrow(parts), prec: 2 };
      }
      if (op === 'minus') {
        if (args.length === 1) return { xml: mrow(['<mo>-</mo>', sub(args[0], 4)]), prec: 3 };
        return { xml: mrow([sub(args[0], 2), '<mo>-</mo>', sub(args[1], 3)]), prec: 2 };
      }
      if (op === 'times') {
        const parts: string[] = [];
        args.forEach((a, i) => {
          if (i) parts.push('<mo>&#xB7;</mo>');
          parts.push(sub(a, 3));
        });
        return { xml: mrow(parts), prec: 3 };
      }
      if (op === 'divide') return { xml: `<mfrac><mrow>${cnv(args[0]).xml}</mrow><mrow>${cnv(args[1]).xml}</mrow></mfrac>`, prec: 4 };
      if (op === 'power') return { xml: `<msup>${mrow([sub(args[0], 6)])}<mrow>${cnv(args[1]).xml}</mrow></msup>`, prec: 5 };
      if (op === 'root') {
        const deg = args.find((a) => a.name.replace(/^[a-z]+:/, '') === 'degree');
        const rad = args.filter((a) => a !== deg);
        const body = rad.map((a) => cnv(a).xml).join('');
        if (deg) {
          const dk = kids(deg)[0];
          if (dk && textOf(dk) === '2' && dk.name.endsWith('cn')) return { xml: `<msqrt>${body}</msqrt>`, prec: 9 };
          return { xml: `<mroot>${mrow([body])}${mrow([dk ? cnv(dk).xml : ''])}</mroot>`, prec: 9 };
        }
        return { xml: `<msqrt>${body}</msqrt>`, prec: 9 };
      }
      if (op === 'abs') return { xml: `<mfenced open="|" close="|"><mrow>${cnv(args[0]).xml}</mrow></mfenced>`, prec: 9 };
      if (op === 'selector') return { xml: `<msub>${mrow([cnv(args[0]).xml])}${mrow([cnv(args[1]).xml])}</msub>`, prec: 9 };
      if (REL_REV[op]) {
        const parts: string[] = [];
        args.forEach((a, i) => {
          if (i) parts.push(`<mo>${escText(REL_REV[op])}</mo>`);
          parts.push(sub(a, 2));
        });
        return { xml: mrow(parts), prec: 1 };
      }
      if (FUNCS.has(op)) return { xml: mrow([`<mi>${op}</mi>`, args.map((a) => sub(a, 4)).join('')]), prec: 4 };
      throw new Error('unsupported operator ' + op);
    }
    default:
      throw new Error('unsupported element ' + name);
  }
}

export function content2mathml(src: string): string {
  try {
    const x = parseXml(src);
    const body = kids(x).map((c) => cnv(c).xml).join('');
    return `<math ${NS}>${body}</math>`;
  } catch (e) {
    return 'Error: ' + (e as Error).message;
  }
}
