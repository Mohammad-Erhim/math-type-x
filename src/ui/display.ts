/**
 * The formula display: renders the layout as SVG, draws caret / selection overlays and turns pointer
 * input into caret positions. It does not know about the toolbar.
 */
import { Caret, Selection, Step } from '../core/model';
import { DocLayout, pathKey } from '../layout/layout';
import { itemsToSvg } from '../layout/svg';
import { h } from './dom';

export interface RenderState {
  caret: Caret;
  sel: Selection | null;
  focused: boolean;
  rtl: boolean;
  /** column / row marks (smart delete) are shown as selection */
  showCaret: boolean;
  /** CSS family of the chosen bundled Arabic face */
  arabic?: string;
}

export const COLORS = { selection: '#c3c3c3', selectionDark: '#3c3c3c', editCtx: '#cddce3', error: '#ffaaaa', caret: '#000', emptyBox: '#006400' };

export class FormulaDisplay {
  readonly wrapper: HTMLElement;
  private caretHandle!: HTMLElement;
  readonly view: HTMLElement;
  readonly input: HTMLInputElement;
  readonly live: HTMLElement;
  private content: HTMLElement;
  private svgHost: HTMLElement;
  private selLayer: HTMLElement;
  private caretEl: HTMLElement;
  private underline: HTMLElement;
  private selHandles = {} as Record<'from' | 'to', HTMLElement>;
  layout: DocLayout | null = null;
  private blink: ReturnType<typeof setInterval> | null = null;
  private visible = true;
  /** padding of the formula container (px) */
  readonly pad = 5;

  constructor() {
    this.live = h('div', { class: 'wrs_ariaLiveRegion wrs_hiddenButDisplayed', 'aria-live': 'polite', 'aria-hidden': 'false' });
    this.svgHost = h('div', { class: 'wrs_formulaSvg' });
    this.selLayer = h('div', { class: 'wrs_selectionLayer' });
    this.caretEl = h('div', { class: 'wrs_caret wrs_dark' });
    this.caretHandle = h('div', { class: 'wrs_caretPrecisionController', style: { width: '0', height: '0', overflow: 'hidden', display: 'none' } });
    this.underline = h('div', { class: 'wrs_underlineCaret wrs_dark', style: { display: 'none' } });
    // the reference keeps the caret handle and two selection handles in the page at all times (hidden when unused)
    for (const end of ['from', 'to'] as const) {
      const el = h('div', { class: 'wrs_caretPrecisionController wrs_forSelection', style: { width: '0', height: '0', overflow: 'hidden', display: 'none' } });
      el.innerHTML = '<svg width="24" height="36" viewBox="0 0 24 36" aria-hidden="true"><path d="M12 1 L22 11 V34 H2 V11 Z" fill="#00aaff" stroke="#0088cc" stroke-width="1"/></svg>';
      el.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        // the handle may sit beside the edge it belongs to (kept inside the window): the drag moves the edge by what
        // the finger moved, not to where the finger is
        const ax = Number(el.dataset.ax ?? NaN);
        const start = this.toContent(ev.clientX, ev.clientY - 18);
        const off = Number.isFinite(ax) ? start.x - ax : 0;
        const move = (e2: PointerEvent) => {
          const q = this.toContent(e2.clientX, e2.clientY - 18);
          this.onHandle?.(end, q.x - off, q.y);
        };
        const up = () => {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
      });
      this.selHandles[end] = el;
    }
    this.input = h('input', {
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'none',
      autocorrect: 'off',
      spellcheck: false,
      'aria-hidden': 'false',
      title: 'Math input',
      class: 'wrs_focusElement',
    });
    const focusBox = h('div', { class: 'wrs_focusElementContainer' }, this.input);
    this.content = h('div', { class: 'wrs_formulaContent' }, this.selLayer, this.svgHost, this.underline, this.caretEl, this.caretHandle, this.selHandles.from, this.selHandles.to, focusBox);
    this.view = h('div', { class: 'wrs_formulaDisplay', tabindex: '-1' }, this.live, this.content);
    this.wrapper = h('div', { class: 'wrs_formulaDisplayWrapper' }, this.view);
  }

  /* --------------------------------------------------------------- render */
  render(layout: DocLayout, st: RenderState): void {
    this.layout = layout;
    const w = Math.ceil(layout.w) + 2;
    const hgt = Math.ceil(layout.a + layout.d) + 2;
    this.svgHost.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" aria-hidden="true" role="presentation" style="position:absolute;left:0;top:0;overflow:visible;direction:ltr">${itemsToSvg(layout.items, { slot: COLORS.emptyBox, ui: true, arabic: st.arabic })}</svg>`;
    this.content.style.width = w + 'px';
    this.content.style.height = hgt + 'px';
    this.content.style.direction = st.rtl ? 'rtl' : 'ltr';
    this.renderOverlay(st);
  }

  renderOverlay(st: RenderState): void {
    const lay = this.layout;
    if (!lay) return;
    // selection
    this.selLayer.textContent = '';
    if (st.sel && st.sel.from !== st.sel.to && this.touch) this.addHandles(st.sel, lay);
    else this.hideHandles();
    if (st.sel && st.sel.cells && st.sel.from !== st.sel.to) {
      // a range of table cells: each selected cell is highlighted on its own
      for (const slot of st.sel.cells.slots) {
        const g = lay.rows.get(pathKey([...st.sel.path, [st.sel.from, slot]]));
        if (!g || g.xs.length < 2) continue;
        const x1 = g.xs[0];
        const x2 = g.xs[g.xs.length - 1];
        if (x2 !== x1) this.selLayer.append(h('div', { class: 'wrs_selection', style: { left: Math.min(x1, x2) + 'px', top: g.y - g.a + 'px', width: Math.abs(x2 - x1) + 'px', height: g.a + g.d + 'px' } }));
      }
    } else if (st.sel && st.sel.from !== st.sel.to) {
      const g = lay.rows.get(pathKey(st.sel.path));
      if (g) {
        const from = Math.min(st.sel.from, st.sel.to);
        const to = Math.max(st.sel.from, st.sel.to);
        const root = st.sel.path.length === 0;
        let start = from;
        for (let i = from; i <= to; i++) {
          const y = root ? lay.rootYs[i] : g.y;
          const yPrev = root ? lay.rootYs[Math.max(i - 1, from)] : g.y;
          if (i === to || (root && y !== yPrev)) {
            const end = i === to ? to : i - 1;
            if (end > start || i === to) {
              const x1 = g.xs[start];
              const x2 = g.xs[end];
              const yy = root ? lay.rootYs[start] : g.y;
              const line = root ? lay.lines.find((l) => l.y === yy) : null;
              const a = line ? line.a : g.a;
              const d = line ? line.d : g.d;
              // right-to-left rows run backwards: the selected span lies between the two caret positions either way
              if (x2 !== x1) this.selLayer.append(h('div', { class: 'wrs_selection', style: { left: Math.min(x1, x2) + 'px', top: yy - a + 'px', width: Math.abs(x2 - x1) + 'px', height: a + d + 'px' } }));
            }
            start = i;
          }
        }
      }
    }
    // caret: the rectangle of the element to its left, and an underline marking the row (or run) it is in
    const pos = this.caretPosition(st.caret);
    if (pos) {
      const s = pos.size;
      const rect = this.caretRect(st.caret);
      const shown = st.focused && st.showCaret && !(st.sel && st.sel.from !== st.sel.to);
      this.caretEl.style.left = Math.round(pos.x) + 'px';
      this.caretEl.style.top = Math.round(rect ? rect.top : pos.y - s) + 'px';
      this.caretEl.style.height = (rect ? Math.round(rect.h) : Math.round(s * 1.25)) + 'px';
      this.caretEl.style.display = shown ? 'block' : 'none';
      const ul = this.underlineFor(st.caret);
      if (ul && shown && ul.x1 - ul.x0 >= 1) {
        this.underline.style.display = 'block';
        this.underline.style.left = Math.round(ul.x0) + 'px';
        this.underline.style.top = Math.round(ul.y) + 'px';
        this.underline.style.width = Math.round(ul.x1 - ul.x0) + 'px';
      } else this.underline.style.display = 'none';
    }
  }

  /** caret rectangle in content coordinates: top and height follow the element to the left of the caret */
  caretRect(c: Caret): { top: number; h: number } | null {
    const lay = this.layout;
    if (!lay) return null;
    const g = lay.rows.get(pathKey(c.path));
    if (!g || !g.ct || !g.ch) return null;
    const i = Math.min(c.index, g.ct.length - 1);
    const base = c.path.length === 0 ? lay.rootYs[Math.min(c.index, lay.rootYs.length - 1)] : g.ys ? g.ys[Math.min(c.index, g.ys.length - 1)] : g.y;
    return { top: base + g.ct[i], h: g.ch[i] };
  }

  /** the mark under the row the caret is in: the whole row, or just the number / word the caret is inside */
  underlineFor(c: Caret): { x0: number; x1: number; y: number } | null {
    const lay = this.layout;
    if (!lay) return null;
    const g = lay.rows.get(pathKey(c.path));
    if (!g) return null;
    const i = Math.min(c.index, g.xs.length - 1);
    if (g.ul && g.ul[i]) return g.ul[i];
    let base: number;
    let d = g.uld ?? g.d;
    let lift = g.lift ?? 0;
    let from = 0;
    let to = g.xs.length - 1;
    if (c.path.length === 0) {
      base = lay.rootYs[Math.min(c.index, lay.rootYs.length - 1)];
      const line = lay.lines.find((l) => l.y === base && c.index >= l.from && c.index <= l.to) ?? lay.lines.find((l) => l.y === base);
      if (line) {
        d = line.uld ?? line.d;
        lift = line.lift ?? 0;
        from = line.from;
        to = line.to;
      }
    } else base = g.ys ? g.ys[Math.min(c.index, g.ys.length - 1)] : g.y;
    const run = g.runs?.find(([f, t]) => i > f && i < t);
    if (run) {
      from = run[0];
      to = run[1];
    }
    return { x0: g.xs[from], x1: g.xs[to], y: base + d - lift - 2 };
  }

  /** touch devices: two pentagonal handles under the ends of the selection (TCH-002) */
  readonly touch = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0);
  /** called while a handle is dragged: which end moved and the content-space pointer position */
  onHandle: ((end: 'from' | 'to', x: number, y: number) => void) | null = null;

  private addHandles(sel: { path: Step[]; from: number; to: number }, lay: DocLayout): void {
    const g = lay.rows.get(pathKey(sel.path));
    if (!g) return;
    const root = sel.path.length === 0;
    for (const end of ['from', 'to'] as const) {
      const i = sel[end];
      const x = g.xs[Math.min(i, g.xs.length - 1)];
      const y = root ? lay.rootYs[Math.min(i, lay.rootYs.length - 1)] : g.y;
      const line = root ? lay.lines.find((l) => l.y === y) : null;
      const bottom = y + (line ? line.d : g.d);
      const el = this.selHandles[end];
      el.style.left = Math.round(x - 12) + 'px';
      el.style.top = Math.round(bottom) + 'px';
      el.style.width = '24px';
      el.style.height = '36px';
      el.style.overflow = 'visible';
      el.style.display = '';
      el.dataset.ax = String(x);
      // a handle at the edge of the formula (the start of a right-to-left line is its right edge) would be cut off by
      // the window: it is moved inward, whole, where a finger can take it
      const vr = this.view.getBoundingClientRect();
      const hr = el.getBoundingClientRect();
      if (vr.width > 0 && hr.width > 0) {
        let dx = 0;
        if (hr.left < vr.left + 2) dx = vr.left + 2 - hr.left;
        else if (hr.right > vr.right - 2) dx = vr.right - 2 - hr.right;
        if (dx) el.style.left = Math.round(x - 12 + dx) + 'px';
      }
    }
  }

  private hideHandles(): void {
    for (const end of ['from', 'to'] as const) {
      const el = this.selHandles[end];
      el.style.width = '0';
      el.style.height = '0';
      el.style.overflow = 'hidden';
      el.style.display = 'none';
    }
  }

  caretPosition(c: Caret): { x: number; y: number; size: number } | null {
    const lay = this.layout;
    if (!lay) return null;
    const g = lay.rows.get(pathKey(c.path));
    if (!g) return null;
    const x = g.xs[Math.min(c.index, g.xs.length - 1)];
    const y = c.path.length === 0 ? lay.rootYs[Math.min(c.index, lay.rootYs.length - 1)] : g.ys ? g.ys[Math.min(c.index, g.ys.length - 1)] : g.y;
    return { x, y, size: g.size };
  }

  /** pixel x of a caret position in content coordinates */
  xOf(c: Caret): number | null {
    return this.caretPosition(c)?.x ?? null;
  }

  /** nearest caret index of row `path` to content x */
  nearest(path: Step[], x: number): number | null {
    const lay = this.layout;
    if (!lay) return null;
    const g = lay.rows.get(pathKey(path));
    if (!g) return null;
    let best = 0;
    let bd = Infinity;
    (g.hx ?? g.xs).forEach((v, i) => {
      const d = Math.abs(v - x);
      if (d < bd - 1e-6) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  /* -------------------------------------------------------------- hit test */
  /** content-space point → caret (deepest row containing the point, else nearest row) */
  hitTest(px: number, py: number): Caret | null {
    const lay = this.layout;
    if (!lay) return null;
    let best: { key: string; depth: number; g: DocLayout['rows'] extends Map<any, infer V> ? V : never } | null = null;
    let nearest: { dist: number; g: any; key: string } | null = null;
    const cands: { dist: number; g: any; key: string; bl: number }[] = [];
    for (const [key, g] of lay.rows) {
      // the stops of a right-to-left row run backwards: its extent is the span between the two ends, whichever is left
      const hxs = g.hx ?? g.xs;
      const x1 = Math.min(hxs[0], hxs[hxs.length - 1]);
      const x2 = Math.max(hxs[0], hxs[hxs.length - 1]);
      const bands: { y: number; a: number; d: number }[] = key === '' ? lay.lines.map((l) => ({ y: l.y, a: l.a, d: l.d })) : [{ y: g.y, a: g.a, d: g.d }];
      for (const bnd of bands) {
        // table cells and slots have padding around their content; empty slots show a small box
        const pad = key === '' ? 1 : 4;
        const inX = px >= x1 - pad && px <= Math.max(x2, x1 + (key === '' || x2 > x1 ? 0 : 8)) + pad;
        const inY = py >= bnd.y - bnd.a && py <= bnd.y + bnd.d;
        if (inX && inY) {
          const depth = g.path.length;
          if (!best || depth > best.depth) best = { key, depth, g };
        }
        const dx = px < x1 ? x1 - px : px > x2 ? px - x2 : 0;
        const dy = py < bnd.y - bnd.a ? bnd.y - bnd.a - py : py > bnd.y + bnd.d ? py - bnd.y - bnd.d : 0;
        const dist = dx * dx + dy * dy * 4 + (key === '' ? 0 : 0.5); // a tie goes to the line itself
        if (!nearest || dist < nearest.dist) nearest = { dist, g, key };
        cands.push({ dist, g, key, bl: bnd.y });
      }
    }
    // equally near positions (far away from everything): the one whose baseline is closest to the point wins
    if (!best && nearest) {
      const near = cands.filter((c) => c.dist <= nearest!.dist + 1);
      if (near.length > 1) {
        near.sort((a, b) => Math.abs(py - a.bl) - Math.abs(py - b.bl) || (a.key === '' ? -1 : 0) - (b.key === '' ? -1 : 0));
        nearest = { dist: near[0].dist, g: near[0].g, key: near[0].key };
      }
    }
    let pick = best ? { g: best.g, key: best.key } : nearest ? { g: nearest.g, key: nearest.key } : null;
    // a point inside a structure but outside all its rows (between the rows of a stack, under a denominator)
    // belongs to the nearest row of that structure, not to the line around it
    if (pick && pick.key === '') {
      const root = lay.rows.get('');
      if (root && root.structs) {
        let ei = -1;
        for (let i = 0; i < root.structs.length; i++) {
          if (root.structs[i] && px >= Math.min(root.xs[i], root.xs[i + 1]) && px <= Math.max(root.xs[i], root.xs[i + 1])) ei = i;
        }
        if (ei >= 0) {
          let near: { dist: number; g: any; key: string } | null = null;
          for (const [key, g] of lay.rows) {
            if (key === '' || !g.path.length || g.path[0][0] !== ei) continue;
            if (g.stops && !g.stops.some(Boolean)) continue;
            const bnd = { y: g.y, a: g.a, d: g.d };
            const x1 = Math.min(g.xs[0], g.xs[g.xs.length - 1]);
            const x2 = Math.max(g.xs[0], g.xs[g.xs.length - 1]);
            const dx = px < x1 ? x1 - px : px > x2 ? px - x2 : 0;
            const dy = py < bnd.y - bnd.a ? bnd.y - bnd.a - py : py > bnd.y + bnd.d ? py - bnd.y - bnd.d : 0;
            const dist = dx * dx + dy * dy * 4;
            if (!near || dist < near.dist) near = { dist, g, key };
          }
          if (near) pick = { g: near.g, key: near.key };
        }
      }
    }
    if (!pick) return null;
    const g = pick.g;
    const path = g.path as Step[];
    if (pick.key === '') {
      // choose the line, then the closest position in it
      let line = lay.lines[lay.lines.length - 1];
      for (const l of lay.lines) {
        if (py <= l.y + l.d) {
          line = l;
          break;
        }
      }
      let bi = line.from;
      let bd = Infinity;
      for (let i = line.from; i <= line.to; i++) {
        const d = Math.abs(g.xs[i] - px);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      }
      return { path, index: bi };
    }
    return { path, index: this.nearest(path, px) ?? 0 };
  }

  /** client coordinates → content coordinates */
  toContent(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.content.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  /* --------------------------------------------------------------- caret */
  startBlink(): void {
    this.stopBlink();
    this.visible = true;
    this.caretEl.style.visibility = 'visible';
    this.underline.style.visibility = 'visible';
    this.blink = setInterval(() => {
      this.visible = !this.visible;
      this.caretEl.style.visibility = this.visible ? 'visible' : 'hidden';
      this.underline.style.visibility = this.visible ? 'visible' : 'hidden';
    }, 500);
  }
  stopBlink(): void {
    if (this.blink) clearInterval(this.blink);
    this.blink = null;
    this.caretEl.style.visibility = 'visible';
    this.underline.style.visibility = 'visible';
  }
  /** keep the caret visible right after activity */
  poke(): void {
    if (this.blink) this.startBlink();
  }

  scrollCaretIntoView(c: Caret): void {
    const p = this.caretPosition(c);
    if (!p) return;
    const v = this.view;
    const left = p.x + this.pad;
    const top = p.y - p.size + this.pad;
    if (left < v.scrollLeft) v.scrollLeft = Math.max(0, left - 10);
    else if (left > v.scrollLeft + v.clientWidth - 10) v.scrollLeft = left - v.clientWidth + 30;
    if (top < v.scrollTop) v.scrollTop = Math.max(0, top - 10);
    else if (top + p.size * 1.25 > v.scrollTop + v.clientHeight) v.scrollTop = top + p.size * 1.25 - v.clientHeight + 10;
  }
}
