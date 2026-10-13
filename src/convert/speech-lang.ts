/**
 * Language packs of mathml2accessible. The structure rules live in speech.ts; a pack supplies the words:
 * phrase templates ("{0} over {1}"), the names of single tokens, fences, separators and enclosures, and the
 * string that joins the items of a row. English is the base; other packs (src/data/speech/<lang>.json) override
 * the entries they translate and inherit the rest (the reference leaves e.g. stacks untranslated).
 */
import arPack from '../data/speech/ar.json';
import enPack from '../data/speech/en.json';

export interface SpeechPack {
  /** extra text between the items of a row, besides the space (U+200F in Arabic) */
  rowMark: string;
  /** templates with {0} {1} … placeholders */
  t: Record<string, string>;
  /** names of single tokens keyed `tag|mathvariant|text` (when present they replace the English tables) */
  names?: Record<string, string>;
  /** words of an opening / closing fence character; absent → `open <char>` */
  fenceOpen?: Record<string, string>;
  fenceClose?: Record<string, string>;
  /** names of mfenced separators */
  sepNames?: Record<string, string>;
  /** words of each menclose notation; the name is `encloseTpl` / `strikeTpl` filled with the words */
  encloseWords?: Record<string, string>;
  /** names of table attributes */
  attr?: Record<string, string>;
  /** "table attributes … end attributes row" for each combination of the printed table attributes (bit mask, see TABLE_ATTR_ORDER) */
  tableHeaders?: Record<string, string>;
  /** left / right words of paired delimiters typed as plain operators */
  lr?: Record<string, string>;
  /** unknown tokens fall back to the built-in English tables (English only) */
  chain?: boolean;
  /** the reference swaps the phrases of an mfenced that has only one of `open` / `close` (Arabic) */
  fenceSwap?: boolean;
}

export const EN_TEMPLATES: Record<string, string> = {
  blank: 'blank',
  cellBlank: 'blank',
  encloseDefault: 'long division enclose',
  fenceDefaultOpen: 'open parentheses',
  fenceDefaultClose: 'close parentheses',
  negative: 'negative',
  minusOrPlus: 'minus-or-plus',
  negativeOrPlus: 'negative-or-plus',
  rtl: 'right to left',
  displayBlock: 'display style',
  displayInline: 'inline style',
  largeOp: 'large {0}',
  largeBlank: 'large blank',
  numberSpace: 'number space',
  bold: 'bold {0}',
  italic: 'italic {0}',
  boldItalic: 'bold italic {0}',
  straight: 'straight {0}',
  doubleStruck: 'double-struck {0}',
  calligraphic: 'calligraphic {0}',
  fraktur: 'fraktur {0}',
  capital: 'capital {0}',
  text: 'text {0} end text',
  spaceBack: 'back space',
  spaceOf: 'space of {0}',
  fracOver: '{0} over {1}',
  fracBev: 'bevelled {0}',
  fracLong: 'fraction numerator {0} over denominator {1} end fraction',
  fracOrd: '1 {0}',
  ord2: 'half',
  ord3: 'third',
  ord4: 'fourth',
  ord5: 'fifth',
  sqrtBlank: 'square root of blank end root',
  sqrt: 'square root of {0}',
  sqrtEnd: 'square root of {0} end root',
  root2: 'square root of {0}',
  root3: 'cube root of {0}',
  root4: 'fourth root of {0}',
  root5: 'fifth root of {0}',
  rootTh: '{1}-th root of {0}',
  rootIdx: 'root index {1} of {0}',
  endRoot: 'end root',
  squared: '{0} squared',
  cubed: '{0} cubed',
  pow: '{0} to the power of {1}',
  powEnd: '{0} to the power of {1} end exponent',
  subscript: 'subscript',
  superscript: 'superscript',
  presubscript: 'presubscript',
  presuperscript: 'presuperscript',
  endSubscript: 'end subscript',
  endSuperscript: 'end superscript',
  scriptBase: 'scriptbase {0} end scriptbase',
  endPresubscript: 'end presubscript',
  endPresuperscript: 'end presuperscript',
  limit: 'limit',
  limitAs: 'limit as {0} of',
  forOf: '{0} for {1} of',
  fromTo: '{0} from {1} to {2} of',
  stack: 'stack {0}',
  below: '{0} with {1} below',
  onTop: '{0} with {1} on top',
  belowTop: '{0} with {1} below and {2} on top',
  stackBelowTop: '{0} with {1} below and {2} on top',
  open: 'open',
  close: 'close',
  table: 'table',
  tableAttrs: 'attributes',
  tableAttrsEnd: 'end attributes',
  tableRow: 'row',
  cell: 'cell',
  cellEnd: 'end cell',
  tableEnd: 'end table',
  endEnclose: 'end enclose',
  endStrike: 'end strike',
  encloseTpl: '{0} enclose',
  strikeTpl: '{0} strike',
  styleInline: 'begin inline style {0} end style',
  styleDisplay: 'begin display style {0} end style',
  styleSize: 'begin mathsize {0} style {1} end style',
  longdivLeft: 'long division with stack on the left by',
  longdivBy: 'long division by',
  yields: 'yields',
  pile: 'pile',
  pileEnd: 'end pile',
  longdivEnd: 'end long division',
  hline: 'horizontal line',
  none: 'none',
  stackAttrs: 'stack attributes charalign {0} stackalign {1} end attributes',
  stackRow: 'row {0} end row',
  stackEnd: 'end stack',
};

export const EN_ENCLOSE: Record<string, string> = {
  longdiv: 'long division', actuarial: 'actuarial', box: 'box', roundedbox: 'rounded box', circle: 'circle', left: 'left', right: 'right', top: 'top', bottom: 'bottom',
  updiagonalstrike: 'up diagonal', downdiagonalstrike: 'down diagonal', verticalstrike: 'vertical', horizontalstrike: 'horizontal',
  madruwb: 'arabic factorial', radical: 'square root', phasorangle: 'phasor angle',
};

/** left / right words of ( ) [ ] { } from a table of token names */
function lrOf(names: Record<string, string>): Record<string, string> | undefined {
  const o: Record<string, string> = {};
  for (const c of '()[]{}') {
    const n = names[`mo||${c}`];
    if (n === undefined) return undefined;
    o[c] = n;
  }
  return o;
}

export const EN: SpeechPack = {
  rowMark: '',
  t: EN_TEMPLATES,
  names: (enPack as unknown as { names: Record<string, string> }).names,
  encloseWords: EN_ENCLOSE,
  chain: true,
};

/** `{0} over {1}` with arguments */
export function fill(tpl: string, ...args: string[]): string {
  return tpl.replace(/\{(\d)\}/g, (_, i) => args[+i] ?? '');
}

type PackJson = Partial<Omit<SpeechPack, 't'>> & { t?: Record<string, string> };
const PACKS: Record<string, SpeechPack> = {
  en: EN,
  ar: { ...EN, chain: false, ...(arPack as unknown as PackJson), t: { ...EN_TEMPLATES, ...((arPack as unknown as PackJson).t ?? {}) } } as SpeechPack,
};
for (const k of Object.keys(PACKS)) if (!PACKS[k].lr && PACKS[k].names) PACKS[k].lr = lrOf(PACKS[k].names!);

/** pack for a language code ("ar", "ar_eg", "AR-sa", undefined …); unknown languages are English */
export function packFor(lang?: string): SpeechPack {
  const l = (lang ?? 'en').toLowerCase().replace('-', '_');
  return PACKS[l] ?? PACKS[l.split('_')[0]] ?? EN;
}
