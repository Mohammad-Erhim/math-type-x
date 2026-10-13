/** Mapping of MathML token text + mathvariant to the code points of STIX Two Math. */

const U = (cp: number) => String.fromCodePoint(cp);

// Math Alphanumeric Symbols blocks (start of A / a)
const BLOCKS: Record<string, [number, number]> = {
  bold: [0x1d400, 0x1d41a],
  italic: [0x1d434, 0x1d44e],
  'bold-italic': [0x1d468, 0x1d482],
  script: [0x1d49c, 0x1d4b6],
  'bold-script': [0x1d4d0, 0x1d4ea],
  fraktur: [0x1d504, 0x1d51e],
  'double-struck': [0x1d538, 0x1d552],
  'bold-fraktur': [0x1d56c, 0x1d586],
  'sans-serif': [0x1d5a0, 0x1d5ba],
  'sans-serif-bold': [0x1d5d4, 0x1d5ee],
  'sans-serif-italic': [0x1d608, 0x1d622],
  'sans-serif-bold-italic': [0x1d63c, 0x1d656],
  monospace: [0x1d670, 0x1d68a],
};
const DIGITS: Record<string, number> = { bold: 0x1d7ce, 'double-struck': 0x1d7d8, 'sans-serif': 0x1d7e2, 'sans-serif-bold': 0x1d7ec, monospace: 0x1d7f6 };

// holes in the blocks: code points that live in Letterlike Symbols
const HOLES: Record<string, Record<string, number>> = {
  italic: { h: 0x210e },
  script: { B: 0x212c, E: 0x2130, F: 0x2131, H: 0x210b, I: 0x2110, L: 0x2112, M: 0x2133, R: 0x211b, e: 0x212f, g: 0x210a, o: 0x2134 },
  fraktur: { C: 0x212d, H: 0x210c, I: 0x2111, R: 0x211c, Z: 0x2128 },
  'double-struck': { C: 0x2102, H: 0x210d, N: 0x2115, P: 0x2119, Q: 0x211a, R: 0x211d, Z: 0x2124 },
};

// Greek (basic block order: Α..Ω, ϴ, ∇, α..ω, ∂ …)
const GREEK_START: Record<string, number> = { bold: 0x1d6a8, italic: 0x1d6e2, 'bold-italic': 0x1d71c };

export function styleChar(ch: string, variant: string | null | undefined): string {
  if (!variant || variant === 'normal') return ch;
  const cp = ch.codePointAt(0)!;
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) {
    const b = BLOCKS[variant];
    if (!b) return ch;
    const hole = HOLES[variant]?.[ch];
    if (hole) return U(hole);
    return U(cp <= 0x5a ? b[0] + (cp - 0x41) : b[1] + (cp - 0x61));
  }
  if (cp >= 0x30 && cp <= 0x39) {
    const d = DIGITS[variant];
    if (d !== undefined) return U(d + (cp - 0x30));
    return ch;
  }
  const g = GREEK_START[variant];
  if (g !== undefined) {
    if (cp >= 0x391 && cp <= 0x3a9 && cp !== 0x3a2) return U(g + (cp - 0x391));
    if (cp >= 0x3b1 && cp <= 0x3c9) return U(g + 26 + (cp - 0x3b1));
  }
  return ch;
}

/** the variant a token is drawn in when no mathvariant attribute is given */
export function defaultVariant(tag: string, text: string): string | null {
  if (tag === 'mi' && Array.from(text).length === 1) {
    const cp = text.codePointAt(0)!;
    if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) return 'italic';
    if (cp >= 0x3b1 && cp <= 0x3c9) return 'italic';
  }
  return null;
}

export function glyphText(tag: string, text: string, variant: string | null | undefined): string {
  const v = variant ?? defaultVariant(tag, text);
  if (v === 'italic' && tag === 'mn') return text; // italic digits are slanted by the renderer
  if (!v) return text;
  return Array.from(text)
    .map((c) => styleChar(c, v))
    .join('');
}
