/**
 * Toolbar: tab strip, ten panels, pop-up groups. Data driven by the catalogue (src/data/catalogue.json)
 * and the measured layout (src/data/toolbar-layout.json).
 */
import rtlIcons from '../data/rtl-icons.json';
import { catalogue, Control, behaviorOf } from '../core/catalogue';
import layoutData from '../data/toolbar-layout.json';
import { h, svg } from './dom';
import { controlIcon } from './icons';
import CTX_LAYOUT from '../data/ctx-layout.json';
import CTX_ICONS from '../data/ctx-icons.json';
import { ART, TAB_ICONS } from './art';
import { TAB_TITLES, FONT_FAMILIES, FONT_SIZES } from './messages';

interface CtxCell {
  x: number;
  y: number;
  w: number;
  h: number;
  t: 'b' | 's' | 'e';
  title?: string;
  on?: number;
  len?: number;
  wi?: number;
  icon?: string;
}
interface CtxGroup {
  line?: boolean;
  x: number;
  y: number;
  h: number;
  cells?: CtxCell[];
}
interface CtxLayout {
  groups: CtxGroup[];
}

const LAYOUT = layoutData as unknown as { tabs: { lines: [number, number, number, number][]; expands: [number, number, number, number][]; selects: { x: number; y: number; w: number; h: number }[] }[] };

export interface ToolbarHost {
  runControl(c: Control, origin: 'pointer' | 'keyboard'): void;
  selectTab(i: number, focusFirst?: boolean): void;
  openGroup(tab: number, group: number, btn: HTMLElement): void;
  focusEditor(): void;
  lang: string;
}

/** special controls (non-insert) keyed by tooltip prefix → artwork key */
const SPECIAL_ART: [RegExp, string][] = [
  [/^Press Ctrl\+C/, 'copy'],
  [/^Press Ctrl\+X/, 'cut'],
  [/^Press Ctrl\+V/, 'paste'],
  [/^Undo/, 'undo'],
  [/^Redo/, 'redo'],
  [/^Bold/, 'bold'],
  [/^Color/, 'color'],
  [/^Italic/, 'italic'],
  [/^Insert special/, 'special'],
  [/^Automatic italic/, 'autoitalic'],
  [/^Regular text/, 'regtext'],
  [/^Right to left/, 'rtl'],
  [/^Arabic ligature/, 'ligature'],
];

export function specialKey(title: string): string | null {
  for (const [re, k] of SPECIAL_ART) if (re.test(title)) return k;
  return null;
}

/** layout of the pop-up of every expand button, in x order: 3-row or 2-row grid (measured from the reference) */
const EXPAND_ROWS: Record<number, number[]> = { 2: [3, 2], 4: [2], 6: [2, 2, 2], 7: [2], 8: [2, 2] };

type TracedSet = { controls: Record<string, { w: number; layers: { fill: string; d: string }[] }>; tabs: Record<string, { w: number; h: number; layers: { fill: string; d: string }[] }> };
const RTL_ICONS = rtlIcons as unknown as TracedSet;

export class Toolbar {
  readonly root: HTMLElement;
  readonly header: HTMLElement;
  readonly container: HTMLElement;
  readonly tabs: HTMLButtonElement[] = [];
  readonly panels: HTMLElement[] = [];
  readonly buttons = new Map<string, HTMLButtonElement>();
  readonly byTitle = new Map<string, HTMLButtonElement>();
  readonly expands: HTMLButtonElement[][] = [];
  readonly selects: { font: HTMLSelectElement; size: HTMLSelectElement; fontLabel: HTMLElement; sizeLabel: HTMLElement; fontBox: HTMLElement; sizeBox: HTMLElement } | null = null;
  readonly link: HTMLAnchorElement;
  selected = 0;
  private panelButtons: HTMLButtonElement[][] = [];
  private ctxPanel: HTMLElement;

  constructor(private host: ToolbarHost, manualUrl: string) {
    this.header = h('div', { class: 'wrs_header', role: 'tablist' });
    this.container = h('div', { class: 'wrs_panelContainer' });
    this.link = h('a', { class: 'wrs_linkButton wrs_imageContainer', href: manualUrl, target: '_blank', rel: 'noopener', title: 'Manual', 'aria-label': 'Manual' }) as HTMLAnchorElement;
    this.link.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${ART.help(18, 18)}</svg>`;
    const links = h('div', { class: 'wrs_linksContainer' }, this.link);
    this.root = h('div', { class: 'wrs_toolbar wrs_main' }, links, this.header, this.container);
    this.buildTabs();
    this.buildPanels();
    this.ctxPanel = this.panels[9];
    this.select(0);
  }

  private buildTabs(): void {
    TAB_TITLES.forEach((title, i) => {
      const ctx = i === 9;
      const btn = h('button', { type: 'button', role: 'tab', class: ctx ? 'wrs_context' : '', title, 'aria-label': title, 'aria-selected': 'false', tabindex: '-1' });
      btn.style.left = i * 46 + 'px';
      const icon = h('span', { class: 'wrs_imageContainer' });
      icon.innerHTML = `<svg width="30" height="20" viewBox="0 0 30 20" aria-hidden="true" style="color:#fff">${TAB_ICONS[i]}</svg>`;
      btn.append(icon);
      btn.addEventListener('click', () => this.host.selectTab(i));
      btn.addEventListener('keydown', (e) => this.tabKey(e as KeyboardEvent, i));
      this.header.append(btn);
      this.tabs.push(btn);
    });
  }

  private tabKey(e: KeyboardEvent, i: number): void {
    const rtl = this.root.closest('.wrs_rtl') !== null;
    let t = i;
    if (e.key === 'ArrowRight') t = rtl ? i - 1 : i + 1;
    else if (e.key === 'ArrowLeft') t = rtl ? i + 1 : i - 1;
    else if (e.key === 'Tab' && !e.shiftKey) {
      // Tab moves into the symbol grid
      const first = this.firstButton(this.selected);
      if (first) {
        e.preventDefault();
        first.focus();
      }
      return;
    } else return;
    e.preventDefault();
    if (t < 0 || t > 9) return;
    this.host.selectTab(t);
    this.tabs[t].focus();
  }

  firstButton(tab: number): HTMLButtonElement | null {
    return this.panelButtons[tab]?.find((b) => b.tabIndex >= -1 && !b.classList.contains('wrs_expandButton')) ?? null;
  }

  private buildPanels(): void {
    for (let t = 0; t < 10; t++) {
      const panel = h('div', { class: 'wrs_multipleRowPanel', role: 'toolbar' });
      this.panels.push(panel);
      this.container.append(panel);
      this.panelButtons.push([]);
      this.expands.push([]);
      if (t === 9) continue;
      const lay = LAYOUT.tabs[t];
      const main = catalogue.controls.filter((c) => c.tab === t && c.group === 0).sort((a, b) => a.n - b.n);
      for (const c of main) this.addControl(panel, c, t);
      for (const [x, y, w, hh] of lay.lines) panel.append(h('span', { class: 'wrs_line', style: { left: x - 3 + 'px', top: y - 28 + 'px', height: hh + 'px' } }));
      const groupsOf = catalogue.groups.filter((g) => g.tab === t).sort((a, b) => a.index - b.index);
      groupsOf.forEach((g, k) => {
        const e = lay.expands[k];
        if (!e) return;
        const btn = h('button', { type: 'button', class: 'wrs_expandButton wrs_expandButtonFor' + (EXPAND_ROWS[t]?.[k] ?? 3) + 'RowsLayout', title: 'More', 'aria-label': 'More', 'aria-haspopup': 'true', 'aria-expanded': 'false', tabindex: '-1' });
        btn.style.left = e[0] - 3 + 'px';
        btn.style.top = e[1] - 28 + 'px';
        btn.addEventListener('mousedown', (ev) => ev.preventDefault());
        btn.addEventListener('click', () => this.host.openGroup(t, g.index, btn));
        btn.addEventListener('keydown', (ev) => {
          const k = (ev as KeyboardEvent).key;
          if (k === 'ArrowDown') {
            ev.preventDefault();
            this.host.openGroup(t, g.index, btn);
          } else this.gridKey(ev as KeyboardEvent, btn, panel, t);
        });
        panel.append(btn);
        this.expands[t].push(btn);
        this.panelButtons[t].push(btn);
      });
      if (t === 0) this.addSelects(panel);
    }
  }

  private addSelects(panel: HTMLElement): void {
    const mk = (y: number, title: string, opts: { v: string; l: string }[]) => {
      const sel = h('select', { title, 'aria-label': title, tabindex: '-1' }) as HTMLSelectElement;
      opts.forEach((o) => sel.append(h('option', { value: o.v, text: o.l })));
      const label = h('div', { class: 'wrs_label', text: opts[0].l });
      const box = h('div', { class: 'wrs_select', style: { left: 417 - 3 + 'px', top: y - 28 + 'px' } }, label, sel);
      panel.append(box);
      return { sel, label, box };
    };
    const f = mk(36.5, 'Font family', FONT_FAMILIES.map((o) => ({ v: o.value, l: o.label })));
    const s = mk(67.5, 'Font size', FONT_SIZES.map((v) => ({ v, l: v === 'inherit' ? '— Size —' : v })));
    (this as any).selects = { font: f.sel, size: s.sel, fontLabel: f.label, sizeLabel: s.label, fontBox: f.box, sizeBox: s.box };
  }

  /** build one control button */
  addControl(parent: HTMLElement, c: Control, tab: number, abs = true): HTMLButtonElement {
    const [gx, gy, gw, gh] = c.geom;
    const small = gw <= 22;
    const extra = behaviorOf(c) === 'picker' ? ' wrs_matrixButton' : c.title === 'Color' ? ' wrs_colorChooser' : c.title === 'Insert special characters' ? ' wrs_unicodeChooser' : '';
    const btn = h('button', { type: 'button', class: 'wrs_imageContainer wrs_button' + extra, title: c.title, 'aria-label': c.title, tabindex: '-1' });
    btn.style.width = gw + 'px';
    btn.style.height = gh + 'px';
    if (abs) {
      btn.style.left = gx - 3 + 'px';
      btn.style.top = gy - 28 + 'px';
    }
    const inner = gw - 4;
    const key = c.special ? specialKey(c.title) : null;
    let body = '';
    if (key && ART[key]) body = ART[key](inner, gh - 4);
    else if (behaviorOf(c) === 'digits-arabic' || behaviorOf(c) === 'digits-eastern') body = controlIcon(c, inner, gh - 4) || `<text x="${inner / 2}" y="${inner * 0.75}" font-size="13" text-anchor="middle" fill="#000" font-family="Arial">${behaviorOf(c) === 'digits-arabic' ? '٣٢١' : '۳۲۱'}</text>`;
    else body = controlIcon(c, inner, gh - 4);
    btn.innerHTML = `<svg width="${inner}" height="${gh - 4}" viewBox="0 0 ${inner} ${gh - 4}" aria-hidden="true">${body}</svg>`;
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      if (btn.classList.contains('wrs_disabled')) return;
      this.host.runControl(c, (e as MouseEvent).detail === 0 ? 'keyboard' : 'pointer');
    });
    btn.addEventListener('keydown', (e) => this.gridKey(e as KeyboardEvent, btn, parent, tab));
    parent.append(btn);
    if (c.group === 0) {
      this.buttons.set(c.id, btn);
      if (!this.byTitle.has(c.title)) this.byTitle.set(c.title, btn);
      this.panelButtons[tab]?.push(btn);
    }
    return btn;
  }

  /** two-dimensional arrow-key navigation inside a grid of controls (TAB-006) */
  private gridKey(e: KeyboardEvent, btn: HTMLElement, parent: HTMLElement, tab: number): void {
    const items = [...parent.querySelectorAll<HTMLButtonElement>('button.wrs_button, button.wrs_expandButton')].filter((b) => !b.classList.contains('wrs_disabled'));
    const rect = (b: HTMLElement) => ({ x: b.offsetLeft + b.offsetWidth / 2, y: b.offsetTop + b.offsetHeight / 2 });
    const cur = rect(btn);
    let best: HTMLButtonElement | null = null;
    let bd = Infinity;
    const rtl = parent.closest('.wrs_rtl') !== null;
    const dir = e.key === 'ArrowLeft' ? (rtl ? 'r' : 'l') : e.key === 'ArrowRight' ? (rtl ? 'l' : 'r') : e.key === 'ArrowUp' ? 'u' : e.key === 'ArrowDown' ? 'd' : '';
    if (e.key === 'Escape') {
      // Esc did not move focus back to the editing area in the reference
      return;
    }
    if (e.key === 'Tab') {
      if (!e.shiftKey) return;
      return;
    }
    if (!dir) return;
    e.preventDefault();
    for (const b of items) {
      if (b === btn) continue;
      const r = rect(b);
      const dx = r.x - cur.x;
      const dy = r.y - cur.y;
      const ok = dir === 'l' ? dx < -2 : dir === 'r' ? dx > 2 : dir === 'u' ? dy < -2 : dy > 2;
      if (!ok) continue;
      // a tall control (the group expander) is level with every row it spans
      const span = dir === 'l' || dir === 'r' ? Math.max(0, b.offsetTop - cur.y, cur.y - (b.offsetTop + b.offsetHeight)) : Math.abs(dy);
      const d = dir === 'l' || dir === 'r' ? Math.abs(dx) + span * 3 : Math.abs(dy) + Math.abs(dx) * 3;
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    if (best) {
      this.setTabStop(tab, best);
      best.focus();
    }
  }

  /** right-to-left editing swaps the directional icons for their mirrored artwork (positions stay) */
  setRtlIcons(on: boolean): void {
    for (const c of catalogue.controls) {
      if (c.group !== 0) continue;
      const btn = this.buttons.get(c.id);
      if (!btn) continue;
      const svgEl = btn.querySelector('svg');
      if (!svgEl) continue;
      const alt = on ? RTL_ICONS.controls[c.id] : undefined;
      const [w, hh] = [c.geom[2] - 4, c.geom[3] - 4];
      if (alt) svgEl.innerHTML = alt.layers.map((l) => `<path d="${l.d}" fill="${l.fill}"${(l as any).op ? ` fill-opacity="${(l as any).op}"` : ''} fill-rule="evenodd"/>`).join('');
      else {
        const key = c.special ? specialKey(c.title) : null;
        svgEl.innerHTML = key && ART[key] ? ART[key](w, hh) : controlIcon(c, w, hh);
      }
    }
    this.tabs.forEach((t, i) => {
      const sv = t.querySelector('svg');
      if (!sv) return;
      const alt = on ? RTL_ICONS.tabs[String(i)] : undefined;
      sv.innerHTML = alt ? alt.layers.map((l) => `<path d="${l.d}" fill="currentColor"${(l as any).op ? ` fill-opacity="${(l as any).op}"` : ''} fill-rule="evenodd"/>`).join('') : TAB_ICONS[i];
    });
  }

  /** roving tabindex: only one control of the selected tab is in the page tab order (TAB-006) */
  setTabStop(tab: number, btn: HTMLButtonElement | null): void {
    for (const b of this.panelButtons[tab] ?? []) b.tabIndex = -1;
    if (btn) btn.tabIndex = 0;
  }

  select(i: number): void {
    this.selected = i;
    this.tabs.forEach((t, k) => {
      const on = k === i;
      t.classList.toggle('wrs_selected', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      (t.querySelector('svg') as SVGElement).style.color = on ? '#51636d' : '#fff';
    });
    this.panels.forEach((p, k) => p.classList.toggle('wrs_selected', k === i));
    // the first control of the selected tab is the single tab stop
    for (let t = 0; t < 10; t++) this.setTabStop(t, null);
    const first = this.firstButton(i);
    if (first) first.tabIndex = 0;
    this.tabs.forEach((t, k) => {
      t.style.zIndex = k === i ? '3' : '';
    });
  }

  setState(id: string, st: { toggled?: boolean; disabled?: boolean }): void {
    const b = this.buttons.get(id);
    if (!b) return;
    if (st.toggled !== undefined) b.classList.toggle('wrs_toggled', st.toggled);
    if (st.disabled !== undefined) {
      b.classList.toggle('wrs_disabled', st.disabled);
      if (st.disabled) b.setAttribute('aria-disabled', 'true');
      else b.removeAttribute('aria-disabled');
    }
  }

  /** replace the content of the contextual tab */
  /** the contextual tab: the recorded arrangement of the reference (groups of 22 / 33 px buttons, selects, separators) */
  renderContext(layout: string, controls: { id: string; title: string; kind: string; icon: string; group: number; options?: { value: string; label: string }[]; disabled?: boolean }[], onApply: (id: string, kind: string, el: HTMLElement) => void, iconFor: (key: string) => string, valueOf: (id: string) => { toggled?: boolean; value?: string }): void {
    const lay = (CTX_LAYOUT as Record<string, CtxLayout>)[layout];
    if (!lay) {
      this.renderContextPlain(controls, onApply, iconFor, valueOf);
      return;
    }
    const panel = this.ctxPanel;
    panel.textContent = '';
    if (!controls.length) return;
    const byTitle = new Map(controls.map((c) => [c.title, c]));
    for (const g of lay.groups) {
      if (g.line) {
        panel.append(h('span', { class: 'wrs_line', style: { left: g.x + 'px', top: g.y + 'px', height: g.h + 'px' } }));
        continue;
      }
      for (const cell of g.cells ?? []) {
        if (cell.t === 'e' || !cell.title) continue;
        const c = byTitle.get(cell.title);
        if (!c) continue;
        const left = g.x + cell.x;
        const top = g.y + cell.y;
        if (cell.t === 's') {
          const box = h('div', { class: 'wrs_select wrs_ctxSelect', style: { left: left + 'px', top: top + 'px', width: cell.w + 'px', height: cell.h + 'px' } });
          const el = h('select', { title: c.title, 'aria-label': c.title }) as HTMLSelectElement;
          (c.options ?? []).forEach((o) => el.append(h('option', { value: o.value, text: o.label })));
          const label = h('div', { class: 'wrs_label' });
          el.value = valueOf(c.id).value ?? '';
          const art = cell.wi && cell.icon ? (CTX_ICONS as Record<string, { w: number; layers: { fill: string; d: string; op?: number }[] }>)[cell.icon] : undefined;
          if (art) {
            // a select that shows an icon instead of its current text (spacing between digits)
            box.classList.add('wrs_withIcon');
            label.style.paddingLeft = '1px';
            label.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${art.layers.map((l) => `<path d="${l.d}" fill="${l.fill}"${l.op ? ` fill-opacity="${l.op}"` : ''} fill-rule="evenodd"/>`).join('')}</svg>`;
          } else label.textContent = el.options[el.selectedIndex]?.text ?? '';
          el.addEventListener('change', () => {
            if (!art) label.textContent = el.options[el.selectedIndex]?.text ?? '';
            onApply(c.id, 'select', el);
          });
          box.append(label, el);
          panel.append(box);
          continue;
        }
        const btn = h('button', { type: 'button', class: 'wrs_imageContainer wrs_button' + (cell.len ? ' wrs_lengthButton' : ''), title: c.title, 'aria-label': c.title, tabindex: '-1' });
        btn.style.width = cell.w + 'px';
        btn.style.height = cell.h + 'px';
        btn.style.left = left + 'px';
        btn.style.top = top + 'px';
        const size = cell.w - 4;
        const art = cell.icon ? (CTX_ICONS as Record<string, { w: number; layers: { fill: string; d: string; op?: number }[] }>)[cell.icon] : undefined;
        const body = art ? art.layers.map((l) => `<path d="${l.d}" fill="${l.fill}"${l.op ? ` fill-opacity="${l.op}"` : ''} fill-rule="evenodd"/>`).join('') : '';
        btn.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${body}</svg>`;
        btn.classList.add(cell.w > 22 ? 'wrs_big' : 'wrs_small');
        const v = valueOf(c.id);
        if (v.toggled) btn.classList.add('wrs_toggled');
        if (c.disabled) {
          btn.classList.add('wrs_disabled');
          btn.setAttribute('aria-disabled', 'true');
        }
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
          if (btn.classList.contains('wrs_disabled')) return;
          onApply(c.id, c.kind, btn);
        });
        panel.append(btn);
      }
    }
  }

  /** fallback arrangement (a control set without a recorded layout) */
  private renderContextPlain(controls: { id: string; title: string; kind: string; icon: string; group: number; options?: { value: string; label: string }[]; disabled?: boolean }[], onApply: (id: string, kind: string, el: HTMLElement) => void, iconFor: (key: string) => string, valueOf: (id: string) => { toggled?: boolean; value?: string }): void {
    const panel = this.ctxPanel;
    panel.textContent = '';
    if (!controls.length) return;
    // layout: groups of 3 rows; column pitch 22 (small buttons) / selects are 40 px wide
    let x = 0;
    let lastGroup = -1;
    let col = 0;
    let row = 0;
    const colW = 22;
    const rowH = 22;
    controls.forEach((c) => {
      if (c.group !== lastGroup) {
        if (lastGroup !== -1) {
          x += (col > 0 || row > 0 ? (row === 0 ? 0 : 1) : 0) * colW + 4;
          panel.append(h('span', { class: 'wrs_line', style: { left: x - 4 + 'px', top: '3px', height: '60px' } }));
        }
        lastGroup = c.group;
        col = 0;
        row = 0;
        if (x === 0) x = 1;
      }
      const top = 1 + row * rowH;
      if (c.kind === 'select') {
        const el = h('select', { title: c.title, 'aria-label': c.title }) as HTMLSelectElement;
        (c.options ?? []).forEach((o) => el.append(h('option', { value: o.value, text: o.label })));
        const w = 40;
        const box = h('div', { class: 'wrs_select', style: { left: x + col * colW + 'px', top: top + 1 + 'px', width: w + 'px', height: '18px' } });
        const label = h('div', { class: 'wrs_label', style: { width: w - 2 + 'px' } });
        const v = valueOf(c.id).value ?? '';
        el.value = v;
        label.textContent = el.options[el.selectedIndex]?.text ?? v;
        el.addEventListener('change', () => {
          label.textContent = el.options[el.selectedIndex]?.text ?? '';
          onApply(c.id, 'select', el);
        });
        box.append(label, el);
        panel.append(box);
        row++;
        if (row > 2) {
          row = 0;
          col += 2;
        }
        return;
      }
      const btn = h('button', { type: 'button', class: 'wrs_imageContainer wrs_button', title: c.title, 'aria-label': c.title, tabindex: '-1' });
      btn.style.width = '22px';
      btn.style.height = '22px';
      btn.style.left = x + col * colW + 'px';
      btn.style.top = top + 'px';
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true">${iconFor(c.icon)}</svg>`;
      const v = valueOf(c.id);
      if (v.toggled) btn.classList.add('wrs_toggled');
      if (c.disabled) {
        btn.classList.add('wrs_disabled');
        btn.setAttribute('aria-disabled', 'true');
      }
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        if (btn.classList.contains('wrs_disabled')) return;
        onApply(c.id, c.kind, btn);
      });
      panel.append(btn);
      row++;
      if (row > 2) {
        row = 0;
        col += 1;
      }
    });
  }
}

void svg;
