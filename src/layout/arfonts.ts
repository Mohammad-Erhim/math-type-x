/**
 * Arabic-script faces offered in the Font list. They are subsets of open-licence fonts (tools/gen/subset_arabic_fonts.py)
 * that hold the Arabic blocks only: Arabic letters, digits and punctuation are set in the chosen face, Latin letters,
 * digits and operators keep their own faces, so the layout metrics of the rest of the formula do not move.
 * `value` is what the equation's `style="font-family:…"` holds (the name users and other tools know), `family` the
 * name of the bundled face (never a name an installed font could shadow).
 */
export interface ArabicFont {
  value: string;
  family: string;
  /** file stem: <stem>-Regular / <stem>-Bold (.woff2 for the browser, .ttf for the image services) */
  stem: string;
  label: string;
  /** the name in Arabic script, drawn in the face itself in the list: a preview of the letters */
  arLabel: string;
  style: 'naskh' | 'kufi';
}

export const ARABIC_FONTS: ArabicFont[] = [
  { value: 'Amiri', family: 'MTX Amiri', stem: 'MtxAmiri', label: 'Amiri', arLabel: 'أميري', style: 'naskh' },
  { value: 'Scheherazade New', family: 'MTX Scheherazade', stem: 'MtxScheherazade', label: 'Scheherazade New', arLabel: 'شهرزاد', style: 'naskh' },
  { value: 'Noto Naskh Arabic', family: 'MTX Noto Naskh', stem: 'MtxNotoNaskh', label: 'Noto Naskh Arabic', arLabel: 'نوتو نسخ', style: 'naskh' },
  { value: 'Noto Kufi Arabic', family: 'MTX Noto Kufi', stem: 'MtxNotoKufi', label: 'Noto Kufi Arabic', arLabel: 'نوتو كوفي', style: 'kufi' },
];

const BY_VALUE = new Map(ARABIC_FONTS.map((f) => [f.value.toLowerCase(), f]));

/** the bundled face for a font-family value of the equation (or undefined: not one of ours) */
export function arabicFontOf(value: string | undefined | null): ArabicFont | undefined {
  return value ? BY_VALUE.get(value.trim().toLowerCase()) : undefined;
}

export const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/** CSS family of the bundled face for an equation's font-family value ('' = the default Arabic face) */
export const arabicCssFamily = (value: string | undefined | null): string => arabicFontOf(value)?.family ?? '';
