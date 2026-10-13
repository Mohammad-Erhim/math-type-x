import { ARABIC_FONTS, ArabicFont } from '../layout/arfonts';
/** UI message catalogue (NFR-008). Keys are the English tooltips; other languages can extend the table. */
export const MESSAGES: Record<string, Record<string, string>> = {
  en: {
    more: 'More',
    mathInput: 'Math input',
    goToHand: 'Go to handwritten mode',
    font: '— Font —',
    size: '— Size —',
    fontFamily: 'Font family',
    fontSize: 'Font size',
    color: 'Color',
    colorLabel: 'Color:',
    rows: 'Rows:',
    columns: 'Columns:',
    value: 'Value:',
    code: 'Code:',
    contextual: 'Contextual tab (Alt+0)',
  },
};

export function t(lang: string, key: string): string {
  return MESSAGES[lang]?.[key] ?? MESSAGES.en[key] ?? key;
}

export const TAB_TITLES = [
  'General tab (Alt+1)',
  'Symbols (Alt+2)',
  'Arrows tab (Alt+3)',
  'Greek, letters and numbers tab (Alt+4)',
  'Matrices and elementary tab (Alt+5)',
  'Scripts and layout tab (Alt+6)',
  'Decorations tab (Alt+7)',
  'Big operators tab (Alt+8)',
  'Calculus tab (Alt+9)',
  'Contextual tab (Alt+0)',
];

export interface FontOption {
  label: string;
  value: string;
  /** set for the Arabic faces: listed in their own group, drawn in the face, with the name in Arabic script */
  arabic?: ArabicFont;
}

export const FONT_FAMILIES: FontOption[] = [
  { label: '— Font —', value: 'inherit' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Classic', value: 'stix' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Tahoma', value: 'Tahoma' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Verdana', value: 'Verdana' },
  ...ARABIC_FONTS.map((f): FontOption => ({ label: f.label, value: f.value, arabic: f })),
];

/** heading of the group of Arabic faces in the Font list */
export const ARABIC_FONTS_GROUP = 'Arabic fonts';

export const FONT_SIZES = ['inherit', '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '26px', '28px', '36px', '48px', '72px'];

export const SWATCHES: string[] = [
  '#FF0000', '#FF00FF', '#0000FF', '#00FFFF', '#00FF00',
  '#FFFF00', '#7F0000', '#E5C304', '#AE761E', '#7F007F',
  '#00007F', '#007F7F', '#007F00', '#827F00', '#000000',
  '#191919', '#333333', '#4C4C4C', '#666666', '#7F7F7F',
  '#999999', '#B2B2B2', '#CCCCCC', '#E5E5E5', '#FFFFFF',
];
