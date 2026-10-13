/** Normalised view of a MathML document used by the converters (mrow flattening, token merging). */
import { parseXml } from '../core/mathml';
import { decodeEntitiesPublic } from './util';

export interface N {
  /** element name without prefix */
  t: string;
  a: Record<string, string>;
  /** token text */
  x?: string;
  c: N[];
}

type X = ReturnType<typeof parseXml>;

function conv(x: X): N[] {
  const name = x.name.replace(/^[a-z]+:/, '');
  const a: Record<string, string> = {};
  for (const [k, v] of x.attrs) if (k !== 'xmlns' && !k.startsWith('xmlns:')) a[k] = v;
  const kids: N[] = [];
  let text = '';
  for (const c of x.children) {
    if (typeof c === 'string') text += c;
    else kids.push(...conv(c));
  }
  if (['mi', 'mn', 'mo', 'mtext', 'ms'].includes(name)) return [{ t: name, a, x: name === 'mtext' ? text : text.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, ''), c: [] }];
  if (name === 'mspace' || name === 'none' || name === 'mprescripts' || name === 'msline') return [{ t: name, a, c: [] }];
  if (name === 'mrow' && Object.keys(a).length === 0) return [{ t: 'mrow', a, c: kids }];
  if (name === 'semantics') return kids.slice(0, 1);
  if (name === 'annotation' || name === 'annotation-xml') return [];
  return [{ t: name, a, c: kids }];
}

export function parseNormalised(mml: string): { root: N; kids: N[] } {
  const x = parseXml(mml);
  const attrs: Record<string, string> = {};
  for (const [k, v] of x.attrs) if (k !== 'xmlns' && !k.startsWith('xmlns:')) attrs[k] = v;
  const kids: N[] = [];
  for (const c of x.children) if (typeof c !== 'string') kids.push(...conv(c));
  return { root: { t: 'math', a: attrs, c: kids }, kids };
}

void decodeEntitiesPublic;
