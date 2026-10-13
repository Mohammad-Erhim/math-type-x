/**
 * Toolbar: tab strip, ten panels, pop-up groups. Data driven by the catalogue (src/data/catalogue.json)
 * and the measured layout (src/data/toolbar-layout.json).
 */
import rtlIcons from '../data/rtl-icons.json';
import { catalogue, Control, behaviorOf } from '../core/catalogue';
import layoutData from '../data/toolbar-layout.json';
import { h, svg } from './dom';
import { controlIcon, tracedPaths, DRAWN_ICONS, NO_RTL_ART, hasDifferential } from './icons';
import CTX_LAYOUT from '../data/ctx-layout.json';
import CTX_ICONS from '../data/ctx-icons.json';
import { ART, TAB_ICONS } from './art';
import { TAB_TITLES, TAB_CAPTIONS, FONT_FAMILIES, FONT_SIZES, ARABIC_FONTS_GROUP } from './messages';

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
  selected = 0;
  private caption!: HTMLElement;
  private panelButtons: HTMLButtonElement[][] = [];
  private ctxPanel: HTMLElement;

  constructor(private host: ToolbarHost) {
    this.header = h('div', { class: 'wrs_header', role: 'tablist' });
    this.container = h('div', { class: 'wrs_panelContainer' });
    // the name of the open tab (narrow windows only): icons alone do not tell a first-time user what a tab holds
    this.caption = h('div', { class: 'wrs_tabCaption', 'aria-hidden': 'true' });
    // narrow windows: the panel is a short window onto its controls; arrows at its edges tell when there is more to see
    const cue = (dir: 'up' | 'down') => {
      const b = h('button', { type: 'button', class: 'wrs_scrollCue wrs_cue' + (dir === 'up' ? 'Up' : 'Down'), tabindex: '-1', 'aria-label': dir === 'up' ? 'Scroll up' : 'Scroll down' }) as HTMLButtonElement;
      b.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="${dir === 'up' ? 'M3 10l5-5 5 5' : 'M3 6l5 5 5-5'}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${dir === 'down' ? '<span>More</span>' : ''}`;
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.addEventListener('click', () => this.container.scrollBy({ top: (dir === 'up' ? -1 : 1) * Math.max(40, this.container.clientHeight * 0.75), behavior: 'smooth' }));
      return b;
    };
    const cueUp = cue('up');
    const cueDown = cue('down');
    this.root = h('div', { class: 'wrs_toolbar wrs_main' }, this.header, this.caption, this.container, cueUp, cueDown);
    this.buildTabs();
    this.buildPanels();
    this.watchScroll();
    this.ctxPanel = this.panels[9];
    this.select(0);
  }

  /** which edges of the panel have more content beyond them (classes of the toolbar): an IntersectionObserver on two
   * sentinels – no scroll listener, nothing runs while the person scrolls */
  private watchScroll(): void {
    if (typeof IntersectionObserver !== 'function') return;
    const top = h('div', { class: 'wrs_sentinel', 'aria-hidden': 'true' });
    const bottom = h('div', { class: 'wrs_sentinel', 'aria-hidden': 'true' });
    this.container.prepend(top);
    this.container.append(bottom);
    const visible = new Map<Element, boolean>([[top, true], [bottom, true]]);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target, e.isIntersecting);
        this.root.classList.toggle('wrs_moreAbove', visible.get(top) === false);
        this.root.classList.toggle('wrs_moreBelow', visible.get(bottom) === false);
      },
      { root: this.container, threshold: 0 },
    );
    io.observe(top);
    io.observe(bottom);
  }

  private buildTabs(): void {
    TAB_TITLES.forEach((title, i) => {
      const ctx = i === 9;
      const btn = h('button', { type: 'button', role: 'tab', class: ctx ? 'wrs_context' : '', title, 'aria-label': title, 'aria-selected': 'false', tabindex: '-1' });
      btn.style.left = i * 46 + 'px';
      const icon = h('span', { class: 'wrs_imageContainer' });
      icon.innerHTML = `<svg width="30" height="20" viewBox="0 0 30 20" aria-hidden="true" style="color:#fff">${TAB_ICONS[i]}</svg>`;
      btn.append(icon);
      btn.addEventListener('click', () => {
        if (ctx && this.ctxOff) return; // nothing to show there
        // narrow screens: a second tap on the open tab folds its panel away (more room for the formula)
        if (this.reflowOn && i === this.selected) {
          const folded = this.container.classList.toggle('wrs_collapsed');
          btn.setAttribute('aria-expanded', String(!folded));
          return;
        }
        this.container.classList.remove('wrs_collapsed');
        this.tabs.forEach((t) => t.removeAttribute('aria-expanded'));
        this.host.selectTab(i);
      });
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
    if (t < 0 || t > 9 || (t === 9 && this.ctxOff)) return;
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
    const mk = (y: number, title: string, opts: { v: string; l: string; ar?: { family: string; name: string } }[]) => {
      const sel = h('select', { title, 'aria-label': title, tabindex: '-1' }) as HTMLSelectElement;
      let group: HTMLElement | null = null;
      opts.forEach((o) => {
        const opt = h('option', { value: o.v, text: o.ar ? `${o.l} — ${o.ar.name}` : o.l });
        if (o.ar) {
          // the Arabic faces form their own group, each entry drawn in its face (a preview of the letters)
          if (!group) {
            group = h('optgroup', { label: ARABIC_FONTS_GROUP });
            sel.append(group);
          }
          opt.style.fontFamily = `'${o.ar.family}'`;
          opt.setAttribute('data-arabic', '');
          group.append(opt);
        } else sel.append(opt);
      });
      const label = h('div', { class: 'wrs_label', text: opts[0].l });
      const box = h('div', { class: 'wrs_select', style: { left: 417 - 3 + 'px', top: y - 28 + 'px' } }, label, sel);
      panel.append(box);
      return { sel, label, box };
    };
    const f = mk(36.5, 'Font family', FONT_FAMILIES.map((o) => ({ v: o.value, l: o.label, ar: o.arabic ? { family: o.arabic.family, name: o.arabic.arLabel } : undefined })));
    const s = mk(67.5, 'Font size', FONT_SIZES.map((v) => ({ v, l: v === 'inherit' ? '— Size —' : v })));
    (this as any).selects = { font: f.sel, size: s.sel, fontLabel: f.label, sizeLabel: s.label, fontBox: f.box, sizeBox: s.box };
  }

  /** build one control button */
  addControl(parent: HTMLElement, c: Control, tab: number, abs = true): HTMLButtonElement {
    const [gx, gy, gw, gh] = c.geom;
    const small = gw <= 22;
    const extra = behaviorOf(c) === 'picker' ? ' wrs_matrixButton' : c.title === 'Color' ? ' wrs_colorChooser' : c.title === 'Insert special characters' ? ' wrs_unicodeChooser' : '';
    const btn = h('button', { type: 'button', class: 'wrs_imageContainer wrs_button ' + (gw > 22 ? 'wrs_big' : 'wrs_small') + extra, title: c.title, 'aria-label': c.title, tabindex: '-1' });
    btn.style.width = gw + 'px';
    btn.style.height = gh + 'px';
    if (abs) {
      btn.style.left = gx - 3 + 'px';
      btn.style.top = gy - 28 + 'px';
    }
    const inner = gw - 4;
    const key = c.special ? specialKey(c.title) : null;
    let body = '';
    // Arabic mode: an Arabic language, or right-to-left editing switched on with the toolbar's button
    const arLang = /^ar/i.test(this.host.lang) || this.rtlOn;
    const alt = this.rtlOn ? (DRAWN_ICONS.has(c.id) || NO_RTL_ART.has(c.id) || (arLang && (hasDifferential(c) || /<mi>ln<\/mi>/.test(c.A ?? ''))) ? undefined : RTL_ICONS.controls[c.id]) : undefined;
    if (alt) body = tracedPaths(alt.layers as any);
    else if (key && ART[key]) body = ART[key](inner, gh - 4);
    else if (behaviorOf(c) === 'digits-arabic' || behaviorOf(c) === 'digits-eastern') body = controlIcon(c, inner, gh - 4) || `<text x="${inner / 2}" y="${inner * 0.75}" font-size="13" text-anchor="middle" fill="#000" font-family="Arial">${behaviorOf(c) === 'digits-arabic' ? '٣٢١' : '۳۲۱'}</text>`;
    else body = controlIcon(c, inner, gh - 4, this.rtlOn, arLang);
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

  /** right-to-left editing is on: controls built from now on (the pop-ups) use the mirrored artwork too */
  private rtlOn = false;

  /** right-to-left editing swaps the directional icons for their mirrored artwork (positions stay) */
  setRtlIcons(on: boolean): void {
    this.rtlOn = on;
    for (const c of catalogue.controls) {
      if (c.group !== 0) continue;
      const btn = this.buttons.get(c.id);
      if (!btn) continue;
      const svgEl = btn.querySelector('svg');
      if (!svgEl) continue;
      const arLang = /^ar/i.test(this.host.lang) || on;
      const alt = on ? (DRAWN_ICONS.has(c.id) || NO_RTL_ART.has(c.id) || (arLang && (hasDifferential(c) || /<mi>ln<\/mi>/.test(c.A ?? ''))) ? undefined : RTL_ICONS.controls[c.id]) : undefined;
      const [w, hh] = [c.geom[2] - 4, c.geom[3] - 4];
      if (alt) svgEl.innerHTML = tracedPaths(alt.layers as any);
      else {
        const key = c.special ? specialKey(c.title) : null;
        svgEl.innerHTML = key && ART[key] ? ART[key](w, hh) : controlIcon(c, w, hh, on, arLang);
      }
    }
    this.tabs.forEach((t, i) => {
      const sv = t.querySelector('svg');
      if (!sv) return;
      const alt = on ? RTL_ICONS.tabs[String(i)] : undefined;
      sv.innerHTML = alt ? tracedPaths(alt.layers as any, 'currentColor') : TAB_ICONS[i];
    });
  }

  /** roving tabindex: only one control of the selected tab is in the page tab order (TAB-006) */
  setTabStop(tab: number, btn: HTMLButtonElement | null): void {
    for (const b of this.panelButtons[tab] ?? []) b.tabIndex = -1;
    if (btn) btn.tabIndex = 0;
  }

  /** the contextual tab has nothing to offer at the caret: it looks disabled and cannot be opened */
  ctxOff = false;
  setContextEnabled(on: boolean): void {
    this.ctxOff = !on;
    const tab = this.tabs[9];
    if (!tab) return;
    tab.classList.toggle('wrs_disabledTab', !on);
    tab.setAttribute('aria-disabled', String(!on));
    this.container.classList.toggle('wrs_ctxEmpty', !on && this.selected === 9);
  }

  /* ------------------------------------------------------------ narrow screens */
  private reflowOn = false;
  private reflowWidth = 0;

  /**
   * Narrow screens (phones): the controls of every panel are laid out in rows that fit the width, so nothing scrolls
   * sideways. Groups stay together (a column of controls is a unit that is never split) and each group's arrow follows
   * it. `width` is the width available to the panel in its own (zoomed) units; 0 puts everything back.
   */
  setReflow(on: boolean, width: number): void {
    if (on === this.reflowOn && width === this.reflowWidth) return;
    this.reflowOn = on;
    this.reflowWidth = width;
    this.panels.forEach((p) => this.reflowPanel(p));
    this.placeCues();
  }

  /** the upper cue sits on the top edge of the panel */
  private placeCues(): void {
    if (this.reflowOn) this.root.style.setProperty('--wrs-cue-top', this.container.offsetTop + 'px');
  }

  /** (re)arrange the children of one panel – also called after the contextual panel was rebuilt */
  reflowPanel(panel: HTMLElement): void {
    const num = (s: string | undefined) => parseFloat(s ?? '') || 0;
    const kids = [...panel.children] as HTMLElement[];
    for (const el of kids) {
      if (el.dataset.ol === undefined) {
        el.dataset.ol = el.style.left;
        el.dataset.ot = el.style.top;
      }
    }
    if (!this.reflowOn) {
      for (const el of kids) {
        el.style.left = el.dataset.ol ?? '';
        el.style.top = el.dataset.ot ?? '';
      }
      for (const el of kids) if (el.classList.contains('wrs_expandButton')) el.style.height = '';
      panel.style.width = '';
      panel.style.height = '';
      return;
    }
    const isLine = (el: HTMLElement) => el.classList.contains('wrs_line');
    const lines = kids.filter(isLine).map((l) => num(l.dataset.ol));
    const items = kids
      .filter((el) => !isLine(el))
      .map((el) => {
        const expand = el.classList.contains('wrs_expandButton');
        const select = el.classList.contains('wrs_select');
        const w = expand ? 26 : num(el.style.width) || (select ? 73 : 0);
        const hgt = expand ? 33 : num(el.style.height) || (select ? 18 : 0);
        const x = num(el.dataset.ol);
        // the font / size boxes sit side by side instead of one above the other (the row is short of room)
        const y = select && !el.classList.contains('wrs_ctxSelect') ? NaN : num(el.dataset.ot);
        return { el, x, y, w, h: hgt, part: lines.filter((lx) => lx <= x + 0.5).length };
      });
    if (!items.length) return;
    const minY = Math.min(...items.filter((q) => !Number.isNaN(q.y)).map((q) => q.y), Infinity);
    for (const q of items) if (Number.isNaN(q.y)) q.y = Number.isFinite(minY) ? minY : 0;
    const parts = new Map<number, typeof items>();
    for (const q of items) parts.set(q.part, [...(parts.get(q.part) ?? []), q]);
    // room around the controls: the edges of the panel are not a place to tap
    const PAD = 10;
    const avail = Math.max(60, this.reflowWidth - PAD * 2);
    let cx = PAD;
    let cy = 8;
    let rowH = 0;
    for (const key of [...parts.keys()].sort((a, b) => a - b)) {
      const list = parts.get(key)!.sort((a, b) => a.x - b.x || a.y - b.y);
      // columns: controls that start at (nearly) the same x are stacked and move together
      const units: { x0: number; w: number; h: number; items: typeof items; ex?: (typeof items)[number] }[] = [];
      for (const q of list) {
        const u = units[units.length - 1];
        const isExpand = q.el.classList.contains('wrs_expandButton');
        if (u && isExpand && !u.ex) {
          // the arrow of a group stays with the group's last column
          u.ex = q;
        } else if (u && Math.abs(q.x - u.x0) <= 3 && !isExpand && !q.el.classList.contains('wrs_select')) {
          u.items.push(q);
          u.w = Math.max(u.w, q.w);
          u.h = Math.max(u.h, q.y - minY + q.h);
        } else units.push({ x0: q.x, w: q.w, h: q.y - minY + q.h, items: [q] });
      }
      // the arrow of a group is as tall as the group's columns
      const partH = Math.max(...units.map((u) => u.h));
      for (const u of units) {
        if (u.ex) {
          u.ex.h = partH;
          u.ex.el.style.height = partH + 'px';
          u.h = partH;
        }
      }
      if (cx > PAD) cx += 12;
      for (const u of units) {
        const full = u.w + (u.ex ? 4 + u.ex.w : 0);
        if (cx > PAD && cx + full > avail + PAD) {
          cx = PAD;
          cy += rowH + 8;
          rowH = 0;
        }
        for (const q of u.items) {
          q.el.style.left = cx + (q.x - u.x0) + 'px';
          q.el.style.top = cy + (q.y - minY) + 'px';
        }
        if (u.ex) {
          u.ex.el.style.left = cx + u.w + 4 + 'px';
          u.ex.el.style.top = cy + 'px';
        }
        cx += full + 2;
        rowH = Math.max(rowH, u.h);
      }
    }
    panel.style.width = this.reflowWidth + 'px';
    panel.style.height = cy + rowH + 10 + 'px';
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
    this.caption.textContent = TAB_CAPTIONS[i] ?? '';
    this.container.scrollTop = 0;
    this.placeCues();
    this.container.classList.toggle('wrs_ctxEmpty', this.ctxOff && i === 9);
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
            label.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${tracedPaths(art.layers as any)}</svg>`;
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
        const body = art ? tracedPaths(art.layers as any) : '';
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
    if (this.reflowOn) this.reflowPanel(panel);
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
    if (this.reflowOn) this.reflowPanel(this.ctxPanel);
  }
}

void svg;
