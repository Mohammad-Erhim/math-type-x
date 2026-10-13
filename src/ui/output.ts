/** Optional output panel below the widget (OUT-004 / SRS 9.3): MathML · LaTeX · SVG · PNG · Accessible text · Plain text. */
import { h } from './dom';
import { Localizer, tableFor } from './i18n';
import type { MathEditor } from './editor';

type Kind = 'mathml' | 'latex' | 'svg' | 'png' | 'accessible' | 'plain';
const TABS: [Kind, string][] = [
  ['mathml', 'MathML'],
  ['latex', 'LaTeX'],
  ['svg', 'SVG'],
  ['png', 'PNG'],
  ['accessible', 'Accessible text'],
  ['plain', 'Plain text'],
];

export const OUTPUT_CSS = `
.mtx_output{width:100%;max-width:725px;min-height:180px;height:180px;margin:12px 0 0;border:1px solid #778e9a;border-radius:5px;background:#f5f8f9;font:12px/1.4 Arial,sans-serif;color:#18212f;display:flex;flex-direction:column;overflow:hidden}
.mtx_tabs{display:flex;gap:0;background:#dde6ea;border-bottom:1px solid #778e9a;flex:none}
.mtx_tabs button{flex:1;padding:6px 4px;border:0;border-right:1px solid #b7c4cb;background:transparent;font:700 11px Arial,sans-serif;color:#425a66;cursor:pointer}
.mtx_tabs button[aria-selected=true]{background:#f5f8f9;color:#18212f;box-shadow:inset 0 -2px 0 #778e9a}
.mtx_tabs button:focus-visible{outline:2px solid #ffcc00;outline-offset:-2px}
.mtx_body{flex:1;min-height:0;position:relative;padding:8px 10px;overflow:auto}
.mtx_body pre{margin:0;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all}
.mtx_body img{max-width:100%;max-height:100%;background:#fff;border:1px solid #d3dce1}
.mtx_body .mtx_text{font-size:14px}
.mtx_body.mtx_stale{opacity:.5;transition:opacity .15s .1s}
.mtx_skeleton{height:14px;margin:4px 0;border-radius:3px;background:linear-gradient(90deg,#e3eaee,#f5f8f9,#e3eaee);background-size:200% 100%;animation:mtx_sk 1.2s linear infinite}
@keyframes mtx_sk{to{background-position:-200% 0}}
.mtx_err{color:#a12020}
.mtx_foot{display:flex;align-items:center;gap:8px;padding:4px 10px;border-top:1px solid #d3dce1;background:#eef2f4;flex:none}
.mtx_status{flex:1;color:#5d727d;font-size:11px}
.mtx_foot button{padding:3px 10px;border:1px solid #778e9a;border-radius:3px;background:linear-gradient(#fff,#e6edf0);font:700 11px Arial,sans-serif;color:#18212f;cursor:pointer}
.mtx_foot button:disabled{opacity:.45;cursor:default}
.mtx_foot button:focus-visible{outline:2px solid #ffcc00}
`;

export class OutputPanel {
  readonly root: HTMLElement;
  private kind: Kind = 'mathml';
  private body: HTMLElement;
  private status: HTMLElement;
  private copyBtn: HTMLButtonElement;
  private dlBtn: HTMLButtonElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** counts requests: only the answer of the newest one is shown */
  private seq = 0;
  /** the request in flight: cancelled as soon as the formula changes again */
  private abort: AbortController | null = null;
  /** what the body shows: format + formula it was made from ('' while it shows nothing valid) */
  private shownKey = '';
  private shownKind: Kind | null = null;
  /** finished results, newest last (switching back to a format of the same formula costs nothing) */
  private cache = new Map<string, { value: string; blob: Blob | null }>();
  private hiddenPending = false;
  private value = '';
  private blob: Blob | null = null;
  private tabEls = new Map<Kind, HTMLButtonElement>();
  private imgUrl: string | null = null;
  /** right-to-left interface: images and text follow it, source code (MathML, LaTeX) stays left to right */
  private rtlUi = false;

  constructor(private ed: MathEditor, container: HTMLElement) {
    if (!container.ownerDocument.getElementById('mtx-output-style')) {
      const st = container.ownerDocument.createElement('style');
      st.id = 'mtx-output-style';
      st.textContent = OUTPUT_CSS;
      container.ownerDocument.head.appendChild(st);
    }
    const tabs = h('div', { class: 'mtx_tabs', role: 'tablist', 'aria-label': 'Output format' });
    for (const [k, label] of TABS) {
      const b = h('button', { type: 'button', role: 'tab', id: 'mtx-tab-' + k, 'aria-selected': k === this.kind ? 'true' : 'false', tabindex: k === this.kind ? '0' : '-1', text: label }) as HTMLButtonElement;
      b.addEventListener('click', () => this.select(k));
      b.addEventListener('keydown', (e) => {
        const i = TABS.findIndex((t) => t[0] === this.kind);
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0];
          this.select(n);
          this.tabEls.get(n)?.focus();
        }
      });
      this.tabEls.set(k, b);
      tabs.append(b);
    }
    this.body = h('div', { class: 'mtx_body', role: 'tabpanel', 'aria-live': 'polite', tabindex: '0' });
    this.status = h('div', { class: 'mtx_status', 'aria-live': 'off' });
    this.copyBtn = h('button', { type: 'button', text: 'Copy' }) as HTMLButtonElement;
    this.dlBtn = h('button', { type: 'button', text: 'Download' }) as HTMLButtonElement;
    this.copyBtn.addEventListener('click', () => void this.copy());
    this.dlBtn.addEventListener('click', () => this.download());
    const foot = h('div', { class: 'mtx_foot' }, this.status, this.copyBtn, this.dlBtn);
    this.root = h('section', { class: 'mtx_output', 'aria-label': 'Output' }, tabs, this.body, foot);
    container.append(this.root);
    // translated labels (the code shown in the body stays as it is)
    const table = tableFor(ed.lang);
    if (table) {
      new Localizer(table, (el) => el.classList.contains('mtx_body')).attach(this.root);
      if (ed.opts.rtlLanguages.includes(ed.lang.toLowerCase())) {
        this.root.setAttribute('dir', 'rtl');
        this.rtlUi = true;
        this.body.setAttribute('dir', 'ltr');
      }
    }
    // the format chosen last time
    const saved = ed.readState()?.output as Kind | undefined;
    if (saved && TABS.some((t) => t[0] === saved)) this.setKind(saved);
    // a change: stop what is running, mark the shown output as out of date, and make the new one once typing pauses
    ed.on('change', () => this.onChange());
    ed.on('ready', () => this.schedule(0));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.hiddenPending) {
        this.hiddenPending = false;
        this.schedule(0);
      }
    });
    this.schedule(0);
  }

  private setKind(k: Kind): void {
    this.kind = k;
    for (const [kk, el] of this.tabEls) {
      el.setAttribute('aria-selected', String(kk === k));
      el.tabIndex = kk === k ? 0 : -1;
    }
    this.body.setAttribute('aria-labelledby', 'mtx-tab-' + k);
  }

  select(k: Kind): void {
    this.setKind(k);
    this.ed.writeState({ output: k });
    this.cancel();
    this.schedule(0);
  }

  /** local formats are instant; the ones made by the service wait for a longer pause in typing */
  private delay(): number {
    return this.kind === 'mathml' || this.kind === 'plain' ? 120 : 350;
  }

  private cancel(): void {
    this.abort?.abort();
    this.abort = null;
    this.seq++;
  }

  private key(k: Kind, mml: string): string {
    return k + '\u0000' + (k === 'accessible' ? this.ed.lang + '\u0000' : '') + mml;
  }

  private onChange(): void {
    // nothing new for the format shown (the event came from something else): leave the output alone
    if (this.shownKey === this.key(this.kind, this.ed.getMathML())) return;
    this.cancel();
    this.body.classList.add('mtx_stale');
    this.body.setAttribute('aria-busy', 'true');
    this.status.textContent = 'Updating…';
    this.schedule(this.delay());
  }

  private schedule(delay = 150): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      // a hidden page makes the output when it comes back
      if (document.hidden) this.hiddenPending = true;
      else void this.refresh();
    }, delay);
  }

  async refresh(): Promise<void> {
    const k = this.kind;
    const mml = this.ed.getMathML();
    const key = this.key(k, mml);
    this.cancel();
    const hit = this.cache.get(key);
    if (hit) {
      // a result made before: show it (and keep it the newest)
      this.cache.delete(key);
      this.cache.set(key, hit);
      this.show(k, key, hit.value, hit.blob);
      return;
    }
    const my = this.seq;
    const ac = (this.abort = new AbortController());
    const signal = ac.signal;
    // the output of another format has nothing to show for this one: a skeleton; the same format stays visible (dimmed)
    if (this.shownKind !== k) this.body.replaceChildren(h('div', { class: 'mtx_skeleton' }), h('div', { class: 'mtx_skeleton', style: { width: '70%' } }));
    this.body.classList.add('mtx_stale');
    this.status.textContent = 'Updating…';
    try {
      let value = '';
      let blob: Blob | null = null;
      switch (k) {
        case 'mathml':
          value = mml;
          break;
        case 'latex':
          value = await this.ed.getLaTeX({ signal });
          break;
        case 'svg':
          value = await this.ed.getSVG({ signal });
          blob = new Blob([value], { type: 'image/svg+xml' });
          break;
        case 'png':
          blob = await this.ed.getPNG({ zoom: 2, signal });
          break;
        case 'accessible':
          value = await this.ed.getAccessibleText(undefined, { signal });
          break;
        case 'plain':
          value = this.ed.getPlainText();
          break;
      }
      // a newer request (or a change) overtook this one: its answer is not shown
      if (my !== this.seq || signal.aborted) return;
      // the formula changed while the answer was on its way without anyone telling us: make it again
      if (this.ed.getMathML() !== mml) {
        this.schedule(0);
        return;
      }
      this.abort = null;
      this.cache.set(key, { value, blob });
      while (this.cache.size > 10) this.cache.delete(this.cache.keys().next().value as string);
      this.show(k, key, value, blob);
    } catch (e) {
      // cancelled: whoever cancelled has scheduled the next one
      if (my !== this.seq || signal.aborted || (e as Error).name === 'AbortError') return;
      this.abort = null;
      const retry = h('button', { type: 'button', text: 'Retry' });
      retry.addEventListener('click', () => void this.refresh());
      this.body.replaceChildren(h('div', { class: 'mtx_err', role: 'alert', text: 'Could not load this output: ' + (e as Error).message }), retry);
      this.body.classList.remove('mtx_stale');
      this.body.removeAttribute('aria-busy');
      this.shownKey = '';
      this.shownKind = null;
      this.status.textContent = 'Error';
    }
  }

  private show(k: Kind, key: string, value: string, blob: Blob | null): void {
    this.value = value;
    this.blob = blob;
    this.paint(k, value, blob);
    this.shownKey = key;
    this.shownKind = k;
    this.body.classList.remove('mtx_stale');
    this.body.removeAttribute('aria-busy');
    const size = blob ? blob.size : new Blob([value]).size;
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    this.status.textContent = `Updated ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} · ${size < 1024 ? size + ' B' : (size / 1024).toFixed(1) + ' KB'}`;
    this.copyBtn.disabled = false;
    this.dlBtn.disabled = !blob;
  }

  private paint(k: Kind, value: string, blob: Blob | null): void {
    if (this.rtlUi) this.body.setAttribute('dir', k === 'mathml' || k === 'latex' ? 'ltr' : 'rtl');
    if (this.imgUrl) {
      URL.revokeObjectURL(this.imgUrl);
      this.imgUrl = null;
    }
    if ((k === 'svg' || k === 'png') && blob) {
      this.imgUrl = URL.createObjectURL(blob);
      this.body.replaceChildren(h('img', { src: this.imgUrl, alt: 'Rendered formula' }));
    } else if (k === 'accessible' || k === 'plain') {
      this.body.replaceChildren(h('div', { class: 'mtx_text', text: value }));
    } else {
      this.body.replaceChildren(h('pre', { text: value }));
    }
  }

  private async copy(): Promise<void> {
    try {
      if (this.kind === 'png' && this.blob && (window as any).ClipboardItem) {
        await navigator.clipboard.write([new (window as any).ClipboardItem({ 'image/png': this.blob })]);
      } else if (this.kind === 'mathml' && (window as any).ClipboardItem) {
        const html = `<span>${this.value}</span>`;
        await navigator.clipboard.write([new (window as any).ClipboardItem({ 'text/plain': new Blob([this.value], { type: 'text/plain' }), 'text/html': new Blob([html], { type: 'text/html' }) })]);
      } else await navigator.clipboard.writeText(this.value);
      this.status.textContent = 'Copied to clipboard';
    } catch {
      this.status.textContent = 'Copy failed – select the text and press Ctrl+C';
    }
  }

  private download(): void {
    if (!this.blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(this.blob);
    a.download = this.kind === 'svg' ? 'formula.svg' : 'formula.png';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
