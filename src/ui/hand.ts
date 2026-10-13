/** Handwriting mode (SRS 4.13): canvas, strokes, recognition, undo/redo/clear, scribble erase, help. */
import { h } from './dom';
import type { MathEditor } from './editor';
import handIcons from '../data/hand-icons.json';

const HI = handIcons as unknown as Record<string, { w: number; h: number; fill: string; d: string }>;
const iconSvg = (n: string) => `<svg width="29" height="29" viewBox="0 0 ${HI[n].w} ${HI[n].h}" aria-hidden="true"><path d="${HI[n].d}" fill="${HI[n].fill}" fill-rule="evenodd"/></svg>`;

interface Stroke {
  x: number[];
  y: number[];
  t: number[];
  red?: boolean;
}

const INK = '#284078';

export class HandMode {
  readonly root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private strokes: Stroke[] = [];
  private history: Stroke[][] = [];
  private future: Stroke[][] = [];
  private pre: Stroke[] = [];
  private demo = false;
  private current: Stroke | null = null;
  private btnUndo!: HTMLElement;
  private btnRedo!: HTMLElement;
  private btnClear!: HTMLElement;
  private btnHelp!: HTMLElement;
  private preview: HTMLImageElement;
  private hint: HTMLElement;
  private recTimer: ReturnType<typeof setTimeout> | null = null;
  private recSeq = 0;
  private lastMml: string | null = null;
  private helpTimer: ReturnType<typeof setTimeout> | null = null;
  private help: HTMLElement | null = null;
  private opened = false;

  constructor(private ed: MathEditor) {
    const mkBtn = (title: string, icon: string, top: number) => {
      const b = h('div', { class: 'wrs_button wrs_disabled', role: 'button', title, 'aria-label': title, 'aria-disabled': 'true', tabindex: '0' });
      b.innerHTML = iconSvg(icon);
      b.style.top = top + 'px';
      return b;
    };
    this.btnUndo = mkBtn('Undo', 'undo', 3);
    this.btnRedo = mkBtn('Redo', 'redo', 36);
    this.btnClear = mkBtn('Clear', 'trash', 69);
    this.btnHelp = mkBtn('Help', 'help', 114);
    this.btnHelp.classList.remove('wrs_disabled');
    this.btnHelp.removeAttribute('aria-disabled');
    const sep = h('div', { class: 'wrs_line', style: { left: '3px', top: '108px', width: '33px', height: '1px' } });
    // stroke editing controls exist in the DOM but are hidden (HND-011)
    const hidden = ['Edit', 'Remove point', 'Insert before', 'Insert after', 'Add stroke', 'Move up', 'Move down'].map((t) => h('div', { class: 'wrs_button wrs_hidden', role: 'button', title: t, 'aria-label': t, tabindex: '0' }));
    const kbd = h('input', { type: 'button', class: 'wrs_key2edit', title: 'Use keyboard', 'aria-label': 'Use keyboard' });
    const toolbar = h('div', { class: 'wrs_toolbar' }, this.btnUndo, this.btnRedo, this.btnClear, ...hidden, sep, this.btnHelp);
    this.canvas = h('canvas', { class: 'wrs_canvas', width: 684, height: 415 }) as HTMLCanvasElement;
    this.hint = h('div', { class: 'wrs_hint' });
    this.hint.innerHTML = `<svg width="${HI.empty.w}" height="${HI.empty.h}" viewBox="0 0 ${HI.empty.w} ${HI.empty.h}" aria-hidden="true" style="position:absolute;left:${Math.round((684 - HI.empty.w) / 2)}px;top:${Math.round((415 - HI.empty.h) / 2)}px;pointer-events:none"><path d="${HI.empty.d}" fill="${HI.empty.fill}" fill-rule="evenodd"/></svg>`;
    this.preview = h('img', { class: 'wrs_previewImage', alt: '', style: { position: 'absolute', right: '8px', bottom: '8px', maxWidth: '300px', maxHeight: '120px' } }) as HTMLImageElement;
    this.preview.style.display = 'none';
    const box = h('div', { class: 'wrs_canvasContainer wrs_empty' }, this.hint, this.canvas, this.preview);
    this.root = h('div', { class: 'wrs_hand wrs_recognitionType_math' }, toolbar, box, kbd);
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.attach(kbd);
  }

  private attach(kbd: HTMLElement): void {
    const c = this.canvas;
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: Math.round(e.clientX - r.left), y: Math.round(e.clientY - r.top) };
    };
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      c.setPointerCapture(e.pointerId);
      const p = pos(e);
      this.current = { x: [p.x], y: [p.y], t: [Date.now()] };
      this.pre = this.strokes.slice();
      this.demo = false; // the user took over: the help demonstration stops
      this.help = null;
      this.btnHelp.classList.remove('wrs_toggled');
      if (this.recTimer) clearTimeout(this.recTimer);
      this.root.querySelector('.wrs_canvasContainer')?.classList.remove('wrs_empty');
      this.hint.style.display = 'none';
      this.updateButtons();
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.current) return;
      const p = pos(e);
      const s = this.current;
      const lx = s.x[s.x.length - 1];
      const ly = s.y[s.y.length - 1];
      if (p.x === lx && p.y === ly) return;
      s.x.push(p.x);
      s.y.push(p.y);
      s.t.push(Date.now());
      this.ctx.strokeStyle = INK;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(lx, ly);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
    });
    const end = (e: PointerEvent) => {
      if (!this.current) return;
      try {
        c.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const s = this.current;
      this.current = null;
      if (s.x.length === 1) {
        // a dot
        s.x.push(s.x[0] + 0.1);
        s.y.push(s.y[0]);
        s.t.push(Date.now());
      }
      this.strokes.push(s);
      this.history.push(this.pre);
      this.future = [];
      if (this.isScribble(s)) this.handleScribble(s);
      else this.scheduleRecognition();
      this.updateButtons();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    const act = (el: HTMLElement, fn: () => void) => {
      el.addEventListener('click', () => {
        if (el.classList.contains('wrs_disabled')) return;
        fn();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!el.classList.contains('wrs_disabled')) fn();
        }
      });
    };
    act(this.btnUndo, () => {
      const prev = this.history.pop();
      if (!prev) return;
      this.future.push(this.strokes);
      this.strokes = prev;
      this.afterEdit();
    });
    act(this.btnRedo, () => {
      const next = this.future.pop();
      if (!next) return;
      this.history.push(this.strokes);
      this.strokes = next;
      this.afterEdit();
    });
    act(this.btnClear, () => {
      this.history.push(this.strokes);
      this.future = [];
      this.strokes = [];
      this.afterEdit();
    });
    act(this.btnHelp, () => this.playHelp());
    const back = () => this.ed.closeHand(this.demo ? '<math xmlns="http://www.w3.org/1998/Math/MathML"/>' : this.lastMml ?? undefined);
    act(kbd, () => {
      this.opened = false;
      // a running demonstration stops; the strokes stay on the (hidden) canvas
      this.help = null;
      this.btnHelp.classList.remove('wrs_toggled');
      back();
    });
  }

  /** common tail of undo / redo / clear: redraw, refresh the buttons and recognise again */
  private afterEdit(): void {
    this.redraw();
    const empty = this.strokes.length === 0;
    this.root.querySelector('.wrs_canvasContainer')?.classList.toggle('wrs_empty', empty);
    this.hint.style.display = empty ? '' : 'none';
    if (empty) this.preview.style.display = 'none';
    this.updateButtons();
    this.scheduleRecognition(true);
  }

  open(currentMathML: string): void {
    this.opened = true;
    this.demo = false;
    this.strokes = [];
    this.history = [];
    this.future = [];
    this.lastMml = null;
    this.redraw();
    this.preview.style.display = 'none';
    const empty = /^<math[^>]*\/>$/.test(currentMathML.replace(/ xmlns="[^"]*"/, ''));
    this.root.querySelector('.wrs_canvasContainer')?.classList.toggle('wrs_empty', empty);
    this.hint.style.display = empty ? '' : 'none';
    this.updateButtons();
    if (!empty) void this.regenerate(currentMathML);
  }

  /** reopening re-draws the formula as simulated strokes that are recognised again (Undo disabled) */
  private async regenerate(mml: string): Promise<void> {
    try {
      const { simulateStrokes } = await import('../hand/simulate');
      const strokes = simulateStrokes(mml, 684, 415);
      this.strokes = strokes.map((s) => ({ ...s, t: s.x.map((_, i) => i) }));
      this.redraw();
      this.root.querySelector('.wrs_canvasContainer')?.classList.remove('wrs_empty');
      this.hint.style.display = 'none';
      this.updateButtons();
      // the document is untouched until the user edits the strokes
    } catch {
      /* simulation is optional */
    }
  }

  private updateButtons(noUndo = false): void {
    const set = (b: HTMLElement, on: boolean) => {
      b.classList.toggle('wrs_disabled', !on);
      if (on) b.removeAttribute('aria-disabled');
      else b.setAttribute('aria-disabled', 'true');
    };
    set(this.btnUndo, this.history.length > 0 && !noUndo);
    set(this.btnRedo, this.future.length > 0);
    set(this.btnClear, this.strokes.length > 0);
  }

  private redraw(): void {
    const g = this.ctx;
    g.clearRect(0, 0, 684, 415);
    g.lineWidth = 3;
    for (const s of this.strokes) {
      g.strokeStyle = s.red ? '#d22' : INK;
      g.beginPath();
      s.x.forEach((x, i) => (i ? g.lineTo(x, s.y[i]) : g.moveTo(x, s.y[i])));
      g.stroke();
    }
  }

  /* ----------------------------------------------------------- scribble */
  private isScribble(s: Stroke): boolean {
    if (s.x.length < 12) return false;
    let rev = 0;
    let len = 0;
    let lastDx = 0;
    for (let i = 1; i < s.x.length; i++) {
      const dx = s.x[i] - s.x[i - 1];
      const dy = s.y[i] - s.y[i - 1];
      len += Math.hypot(dx, dy);
      if (dx !== 0 && lastDx !== 0 && Math.sign(dx) !== Math.sign(lastDx)) rev++;
      if (dx !== 0) lastDx = dx;
    }
    const w = Math.max(...s.x) - Math.min(...s.x);
    const hh = Math.max(...s.y) - Math.min(...s.y);
    const diag = Math.hypot(w, hh) || 1;
    return rev >= 5 && len / diag > 3.5 && this.strokes.length > 1;
  }

  private handleScribble(sc: Stroke): void {
    const bx = [Math.min(...sc.x), Math.max(...sc.x), Math.min(...sc.y), Math.max(...sc.y)];
    const hit: Stroke[] = [];
    for (const s of this.strokes) {
      if (s === sc) continue;
      const cx = (Math.min(...s.x) + Math.max(...s.x)) / 2;
      const cy = (Math.min(...s.y) + Math.max(...s.y)) / 2;
      if (cx >= bx[0] && cx <= bx[1] && cy >= bx[2] && cy <= bx[3]) hit.push(s);
    }
    if (!hit.length) {
      this.scheduleRecognition();
      return;
    }
    hit.forEach((s) => (s.red = true));
    sc.red = true;
    this.redraw();
    setTimeout(() => {
      this.strokes = this.strokes.filter((s) => !hit.includes(s) && s !== sc);
      this.redraw();
      this.updateButtons();
      this.scheduleRecognition(true);
    }, 600);
  }

  /* -------------------------------------------------------- recognition */
  private scheduleRecognition(now = false): void {
    if (this.recTimer) clearTimeout(this.recTimer);
    this.recTimer = setTimeout(() => void this.recognize(), now ? 50 : 1000);
  }

  private async recognize(): Promise<void> {
    const seq = ++this.recSeq;
    if (!this.strokes.length) {
      this.lastMml = '<math xmlns="http://www.w3.org/1998/Math/MathML"/>';
      this.ed.applyRecognized(this.lastMml);
      this.preview.style.display = 'none';
      return;
    }
    try {
      const t0 = Math.min(...this.strokes.map((s) => s.t[0] ?? 0));
      const r = await this.ed.services.recognize({ x: this.strokes.map((s) => s.x), y: this.strokes.map((s) => s.y), t: this.strokes.map((s) => s.t.map((v) => v - t0)) });
      if (seq !== this.recSeq) return;
      this.lastMml = r.mathml;
      this.ed.applyRecognized(r.mathml);
      const out = await this.ed.services.render(r.mathml, 'png', { zoom: 1.5 });
      if (seq !== this.recSeq) return;
      this.preview.src = URL.createObjectURL(out.body);
      this.preview.style.display = '';
    } catch {
      /* recognition is best effort */
    }
  }

  /* --------------------------------------------------------------- help */
  /** the help button demonstrates the mode by writing "x = y" (the demo replaces the content) */
  private async playHelp(): Promise<void> {
    if (this.help) return;
    this.btnHelp.classList.add('wrs_toggled');
    const marker = h('div');
    this.help = marker;
    this.demo = true;
    this.history = [];
    this.future = [];
    this.strokes = [];
    this.redraw();
    this.root.querySelector('.wrs_canvasContainer')?.classList.remove('wrs_empty');
    this.hint.style.display = 'none';
    this.preview.style.display = 'none';
    this.updateButtons();
    const { simulateStrokes } = await import('../hand/simulate');
    const demo = simulateStrokes('<math><mi>x</mi><mo>=</mo><mi>y</mi></math>', 684, 415);
    const g = this.ctx;
    g.lineWidth = 3;
    g.strokeStyle = INK;
    // the formula is written quickly (about a quarter of a second): the recognised result reaches the document at once
    for (const st of demo) {
      const pts = st.x.map((x, i) => [x, st.y[i]] as const);
      const chunk = Math.max(1, Math.ceil(pts.length / 3));
      g.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (!this.help) return;
        if (i) g.lineTo(pts[i][0], pts[i][1]);
        else g.moveTo(pts[i][0], pts[i][1]);
        if (i % chunk === chunk - 1) {
          g.stroke();
          await new Promise((r) => setTimeout(r, 16));
        }
      }
      g.stroke();
      this.strokes.push({ x: st.x.slice(), y: st.y.slice(), t: st.x.map((_, i) => i) });
    }
    this.updateButtons();
    this.scheduleRecognition(true);
    // the demonstration goes on: part of the formula is scribbled out and the hint appears
    await new Promise((r) => setTimeout(r, 7000));
    if (!this.demo || !this.help) return;
    const last = this.strokes.slice(-3);
    const bx = [Math.min(...last.flatMap((q) => q.x)) - 6, Math.max(...last.flatMap((q) => q.x)) + 6, Math.min(...last.flatMap((q) => q.y)), Math.max(...last.flatMap((q) => q.y))];
    g.strokeStyle = '#d22';
    g.beginPath();
    for (let i = 0; i < 14; i++) {
      const px = bx[0] + ((bx[1] - bx[0]) * i) / 13;
      const py = i % 2 ? bx[3] : bx[2];
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
      await new Promise((r) => setTimeout(r, 25));
      g.stroke();
    }
    await new Promise((r) => setTimeout(r, 600));
    if (!this.demo || !this.help) return;
    this.strokes = this.strokes.slice(0, -last.length);
    this.redraw();
    this.scheduleRecognition(true);
    const note = h('div', { class: 'wrs_helpText' });
    note.innerHTML = '<div>To delete parts of the formula, scribble them out</div><div class="wrs_helpBrand">Powered by MathType-X</div>';
    this.root.querySelector('.wrs_canvasContainer')?.append(note);
    await new Promise((r) => setTimeout(r, 2200));
    note.remove();
    if (this.demo) {
      this.strokes = [];
      this.redraw();
      this.root.querySelector('.wrs_canvasContainer')?.classList.add('wrs_empty');
      this.hint.style.display = '';
      this.updateButtons();
      this.scheduleRecognition(true);
    }
    this.help = null;
    this.btnHelp.classList.remove('wrs_toggled');
  }
}
void 0;
