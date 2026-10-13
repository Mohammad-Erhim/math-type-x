/**
 * Artwork of the contextual-tab controls (22 px grid). Drawn from simple building blocks so that every
 * control has a distinct, consistent pictogram: grids (tables), bars (alignment), pluses (insert) …
 */
const BLUE = '#5b7a8a';
const DARK = '#2a3b45';
const RED = '#e53a2c';
const GREEN = '#2e9e2e';
const CYAN = '#2ba7d6';

const rect = (x: number, y: number, w: number, h: number, fill = BLUE, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const line = (x1: number, y1: number, x2: number, y2: number, c = BLUE, w = 1.3, dash = '') => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} fill="none"/>`;
const grid = (x: number, y: number, n = 2, m = 2, cell = 4, c = BLUE) => {
  let o = '';
  for (let r = 0; r < n; r++) for (let k = 0; k < m; k++) o += `<rect x="${x + k * (cell + 1)}" y="${y + r * (cell + 1)}" width="${cell}" height="${cell}" fill="none" stroke="${c}" stroke-width="1"/>`;
  return o;
};
const plus = (x: number, y: number, c = RED) => `<path d="M${x - 2.5} ${y}H${x + 2.5}M${x} ${y - 2.5}V${y + 2.5}" stroke="${c}" stroke-width="1.4"/>`;
const minus = (x: number, y: number, c = RED) => `<path d="M${x - 2.5} ${y}H${x + 2.5}" stroke="${c}" stroke-width="1.6"/>`;
const bars = (n: number, align: 'l' | 'c' | 'r', y0 = 4, c = BLUE) => {
  let o = '';
  const w = [14, 9, 12, 7, 10];
  for (let i = 0; i < n; i++) {
    const ww = w[i % w.length];
    const x = align === 'l' ? 4 : align === 'r' ? 18 - ww : 11 - ww / 2;
    o += rect(x, y0 + i * 3.2, ww, 1.8, c);
  }
  return o;
};
const arrow = (x: number, y: number, dir: 'u' | 'd' | 'l' | 'r', c = CYAN) => {
  const p = { u: `M${x} ${y + 3}V${y - 3}M${x - 2.5} ${y - 0.5}L${x} ${y - 3}L${x + 2.5} ${y - 0.5}`, d: `M${x} ${y - 3}V${y + 3}M${x - 2.5} ${y + 0.5}L${x} ${y + 3}L${x + 2.5} ${y + 0.5}`, l: `M${x + 3} ${y}H${x - 3}M${x - 0.5} ${y - 2.5}L${x - 3} ${y}L${x - 0.5} ${y + 2.5}`, r: `M${x - 3} ${y}H${x + 3}M${x + 0.5} ${y - 2.5}L${x + 3} ${y}L${x + 0.5} ${y + 2.5}` }[dir];
  return `<path d="${p}" stroke="${c}" stroke-width="1.3" fill="none"/>`;
};
const brk = (x: number, side: 'l' | 'r', c = DARK) => `<path d="M${side === 'l' ? x + 3 : x - 3} 3H${x}V19H${side === 'l' ? x + 3 : x - 3}" stroke="${c}" stroke-width="1.5" fill="none"/>`;
const fenceTable = (mid: string, c = DARK) => `<path d="M3 11H6M16 11H19" stroke="${c}" stroke-width="1.5"/>` + `<rect x="8" y="3" width="6" height="16" fill="none" stroke="${GREEN}" stroke-width="1"/>` + mid;

export const CTX_ICONS: Record<string, string> = {
  valign_baseline: fenceTable(`<path d="M8 12H14" stroke="${DARK}" stroke-width="1.5"/>`),
  valign_middle: fenceTable(`<path d="M8 11H14" stroke="${DARK}" stroke-width="1.5"/>`),
  valign_middle_baseline: fenceTable(`<path d="M8 11H14M8 14H14" stroke="${DARK}" stroke-width="1.2"/>`),
  tbl_align_axis: grid(4, 3, 3, 3, 3.5) + line(2, 11, 20, 11, DARK, 1.2),
  tbl_align_top: grid(4, 3, 3, 3, 3.5) + line(2, 3, 20, 3, DARK, 1.2),
  tbl_align_baseline: grid(4, 3, 3, 3, 3.5) + line(2, 13, 20, 13, DARK, 1.2),
  tbl_align_center: grid(4, 3, 3, 3, 3.5) + line(2, 9.5, 20, 9.5, DARK, 1.2),
  tbl_align_row: grid(4, 3, 3, 3, 3.5) + line(2, 15, 20, 15, DARK, 1.2),
  tbl_align_bottom: grid(4, 3, 3, 3, 3.5) + line(2, 19, 20, 19, DARK, 1.2),
  row_below: grid(3, 4, 2, 2, 4) + plus(17, 15),
  row_above: grid(3, 7, 2, 2, 4) + plus(17, 5),
  col_right: grid(3, 6, 2, 2, 4) + plus(17, 10),
  col_left: grid(8, 6, 2, 2, 4) + plus(5, 10),
  row_remove: grid(3, 4, 2, 2, 4) + minus(17, 15),
  col_remove: grid(3, 6, 2, 2, 4) + minus(17, 10),
  frame_insert: `<rect x="3.5" y="3.5" width="15" height="15" fill="none" stroke="${DARK}" stroke-width="1.6"/>` + grid(6, 6, 2, 2, 4),
  frame_remove: `<rect x="3.5" y="3.5" width="15" height="15" fill="none" stroke="${BLUE}" stroke-width="1" stroke-dasharray="2 2"/>` + grid(6, 6, 2, 2, 4),
  lines_solid: `<path d="M5 4H11V12H17V19" stroke="${DARK}" stroke-width="1.5" fill="none"/>`,
  lines_dash: `<path d="M5 4H11V12H17V19" stroke="${DARK}" stroke-width="1.5" fill="none" stroke-dasharray="2 2"/>`,
  line_below: grid(3, 3, 2, 2, 5) + line(2, 16, 20, 16, RED, 1.6),
  line_right: grid(3, 3, 2, 2, 5) + line(16, 2, 16, 20, RED, 1.6),
  line_below_remove: grid(3, 3, 2, 2, 5) + line(2, 16, 20, 16, BLUE, 1.2, '2 2'),
  line_right_remove: grid(3, 3, 2, 2, 5) + line(16, 2, 16, 20, BLUE, 1.2, '2 2'),
  colalign_left: bars(5, 'l'),
  colalign_center: bars(5, 'c'),
  colalign_right: bars(5, 'r'),
  colalign_decimal: rect(3, 4, 15, 14, BLUE) + `<circle cx="11" cy="11" r="1.6" fill="#fff"/>`,
  colalign_relation: rect(2, 5, 18, 12, BLUE) + `<text x="11" y="14.5" font-size="9" fill="#fff" text-anchor="middle" font-family="Arial" font-weight="700">=</text>`,
  rowalign_top: bars(3, 'c', 3) + rect(3, 3, 16, 1.4, DARK),
  rowalign_center: bars(3, 'c', 7) + rect(3, 10, 16, 1.4, DARK),
  rowalign_bottom: bars(3, 'c', 10) + rect(3, 18, 16, 1.4, DARK),
  rowalign_baseline: bars(3, 'c', 6) + rect(3, 12.5, 16, 1.4, RED),
  rowalign_axis: bars(3, 'c', 6) + rect(3, 9.5, 16, 1.4, DARK),
  equal_rows: rect(4, 3, 14, 3, BLUE) + rect(4, 9, 14, 3, BLUE) + rect(4, 15, 14, 3, BLUE) + arrow(11, 11, 'u') ,
  equal_cols: rect(3, 4, 3, 14, BLUE) + rect(9, 4, 3, 14, BLUE) + rect(15, 4, 3, 14, BLUE),
  colspacing: grid(2, 7, 1, 2, 5) + arrow(11, 17, 'r'),
  framespacing_h: `<rect x="2.5" y="3.5" width="17" height="15" fill="none" stroke="${DARK}"/>` + arrow(6, 11, 'r'),
  rowspacing: grid(6, 2, 2, 1, 5) + arrow(17, 11, 'd'),
  framespacing_v: `<rect x="2.5" y="3.5" width="17" height="15" fill="none" stroke="${DARK}"/>` + arrow(11, 7, 'd'),
  left_spacing: rect(14, 5, 5, 12, BLUE) + arrow(7, 11, 'l'),
  right_spacing: rect(3, 5, 5, 12, BLUE) + arrow(15, 11, 'r'),
  sp_left_spacing: rect(14, 5, 5, 12, BLUE) + arrow(7, 11, 'l'),
  sp_right_spacing: rect(3, 5, 5, 12, BLUE) + arrow(15, 11, 'r'),
  ml_left: rect(14, 5, 5, 12, BLUE) + arrow(7, 11, 'l'),
  ml_right: rect(3, 5, 5, 12, BLUE) + arrow(15, 11, 'r'),
  ml_align_left: bars(5, 'l'),
  ml_align_center: bars(5, 'c'),
  ml_align_right: bars(5, 'r'),
  ml_relation: rect(2, 5, 18, 12, BLUE) + `<text x="11" y="14.5" font-size="9" fill="#fff" text-anchor="middle" font-family="Arial" font-weight="700">=</text>`,
  st_line: rect(4, 6, 14, 1.5, BLUE) + rect(4, 10, 14, 1.5, DARK) + rect(4, 14, 14, 1.5, BLUE),
  st_join: rect(5, 4, 4, 14, BLUE) + rect(13, 4, 4, 14, BLUE) + arrow(11, 11, 'l', RED),
  st_strike: `<text x="11" y="15" font-size="13" text-anchor="middle" fill="${DARK}" font-family="Arial">7</text>` + line(5, 17, 17, 4, RED, 1.3),
  st_prepend: rect(4, 8, 14, 2, BLUE) + rect(4, 12, 14, 2, BLUE) + plus(11, 4),
  st_append: rect(4, 6, 14, 2, BLUE) + rect(4, 10, 14, 2, BLUE) + plus(11, 17),
  carries_insert: rect(4, 12, 14, 2, BLUE) + rect(5, 5, 3, 4, GREEN) + rect(10, 5, 3, 4, GREEN),
  st_left: rect(4, 6, 8, 2, BLUE) + rect(4, 11, 8, 2, BLUE) + arrow(17, 11, 'l'),
  st_right: rect(10, 6, 8, 2, BLUE) + rect(10, 11, 8, 2, BLUE) + arrow(5, 11, 'r'),
  nudge_up: `<text x="11" y="13" font-size="11" text-anchor="middle" font-family="Arial" fill="${DARK}">x</text>` + arrow(11, 5, 'u'),
  nudge_down: `<text x="11" y="12" font-size="11" text-anchor="middle" font-family="Arial" fill="${DARK}">x</text>` + arrow(11, 18, 'd'),
  nudge_left: `<text x="12" y="15" font-size="11" text-anchor="middle" font-family="Arial" fill="${DARK}">x</text>` + arrow(4, 11, 'l'),
  nudge_right: `<text x="10" y="15" font-size="11" text-anchor="middle" font-family="Arial" fill="${DARK}">x</text>` + arrow(18, 11, 'r'),
  numsep_merge: `<text x="11" y="15" font-size="12" text-anchor="middle" font-family="Arial" fill="${DARK}">1.5</text>` + line(3, 18, 19, 18, RED, 1.3),
};
for (const l of ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']) {
  const dx = l.includes('w') ? 4 : l.includes('e') ? 15 : 9.5;
  const dy = l.includes('n') ? 4 : l.includes('s') ? 15 : 9.5;
  CTX_ICONS['carry_' + l] = grid(6, 6, 2, 2, 4) + `<rect x="${dx}" y="${dy}" width="3" height="3" fill="${RED}"/>`;
}
export function ctxIcon(key: string): string {
  return CTX_ICONS[key] ?? rect(5, 5, 12, 12, BLUE);
}
