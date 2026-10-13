/** Typed access to the generated control catalogue (src/data/catalogue.json). */
import data from '../data/catalogue.json';

export interface Control {
  id: string;
  ref: string;
  tab: number;
  group: number;
  n: number;
  title: string;
  geom: [number, number, number, number];
  special?: boolean;
  A?: string;
  A2?: string;
  B?: string;
  C?: string;
}

export interface Catalogue {
  tabs: { index: number; name: string; title: string }[];
  groups: { tab: number; index: number; count: number; expand: [number, number, number, number] | null }[];
  controls: Control[];
}

export const catalogue = data as unknown as Catalogue;

const byKey = new Map<string, Control>();
for (const c of catalogue.controls) {
  const k = `${c.tab}|${c.group}|${c.title}`;
  if (!byKey.has(k)) byKey.set(k, c);
}

export function findControl(tab: number, group: number, title: string): Control | undefined {
  return byKey.get(`${tab}|${group}|${title}`);
}

export function controlsOf(tab: number, group = 0): Control[] {
  return catalogue.controls.filter((c) => c.tab === tab && c.group === group).sort((a, b) => a.n - b.n);
}

export type Behavior = 'insert' | 'picker' | 'digits-arabic' | 'digits-eastern' | 'special';

const PICKERS = new Set(['Table', 'Matrix with vertical bars', 'Matrix with square brackets', 'Matrix with parenthesis']);

export function behaviorOf(c: Control): Behavior {
  if (c.tab === 4 && c.group === 0 && PICKERS.has(c.title)) return 'picker';
  if (c.title === 'Arabic-Indic numerals') return 'digits-arabic';
  if (c.title === 'Eastern Arabic-Indic numerals') return 'digits-eastern';
  if (c.special) return 'special';
  return 'insert';
}
