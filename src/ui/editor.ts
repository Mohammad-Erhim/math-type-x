/**
 * MathEditor – the embeddable editor: shell, toolbar, formula display, dialogs, clipboard, services,
 * handwriting and the public API (SRS chapter 9).
 */
import { Localizer, tableFor } from './i18n';
import { EditorCore } from '../core/engine';
import { digitsForLanguage } from '../core/typing';
import { Store, Saved } from './persist';
import { handleKey } from '../core/keys';
import { catalogue, Control, behaviorOf, findControl } from '../core/catalogue';
import { layoutDocument, DocLayout } from '../layout/layout';
import { DocGeometry } from '../layout/geometry';
import { FormulaDisplay } from './display';
import { Toolbar, ToolbarHost } from './toolbar';
import { injectStyles, injectBundledFonts, BUNDLED_FACES } from './styles';
import { getAssetsBase } from '../render/client';
import { resetMeasuredAdvances } from '../layout/metrics';
import { arabicCssFamily, arabicFontOf } from '../layout/arfonts';
import { h } from './dom';
import { Services, ServicesOptions } from './services';
import { SWATCHES, FONT_FAMILIES } from './messages';
import { contextState, locate, applyContext, ctxValue, CtxState, parseLength } from '../core/context';
import { ctxIcon } from './ctxart';
import { ART } from './art';
import { ZULFI_GROUPS, zulfiSvg, zulfiSymbol } from '../layout/zulfi';
import { controlIcon } from './icons';
import { HandMode } from './hand';
import { serializeMathML, parseMathML } from '../core/mathml';
import { mathml2latex } from '../convert/tex';
import unicodeData from '../data/unicode.json';

export const VERSION = '7.25.6.804ace-x';

export interface EditorOptions {
  language?: string;
  autoformat?: boolean;
  toolbarSize?: 1 | 1.5 | 2;
  /**
   * 'classic': the fixed 725 × 415 px widget; 'fluid': fills its container (toolbar scrolls sideways, touch sized controls);
   * 'auto' (default): classic while the container is at least 725 px wide and the window 480 px high, fluid below that
   */
  layout?: 'auto' | 'classic' | 'fluid';
  detectHand?: boolean;
  fontStyle?: 'initial' | 'normal' | 'italic';
  reservedWords?: string[];
  globalStyles?: boolean;
  rtlLanguages?: string[];
  arabicIndicLanguages?: string[];
  easternArabicIndicLanguages?: string[];
  parity?: 'exact' | 'improved';
  services?: ServicesOptions;
  mml?: string;
  /** directory serving the reference symbol fonts (math1.ttf …); the bundled STIX Two Math is used without it */
  fontsUrl?: string;
  /** local-storage key: the formula, tab, typing modes and output format are kept in the browser under it (off when empty) */
  persist?: string;
}

type Ev = 'ready' | 'change' | 'focus' | 'blur' | 'tabchange' | 'handstart' | 'handend';

const DEFAULTS: Required<Omit<EditorOptions, 'services' | 'mml' | 'reservedWords' | 'fontsUrl' | 'persist'>> = {
  language: 'en',
  layout: 'auto',
  autoformat: false,
  toolbarSize: 1,
  detectHand: true,
  fontStyle: 'initial',
  globalStyles: true,
  rtlLanguages: ['ar'],
  arabicIndicLanguages: ['ar_eg', 'ar_sd', 'ar_sa'],
  easternArabicIndicLanguages: ['fa', 'ps', 'ur'],
  parity: 'exact',
};

const EMPTY = '<math xmlns="http://www.w3.org/1998/Math/MathML"/>';

export class MathEditor implements ToolbarHost {
  readonly core = new EditorCore();
  readonly opts: EditorOptions & typeof DEFAULTS;
  readonly services: Services;
  lang: string;
  root!: HTMLElement;
  display!: FormulaDisplay;
  toolbar!: Toolbar;
  hand!: HandMode;
  private listeners = new Map<Ev, Set<(e: any) => void>>();
  private geom!: DocGeometry;
  private focused = false;
  private popup: { el: HTMLElement; kind: string; owner?: HTMLElement; close: () => void } | null = null;
  private lastLayout: DocLayout | null = null;
  private lastRtl = false;
  private localizer!: Localizer;
  private ctx: CtxState | null = null;
  private ready = false;
  private accessibleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAccessible = '';
  private changeTimer: ReturnType<typeof setTimeout> | null = null;
  private dragging = false;
  private dragAnchor: { path: any; index: number } | null = null;
  private clipboardArea!: HTMLTextAreaElement;
  private lastMml = '';
  private dashLines = false;
  /** zoom of the toolbar and its pop-ups (1 in the classic layout) */
  private zoomK = 1;
  private layoutMode: 'auto' | 'classic' | 'fluid' = 'auto';
  private fluid = false;
  private host: HTMLElement | null = null;
  private resizeObs: ResizeObserver | null = null;
  private layoutKey = '';
  private stableW = -1;
  private stableIH = 0;
  private resizeRaf = 0;
  /** resize events come in bursts while a soft keyboard slides in: the layout is looked at once per frame */
  private onWinResize = (): void => {
    if (this.resizeRaf) return;
    this.resizeRaf = requestAnimationFrame(() => {
      this.resizeRaf = 0;
      this.applyLayout();
    });
  };

  constructor(options: EditorOptions = {}) {
    this.opts = { ...DEFAULTS, ...options } as any;
    this.lang = this.opts.language;
    this.layoutMode = this.opts.layout;
    this.services = new Services(options.services ?? { baseUrl: '/editor-services/' });
    this.core.parity = this.opts.parity;
    this.core.autoformat = !!this.opts.autoformat;
    if (options.reservedWords) this.core.reservedWords = options.reservedWords.filter((w) => /^[A-Za-z]+$/.test(w));
    if (this.opts.fontStyle === 'normal') this.core.modes.autoItalic = false;
    if (options.mml) this.core.setMathML(options.mml);
    // digits typed in an Arabic language are Arabic-Indic ones (Persian, Pashto and Urdu: Eastern Arabic-Indic);
    // the toolbar's Arabic-Indic toggles switch back
    this.core.arabicLanguage = /^ar(_|-|$)/i.test(this.lang);
    this.core.contextExtras = true;
    this.core.modes.digits = digitsForLanguage(this.lang, this.opts.arabicIndicLanguages, this.opts.easternArabicIndicLanguages);
    // what the person left in this browser (formula with its font and size, typing modes, tab)
    if (this.opts.persist) this.store = new Store('mtx:' + this.opts.persist);
    const restored = !options.mml && this.store ? this.restore(this.store.read()) : false;
    // right-to-left languages start with a right-to-left formula (`<math dir="rtl">`), like the reference
    if (!options.mml && !restored && this.opts.rtlLanguages.includes(this.lang.toLowerCase())) this.core.setRtl(true, false);
  }

  /* ---------------------------------------------------------- persistence */
  private store: Store | null = null;
  private restoredTab: number | undefined;
  private onHide = (): void => {
    if (document.visibilityState === 'hidden' || document.visibilityState === undefined) this.onPageHide();
  };
  private onPageHide = (): void => {
    if (this.changeTimer) this.flushChange();
    this.store?.flush();
  };

  /** apply a saved record; true when it brought a formula */
  private restore(s: Saved | null): boolean {
    if (!s) return false;
    let formula = false;
    try {
      if (s.mml) {
        this.core.setMathML(s.mml);
        this.core.clearHistory();
        formula = true;
      }
    } catch {
      // a formula the editor cannot read: forget the record rather than failing at every load
      this.store?.clear();
      return false;
    }
    // the digit set (and the other typing modes) belong to the language they were chosen in: an English session does
    // not turn the Arabic one's default Arabic-Indic digits back into Western ones
    const sameLang = s.lang !== undefined && s.lang.toLowerCase() === this.lang.toLowerCase();
    const m = s.modes;
    if (m) {
      const t = this.core.modes as any;
      for (const k of ['bold', 'italic', 'autoItalic', 'text', 'arabicLigature'] as const) if (m[k] !== undefined) t[k] = m[k];
      // digits the person chose themselves come back; the default follows the language / direction / Arabic font
      if (m.digits && sameLang && m.digitsChosen) {
        t.digits = m.digits;
        this.digitsChosen = true;
      }
      if (m.color !== undefined) t.color = m.color;
    }
    this.restoredTab = s.tab;
    return formula;
  }

  /** true while the editor's state is kept in the browser (the persist option, and storage that works) */
  isPersisted(): boolean {
    return !!this.store && this.store.ok;
  }

  /** what is saved for this editor (output panel: the chosen format) */
  readState(): Saved | null {
    return this.store ? this.store.read() : null;
  }
  writeState(patch: Partial<Omit<Saved, 'v'>>): void {
    this.store?.set(patch);
  }

  private persistNow(mml: string): void {
    if (!this.store) return;
    const m = this.core.modes as any;
    this.store.set({ mml, lang: this.lang, modes: { bold: !!m.bold, italic: !!m.italic, autoItalic: !!m.autoItalic, text: !!m.text, arabicLigature: !!m.arabicLigature, digits: m.digits, digitsChosen: this.digitsChosen, color: m.color ?? null } });
  }

  static newInstance(o: EditorOptions = {}): MathEditor {
    return new MathEditor(o);
  }

  /* ---------------------------------------------------------- lifecycle */
  insertInto(container: HTMLElement): void {
    injectStyles(container.ownerDocument);
    // the faces the formulas are drawn with come with the editor; the canvas is drawn again once they are in
    const fontBase = this.opts.fontsUrl ?? getAssetsBase();
    if (fontBase) {
      const doc = container.ownerDocument;
      injectBundledFonts(fontBase, doc);
      void Promise.all(BUNDLED_FACES.map((f) => doc.fonts.load(f)))
        .then(() => {
          resetMeasuredAdvances();
          this.render();
        })
        .catch(() => undefined);
    }
    this.build(container);
    this.attach();
    this.setupLayout(container);
    this.render();
    this.ctx = contextState(this.core);
    this.toolbar.setContextEnabled(!!(this.ctx && this.ctx.controls.length));
    if (this.restoredTab !== undefined && this.restoredTab !== this.toolbar.selected) this.selectTab(this.restoredTab);
    if (this.store) {
      document.addEventListener('visibilitychange', this.onHide);
      window.addEventListener('pagehide', this.onPageHide);
    }
    this.ready = true;
    queueMicrotask(() => this.emitEv('ready', {}));
    this.scheduleAccessible(true);
  }

  private build(container: HTMLElement): void {
    this.display = new FormulaDisplay();
    this.toolbar = new Toolbar(this);
    this.geom = new DocGeometry(this.core);
    this.core.geometry = this.geom;
    const handWrapper = h('div', { class: 'wrs_handWrapper' });
    const strip = h('div', { class: 'wrs_handStrip' });
    strip.innerHTML = `<svg width="30" height="316" viewBox="0 0 30 316" aria-hidden="true"><g transform="translate(1 138)">${ART.hand(28, 40)}</g></svg>`;
    const handBtn = h('input', { type: 'button', title: 'Go to handwritten mode', 'aria-label': 'Go to handwritten mode' });
    handWrapper.append(strip, handBtn);
    this.clipboardArea = h('textarea', { class: 'wrs_clipboardTextarea', tabindex: '-1', 'aria-hidden': 'true', readOnly: true }) as HTMLTextAreaElement;
    this.hand = new HandMode(this);
    const k = this.opts.toolbarSize;
    this.zoomK = k;
    this.root = h('div', { class: 'wrs_editor wrs_flexEditor wrs_animated' + (this.opts.detectHand ? ' wrs_withHand' : ' wrs_noHand'), role: 'application', translate: 'no' }, this.toolbar.root, this.display.wrapper, handWrapper, this.clipboardArea, this.hand.root);
    this.root.style.setProperty('--wrs-k', String(k));
    if (k !== 1) this.root.classList.add('wrs_scaled');
    container.appendChild(this.root);
    // translated tooltips / labels (the handwriting panel stays English, like the reference)
    this.display.wrapper.append(h('div', { class: 'wrs_hint', 'aria-hidden': 'true', text: 'Type here, or pick a symbol above' }));
    this.localizer = new Localizer(tableFor(this.lang), (el) => el.classList.contains('wrs_hand'));
    this.localizer.attach(this.root);
    handBtn.addEventListener('click', () => this.openHand());
    strip.addEventListener('click', () => this.openHand());
    this.buildNavPad();
  }

  /** Touch screens have no arrow keys on their keyboards: a small pad moves the caret (into the next slot, out of a
   * script, down to the denominator, to the next line) like the arrow keys do. */
  private navClear: HTMLButtonElement | null = null;
  private navKeyboard: HTMLButtonElement | null = null;
  private navHistory: HTMLButtonElement[] = [];
  private buildNavPad(): void {
    // built always; shown on touch screens and in narrow windows (CSS)
    // left / right, then up / down
    const keys: [string, string, string][] = [
      ['ArrowLeft', 'Move left', 'M16 5L6 12l10 7z'],
      ['ArrowRight', 'Move right', 'M8 5l10 7-10 7z'],
      ['ArrowUp', 'Move up', 'M5 16l7-10 7 10z'],
      ['ArrowDown', 'Move down', 'M5 8l7 10 7-10z'],
      ['Backspace', 'Delete backward', ''],
    ];
    const pad = h('div', { class: 'wrs_navPad', role: 'group', 'aria-label': 'Move the cursor' });
    // history: back / forward through the changes (a group of its own, beside the arrows)
    const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    const hist: [string, string, string, () => void, string][] = [
      ['Undo', mac ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)', 'M9 7L4.5 11.5 9 16M5 11.5h8.5a4.5 4.5 0 0 1 0 9H10', () => this.core.undo(), 'wrs_navUndo'],
      ['Redo', mac ? 'Redo (⇧⌘Z)' : 'Redo (Ctrl+Y)', 'M15 7l4.5 4.5L15 16M19 11.5h-8.5a4.5 4.5 0 0 0 0 9H14', () => this.core.redo(), 'wrs_navRedo'],
    ];
    const histEls: HTMLButtonElement[] = [];
    for (const [cap, title, d, run, cls] of hist) {
      const b = h('button', { type: 'button', class: 'wrs_navKey wrs_navHistory ' + cls, title, 'aria-label': title, tabindex: '-1' }) as HTMLButtonElement;
      b.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="#324d5b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="wrs_navCap">${cap}</span>`;
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', (e) => {
        e.preventDefault();
        if (b.getAttribute('aria-disabled') === 'true') return;
        this.closePopup();
        run();
        this.display.poke();
        this.focusEditor();
      });
      histEls.push(b);
    }
    this.navHistory = histEls;
    for (const [key, label, glyph] of keys) {
      const b = h('button', { type: 'button', class: 'wrs_navKey wrs_nav' + key.replace(/^Arrow/, ''), title: label, 'aria-label': label, tabindex: '-1' }) as HTMLButtonElement;
      // the four arrows are triangles of one size (10 x 14), so no glyph of a font makes one look smaller
      if (glyph) b.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="${glyph}" fill="#324d5b"/></svg>`;
      if (key === 'Backspace') {
        // the key's own sign: it points the way the text is deleted (mirrored in right-to-left formulas by the style)
        b.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h10.5a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6.2-7z" fill="none" stroke="#324d5b" stroke-width="1.8" stroke-linejoin="round"/><path d="M12.5 9.5l5 5m0-5l-5 5" fill="none" stroke="#324d5b" stroke-width="1.8" stroke-linecap="round"/></svg><span class="wrs_navCap">Delete</span>';
      }
      // a press must not take the focus (and so the soft keyboard) away from the formula
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.addEventListener('mousedown', (e) => e.preventDefault());
      let timer: ReturnType<typeof setTimeout> | null = null;
      const step = () => {
        this.closePopup();
        const host = { ed: this.core, runGeneral: (title: string) => this.runGeneral(title) };
        handleKey(host, key, { ctrl: false, alt: false, shift: false, meta: false });
        this.display.poke();
        this.focusEditor();
      };
      const stop = () => {
        if (timer) clearTimeout(timer);
        timer = null;
      };
      // holding a key repeats it (after a short delay, like a keyboard); the click that ends a press is not a second step
      const repeat = () => {
        timer = setTimeout(() => {
          step();
          repeat();
        }, 70);
      };
      b.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        step();
        stop();
        timer = setTimeout(repeat, 420);
      });
      b.addEventListener('click', (e) => {
        e.preventDefault();
        // pointer presses were handled on pointerdown; a click with no pointer is a key press on the focused button
        if (e.detail === 0) step();
      });
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
      pad.append(b);
    }
    // clear the whole formula – after a confirmation
    const clear = h('button', { type: 'button', class: 'wrs_navKey wrs_navClear', title: 'Clear the formula', 'aria-label': 'Clear the formula', tabindex: '-1' }) as HTMLButtonElement;
    clear.innerHTML = '<svg width="24" height="24" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 6h10M8 6V4h4v2M6.5 6l.7 10h5.6l.7-10M9 9v5M11 9v5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="wrs_navCap">Clear</span>';
    clear.addEventListener('pointerdown', (e) => e.preventDefault());
    clear.addEventListener('mousedown', (e) => e.preventDefault());
    const confirmBox = h('div', { class: 'wrs_confirm', role: 'alertdialog', 'aria-label': 'Clear the whole formula?' });
    const ask = h('div', { class: 'wrs_confirmText', text: 'Clear the whole formula?' });
    const no = h('button', { type: 'button', class: 'wrs_confirmNo', text: 'Cancel' }) as HTMLButtonElement;
    const yes = h('button', { type: 'button', class: 'wrs_confirmYes', text: 'Clear' }) as HTMLButtonElement;
    confirmBox.append(ask, no, yes);
    const hideConfirm = () => {
      confirmBox.classList.remove('wrs_open');
    };
    this.navClear = clear;
    clear.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.core.isEmpty()) return;
      confirmBox.classList.add('wrs_open');
      no.focus();
    });
    no.addEventListener('click', () => {
      hideConfirm();
      this.focusEditor();
    });
    yes.addEventListener('click', () => {
      hideConfirm();
      this.core.reset();
      this.focusEditor();
    });
    confirmBox.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') {
        hideConfirm();
        this.focusEditor();
      }
    });
    // the phone's own keyboard: shown while typing, put away with this key (the formula, the toolbar and the pad get its room
    // back); the formula keeps its caret and the pad keeps working
    const kb = h('button', { type: 'button', class: 'wrs_navKey wrs_navKeyboard', title: 'Keyboard', 'aria-label': 'Keyboard', 'aria-pressed': 'true', tabindex: '-1' }) as HTMLButtonElement;
    kb.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6 10h1.6M10 10h1.6M14 10h1.6M18 10h.2M6 13.5h.2M8.5 14h7M18 13.5h.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="wrs_navCap">Keys</span>';
    kb.addEventListener('pointerdown', (e) => e.preventDefault());
    kb.addEventListener('mousedown', (e) => e.preventDefault());
    kb.addEventListener('click', (e) => {
      e.preventDefault();
      const input = this.display.input;
      const on = input.inputMode === 'none';
      input.inputMode = on ? 'text' : 'none';
      kb.setAttribute('aria-pressed', String(on));
      kb.classList.toggle('wrs_navOn', on);
      // a changed input mode takes effect when the field is focused again
      input.blur();
      input.focus({ preventScroll: true });
    });
    // on a touch screen the keyboard stays away until the formula is tapped (or this key is pressed)
    const touchKb = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    if (touchKb) this.display.input.inputMode = 'none';
    kb.setAttribute('aria-pressed', String(!touchKb));
    kb.classList.toggle('wrs_navOn', !touchKb);
    this.navKeyboard = kb;
    pad.prepend(kb);
    pad.prepend(clear);
    // the history group sits right before the arrows
    const firstArrow = pad.querySelector('.wrs_navLeft');
    histEls.forEach((b) => pad.insertBefore(b, firstArrow));
    // a bar of its own below the formula area (fluid layout) so that it is never covered or scrolled away
    this.display.wrapper.after(pad, confirmBox);
    this.root.classList.add('wrs_hasNavPad');
  }

  private attach(): void {
    const disp = this.display;
    const input = disp.input;
    // pointer on the display
    disp.view.addEventListener('mousedown', (e) => this.onMouseDown(e as MouseEvent));
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    disp.view.addEventListener('dblclick', (e) => this.onDblClick(e as MouseEvent));
    disp.view.addEventListener('contextmenu', (e) => e.preventDefault());
    // a long press on a touch screen selects the word / run under the finger (the native selection of the browser would
    // take the focus, and with it the keyboard, away from the formula)
    let press: ReturnType<typeof setTimeout> | null = null;
    let pressAt = { x: 0, y: 0 };
    const cancelPress = () => {
      if (press) clearTimeout(press);
      press = null;
    };
    disp.view.addEventListener('pointerdown', (e) => {
      const pe = e as PointerEvent;
      if (pe.pointerType !== 'touch' || !pe.isPrimary) return;
      cancelPress();
      pressAt = { x: pe.clientX, y: pe.clientY };
      press = setTimeout(() => {
        press = null;
        const p = this.display.toContent(pressAt.x, pressAt.y);
        const hit = this.display.hitTest(p.x, p.y);
        if (!hit) return;
        this.closePopup();
        this.core.setCaret(hit);
        this.core.selectRun(hit);
        // the browser may still send the mouse events of a tap when the finger lifts: they must not undo the selection
        this.longPressedAt = Date.now();
        this.wantKeyboard();
        this.focusEditor();
      }, 450);
    });
    disp.view.addEventListener('pointermove', (e) => {
      if (press && Math.hypot((e as PointerEvent).clientX - pressAt.x, (e as PointerEvent).clientY - pressAt.y) > 10) cancelPress();
    });
    for (const t of ['pointerup', 'pointercancel', 'pointerleave']) disp.view.addEventListener(t, cancelPress);
    // keyboard
    input.addEventListener('keydown', (e) => this.onKeyDown(e));
    input.addEventListener('input', () => this.onInput());
    input.addEventListener('compositionend', () => this.onInput());
    input.addEventListener('focus', () => this.onFocus(true));
    input.addEventListener('blur', () => this.onFocus(false));
    input.addEventListener('paste', (e) => this.onPaste(e as ClipboardEvent));
    input.addEventListener('copy', (e) => this.onCopy(e as ClipboardEvent, false));
    input.addEventListener('cut', (e) => this.onCopy(e as ClipboardEvent, true));
    // clicks outside close popups
    document.addEventListener('mousedown', this.onDocDown, true);
    // selects of the toolbar
    const sel = this.toolbar.selects;
    if (sel) {
      sel.font.addEventListener('change', () => {
        this.core.setFontFamily(sel.font.value === 'inherit' ? '' : sel.font.value);
        this.focusEditor();
      });
      sel.size.addEventListener('change', () => {
        const v = sel.size.value;
        this.core.setFontSize(v && v !== 'inherit' ? parseInt(v, 10) : null);
        this.focusEditor();
      });
    }
    this.root.addEventListener('keydown', this.onRootKeyDown);
    this.display.onHandle = (end, x, y) => {
      const sel = this.core.sel;
      if (!sel) return;
      const hit = this.display.hitTest(x, y);
      if (!hit) return;
      const other = end === 'from' ? sel.to : sel.from;
      this.core.selectRange({ path: sel.path, index: other } as any, hit);
    };
    this.core.subscribe(() => this.onCoreChange());
  }

  destroy(): void {
    this.localizer?.detach();
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousedown', this.onDocDown, true);
    this.resizeObs?.disconnect();
    this.onPageHide();
    document.removeEventListener('visibilitychange', this.onHide);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('resize', this.onWinResize);
    window.removeEventListener('orientationchange', this.onWinResize);
    this.root?.remove();
  }

  /* ------------------------------------------------------------- layout */
  private setupLayout(container: HTMLElement): void {
    this.host = container;
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObs = new ResizeObserver(() => this.onWinResize());
      this.resizeObs.observe(container);
    }
    window.addEventListener('resize', this.onWinResize);
    window.addEventListener('orientationchange', this.onWinResize);
    this.applyLayout();
  }

  /** the classic widget needs 725 px; a narrower container gets the fluid layout (or when asked for) */
  private applyLayout(): void {
    if (!this.root || !this.host) return;
    // a field of a dialog / picker has the focus: on a phone its soft keyboard shrinks the window, which must not change
    // the layout (and with it close the dialog the person is filling in)
    const ae = this.root.ownerDocument.activeElement as HTMLElement | null;
    if (ae && this.root.contains(ae) && ae.matches('input:not(.wrs_focusElement), textarea:not(.wrs_clipboardTextarea), select') && this.popup) {
      this.hand.resize();
      return;
    }
    const w = this.host.clientWidth;
    // the height of the window a soft keyboard leaves must not change the layout (no relayout, no flicker, also on slow
    // phones): decisions use the tallest height seen at this width
    if (w !== this.stableW) {
      this.stableW = w;
      this.stableIH = 0;
    }
    this.stableIH = Math.max(this.stableIH, window.innerHeight);
    const attr = this.host.dataset.wrsLayout as 'classic' | 'fluid' | 'auto' | undefined;
    const mode = this.layoutMode !== 'auto' ? this.layoutMode : attr ?? 'auto';
    // a low window (a phone held sideways) has no room for the 415 px widget either
    const fluid = mode === 'fluid' || (mode === 'auto' && w > 0 && (w < 725 || this.stableIH < 480));
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    // the controls keep their size on every device (the panel is made shorter and scrolls instead)
    const k: number = this.opts.toolbarSize;
    // a narrow window (a phone): no sideways scrolling – the tabs share one row and the controls wrap into rows
    const narrow = fluid && w > 0 && w < 960;
    const hk = fluid && coarse ? 1.35 : 1;
    // nothing that matters changed (the window only became lower: a soft keyboard): leave everything as it is
    const key = `${fluid}|${narrow}|${k}|${hk}|${coarse}|${w}`;
    if (key === this.layoutKey) {
      if (this.isHandOpen()) this.hand.resize();
      return;
    }
    this.layoutKey = key;
    // only a change of the layout mode closes a pop-up; a new zoom (a different window height) keeps it
    const changed = fluid !== this.fluid;
    this.fluid = fluid;
    this.zoomK = k;
    this.root.classList.toggle('wrs_fluid', fluid);
    this.root.classList.toggle('wrs_scaled', !fluid && k !== 1);
    this.root.classList.toggle('wrs_touch', coarse);
    this.root.classList.toggle('wrs_reflow', narrow);
    // the panel never takes the room the formula needs (tabs 40 px, touch pad 56 px, at least 120 px of formula): it
    // scrolls up and down inside itself instead
    this.root.style.setProperty('--wrs-k', String(k));
    this.root.style.setProperty('--wrs-hk', String(hk));
    if (changed) this.closePopup();
    this.toolbar.setReflow(narrow, narrow ? Math.floor(w / k) : 0);
    this.hand.resize();
  }

  setLayout(mode: 'auto' | 'classic' | 'fluid'): void {
    this.layoutMode = mode;
    this.applyLayout();
  }

  getLayout(): 'classic' | 'fluid' {
    return this.fluid ? 'fluid' : 'classic';
  }

  /* ------------------------------------------------------------ rendering */
  /** the person set the digits themselves (toolbar toggles): the default no longer follows the language / font */
  private digitsChosen = false;
  /** Arabic-Indic digits by default as soon as the formula is Arabic: an Arabic language, the toolbar's right-to-left or
   * Arabic-ligature button, or an Arabic font; Western again when none of them applies (unless the person chose) */
  private syncDigits(): void {
    if (this.digitsChosen) return;
    const lang = digitsForLanguage(this.lang, this.opts.arabicIndicLanguages, this.opts.easternArabicIndicLanguages);
    const arabic = this.core.rtl || this.core.modes.arabicLigature || !!arabicFontOf(this.core.getFontFamily());
    const want = lang !== 'western' ? lang : arabic ? 'arabicIndic' : 'western';
    if (this.core.modes.digits !== want) this.core.modes.digits = want;
  }

  private onCoreChange(): void {
    this.syncDigits();
    if (!this.root) return;
    this.normalizeRoot();
    this.render();
    // what is not needed to answer a tap (the MathML text, the saved copy, the change event) waits until the taps pause:
    // a slow phone spends the tap on the drawing, not on bookkeeping
    if (this.changeTimer) clearTimeout(this.changeTimer);
    this.changeTimer = setTimeout(() => this.flushChange(), 100);
  }

  private flushChange(): void {
    if (this.changeTimer) clearTimeout(this.changeTimer);
    this.changeTimer = null;
    const mml = this.core.getMathML();
    this.persistNow(mml);
    if (mml !== this.lastMml) {
      this.lastMml = mml;
      this.emitEv('change', { mathml: this.getMathML(), empty: this.isEmpty() });
    }
  }

  /** keep typing inside a whole-equation mstyle wrapper */
  private normalizeRoot(): void {
    const c = this.core;
    if (c.row.length === 1 && c.row[0].t === 'mstyle' && c.row[0].a.some(([k]) => k === 'mathsize') && c.caret.path.length === 0) {
      c.caret = { path: [[0, 0]], index: c.row[0].c![0].length };
    }
  }

  /** faces of the Font list are fetched when a formula first uses one; the formula is measured and drawn again then */
  private arabicFaces = new Set<string>();
  private ensureArabicFace(family: string): void {
    if (!family || this.arabicFaces.has(family) || (!this.opts.fontsUrl && !getAssetsBase())) return;
    this.arabicFaces.add(family);
    const doc = this.root?.ownerDocument ?? document;
    void doc.fonts
      .load(`16px "${family}"`)
      .then(() => {
        resetMeasuredAdvances();
        this.render();
      })
      // a face that cannot be fetched: the default Arabic face is used, try again on the next choice
      .catch(() => this.arabicFaces.delete(family));
  }

  render(): void {
    const core = this.core;
    this.navClear?.classList.toggle('wrs_navOff', core.isEmpty());
    // back / forward are greyed while there is nothing to go back / forward to
    this.navHistory.forEach((b, i) => {
      const off = i === 0 ? !core.canUndo() : !core.canRedo();
      b.classList.toggle('wrs_navOff', off);
      if (off) b.setAttribute('aria-disabled', 'true');
      else b.removeAttribute('aria-disabled');
    });
    this.root.classList.toggle('wrs_emptyDoc', core.isEmpty());
    const arabic = arabicCssFamily(core.getFontFamily());
    this.ensureArabicFace(arabic);
    this.lastLayout = layoutDocument(core.row, undefined, 16, core.rtl, arabic);
    const rtl = core.rtl;
    this.root.classList.toggle('wrs_rtl', rtl);
    this.display.render(this.lastLayout, { caret: core.caret, sel: core.sel, focused: this.focused, rtl, showCaret: true, arabic });
    // font family of letters
    const fam = core.getFontFamily();
    this.display.view.style.fontFamily = fam === 'stix' ? "'STIX Two Math',serif" : fam || '';
    if (rtl) {
      const w = this.display.view.clientWidth;
      // the content box is two pixels wider than the drawing: the drawing ends at the reference's right padding
      const cw = Math.ceil(this.lastLayout.w);
      (this.display as any).content.style.marginLeft = Math.max(5, w - cw - 5) + 'px';
    } else (this.display as any).content.style.marginLeft = '5px';
    this.display.scrollCaretIntoView(core.caret);
    this.display.poke();
    this.syncToolbar();
    this.refreshContext();
    this.announceCaret();
    this.scheduleAccessible();
  }

  private syncToolbar(): void {
    const c = this.core;
    const tb = this.toolbar;
    const hasSel = c.hasSelection();
    const by = (prefix: string) => [...tb.buttons.values()].find((b) => Localizer.english(b).startsWith(prefix));
    const setDis = (prefix: string, dis: boolean) => {
      const b = by(prefix);
      if (!b) return;
      b.classList.toggle('wrs_disabled', dis);
      if (dis) b.setAttribute('aria-disabled', 'true');
      else b.removeAttribute('aria-disabled');
    };
    setDis('Press Ctrl+C', !hasSel);
    setDis('Press Ctrl+X', !hasSel);
    setDis('Redo', !c.canRedo());
    setDis('Undo', !c.canUndo());
    const tog = (prefix: string, on: boolean) => by(prefix)?.classList.toggle('wrs_toggled', on);
    tog('Bold', c.modes.bold);
    tog('Italic', c.modes.italic);
    tog('Automatic italic', c.modes.autoItalic && !c.modes.italic);
    tog('Regular text', c.modes.text);
    tog('Right to left', c.rtl);
    tog('Arabic ligature', c.modes.arabicLigature);
    tog('Arabic-Indic', c.modes.digits === 'arabicIndic');
    tog('Eastern Arabic-Indic', c.modes.digits === 'easternArabicIndic');
    if (this.lastRtl !== c.rtl) {
      this.lastRtl = c.rtl;
      tb.setRtlIcons(c.rtl);
    }
    const sel = tb.selects;
    if (sel) {
      const fam = c.getFontFamily();
      sel.font.value = FONT_FAMILIES.some((f) => f.value === fam && fam) ? fam : 'inherit';
      const fl = FONT_FAMILIES.find((f) => f.value === (fam || 'inherit'));
      // an Arabic face shows its name in Arabic script, drawn in the face (short, and flags it as an Arabic font)
      const ar = fl?.arabic;
      sel.fontLabel.textContent = ar ? ar.arLabel : fl ? fl.label : fam;
      sel.fontLabel.style.fontFamily = ar ? `'${ar.family}'` : '';
      sel.fontLabel.classList.toggle('wrs_arabicFont', !!ar);
      sel.fontBox.title = ar ? ar.label : '';
      sel.fontBox.classList.toggle('wrs_active', !!fam);
      const fs = c.getFontSize();
      sel.size.value = fs ? fs + 'px' : 'inherit';
      sel.sizeLabel.textContent = fs ? fs + 'px' : '— Size —';
      sel.sizeBox.classList.toggle('wrs_active', fs !== null);
    }
  }

  /* ------------------------------------------------------ contextual tab */
  private refreshContext(): void {
    this.ctx = contextState(this.core);
    this.toolbar.setContextEnabled(!!(this.ctx && this.ctx.controls.length));
    if (this.toolbar.selected === 9) this.renderContextPanel();
  }

  private renderContextPanel(): void {
    const loc = locate(this.core);
    const ctx = this.ctx;
    this.toolbar.renderContext(
      ctx ? ctx.layout : '',
      ctx ? ctx.controls : [],
      (id, kind, el) => this.onContextControl(id, kind, el),
      ctxIcon,
      (id) => (loc ? ctxValue(this.core, loc, id) : {}),
    );
  }

  private onContextControl(id: string, kind: string, el: HTMLElement): void {
    if (kind === 'length') {
      this.openLength(id, el);
      return;
    }
    const before = this.ctx;
    if (kind === 'select') {
      applyContext(this.core, id, (el as HTMLSelectElement).value);
    } else applyContext(this.core, id);
    this.refreshContext();
    // the reference leaves the merge / unmerge button in place until the next input (it can be pressed again)
    if (id === 'numsep_merge' && before) {
      this.ctx = before;
      if (this.toolbar.selected === 9) this.renderContextPanel();
    }
    this.focusEditor();
  }

  /** focus the field of a dialog – not on touch screens, where that would only raise the soft keyboard over it */
  private focusField(el: HTMLElement): void {
    if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) return;
    el.focus();
  }

  /* ------------------------------------------------------- toolbar host */
  focusEditor(): void {
    this.display.input.focus({ preventScroll: true });
  }

  selectTab(i: number, focusFirst = false): void {
    this.closePopup();
    this.toolbar.select(i);
    // the Contextual tab depends on the caret: the page opens on the tab before it
    if (i <= 8) this.store?.set({ tab: i });
    if (i === 9) this.renderContextPanel();
    this.emitEv('tabchange', { tab: i });
    if (focusFirst) {
      const first = i === 9 ? null : this.toolbar.firstButton(i);
      if (first) first.focus();
      else this.focusEditor();
    }
  }

  runControl(c: Control, origin: 'pointer' | 'keyboard'): void {
    this.closePopup();
    const b = behaviorOf(c);
    const core = this.core;
    const btn = this.toolbar.buttons.get(c.id) ?? this.popupButton(c.id);
    if (b === 'insert') {
      core.activate(c);
      this.focusEditor();
      return;
    }
    if (b === 'picker') {
      this.openPicker(c, btn!);
      return;
    }
    if (b === 'digits-arabic') {
      this.digitsChosen = true;
      core.setDigits(core.modes.digits === 'arabicIndic' ? 'western' : 'arabicIndic');
      this.focusEditor();
      return;
    }
    if (b === 'digits-eastern') {
      this.digitsChosen = true;
      core.setDigits(core.modes.digits === 'easternArabicIndic' ? 'western' : 'easternArabicIndic');
      this.focusEditor();
      return;
    }
    const t = c.title;
    if (/^Press Ctrl\+C/.test(t)) this.copySelection(false);
    else if (/^Press Ctrl\+X/.test(t)) this.copySelection(true);
    else if (/^Press Ctrl\+V/.test(t)) this.pasteButton();
    else if (/^Undo/.test(t)) core.undo();
    else if (/^Redo/.test(t)) core.redo();
    else if (/^Bold/.test(t)) core.toggleBold();
    else if (/^Italic/.test(t)) core.toggleItalic();
    else if (/^Automatic italic/.test(t)) core.setAutoItalic(!core.modes.autoItalic);
    else if (/^Regular text/.test(t)) core.setRegularText(!core.modes.text);
    else if (/^Right to left/.test(t)) core.setRtl(!core.rtl);
    else if (/^Arabic ligature/.test(t)) {
      core.modes.arabicLigature = !core.modes.arabicLigature;
      this.syncToolbar();
    } else if (/^Color/.test(t)) {
      this.openPalette(btn!);
      return;
    } else if (/^Insert special/.test(t)) {
      this.openUnicode(btn!);
      return;
    }
    this.focusEditor();
  }

  private popupButton(id: string): HTMLButtonElement | undefined {
    return this.popup?.el.querySelector<HTMLButtonElement>(`button[data-id="${id}"]`) ?? undefined;
  }

  /* ---------------------------------------------------------------- popups */
  /** remove the hidden panel left over by a previous use */
  private dropHidden(cls: string): void {
    this.root.querySelectorAll(`.${cls}.wrs_hidden_panel`).forEach((n) => n.remove());
  }

  closePopup(): void {
    if (!this.popup) return;
    const p = this.popup;
    this.popup = null;
    p.close();
    // the reference keeps its value panels in the DOM (hidden) after use
    if (['picker', 'palette', 'unicode'].includes(p.kind)) {
      this.root.querySelectorAll(`.${[...p.el.classList].find((c) => /Panel$/.test(c))}`).forEach((n) => n !== p.el && n.remove());
      p.el.style.display = 'none';
      p.el.classList.add('wrs_hidden_panel');
    } else p.el.remove();
    if (p.owner) {
      p.owner.setAttribute('aria-expanded', 'false');
      p.owner.classList.remove('wrs_pressed');
    }
  }

  private onDocDown = (e: MouseEvent): void => {
    if (!this.popup) return;
    const t = e.target as Node;
    if (this.popup.el.contains(t)) return;
    if (this.popup.owner && this.popup.owner.contains(t)) return;
    // a click on another expand button or tab is handled by their own handlers
    const owner = this.popup.owner;
    const kind = this.popup.kind;
    this.closePopup();
    if (kind === 'group' && owner && this.display.wrapper.contains(t)) {
      // the click only closes the pop-up; the focus returns to its arrow
      e.stopPropagation();
      e.preventDefault();
      owner.focus();
    }
  };

  openGroup(tab: number, group: number, btn: HTMLElement): void {
    // the arrow of the open pop-up closes it again
    if (this.popup && this.popup.kind === 'group' && this.popup.owner === btn) {
      this.closePopup();
      return;
    }
    this.closePopup();
    const items = catalogue.controls.filter((c) => c.tab === tab && c.group === group).sort((a, b) => a.n - b.n);
    if (!items.length) return;
    const pad = 3;
    const minX = Math.min(...items.map((c) => c.geom[0]));
    const minY = Math.min(...items.map((c) => c.geom[1]));
    const maxX = Math.max(...items.map((c) => c.geom[0] + c.geom[2]));
    const maxY = Math.max(...items.map((c) => c.geom[1] + c.geom[3]));
    const el = h('div', { class: 'wrs_popup' + (tab === 3 && group === 6 ? ' wrs_periodic' : ''), role: 'menu' });
    // measured on the reference: 1px border + 2px padding around a grid of cells, 1px extra on the right
    el.style.left = minX - 3 + 'px';
    el.style.top = minY - 3 + 'px';
    if (this.fluid && this.root.classList.contains('wrs_reflow')) {
      // the controls were re-arranged to fit the width: the pop-up opens just under the tapped arrow
      const b = btn.getBoundingClientRect();
      const rr = this.root.getBoundingClientRect();
      const kz = this.zoomK;
      el.style.left = (b.left - rr.left) / kz - 4 + 'px';
      el.style.top = (b.bottom - rr.top) / kz + 2 + 'px';
    } else if (this.fluid) {
      // the toolbar is zoomed and scrolled: put the pop-up where its arrow's panel is on the screen
      const tb = this.toolbar.root.getBoundingClientRect();
      const rr0 = this.root.getBoundingClientRect();
      const kz = this.zoomK;
      const strip = this.toolbar.root.querySelector('.wrs_panelContainer') as HTMLElement | null;
      el.style.left = (tb.left - rr0.left - (strip?.scrollLeft ?? 0) + (minX - 3) * kz) / kz + 'px';
      el.style.top = (tb.top - rr0.top + (minY - 3) * kz) / kz + 'px';
    }
    el.style.width = maxX - minX + 7 + 'px';
    el.style.height = maxY - minY + 6 + 'px';
    const btns: HTMLButtonElement[] = [];
    items.forEach((c, i) => {
      const b = this.toolbar.addControl(el, c, tab, false);
      b.dataset.id = c.id;
      b.style.left = c.geom[0] - minX + 2 + 'px';
      b.style.top = c.geom[1] - minY + 2 + 'px';
      b.setAttribute('role', 'menuitem');
      b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener('keydown', (ev) => this.popupKey(ev as KeyboardEvent, btns, i, btn));
      btns.push(b);
    });
    this.root.append(el);
    this.fitInside(el);
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('wrs_pressed');
    this.popup = { el, kind: 'group', owner: btn, close: () => undefined };
    btns[0]?.focus();
  }

  private popupKey(e: KeyboardEvent, btns: HTMLButtonElement[], i: number, owner: HTMLElement): void {
    const move = (k: number) => {
      const t = btns[(k + btns.length) % btns.length];
      btns.forEach((b) => (b.tabIndex = -1));
      t.tabIndex = 0;
      t.focus();
    };
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(i + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(i - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(i + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move(i - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.closePopup();
      owner.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      btns[i].click();
    }
  }

  /* ------------------------------------------------------ matrix / table */
  /** place a pop-up panel under a toolbar button (coordinates relative to the widget) */
  private placePanel(el: HTMLElement, btn: HTMLElement, dx = 0): void {
    const r = btn.getBoundingClientRect();
    const rr = this.root.getBoundingClientRect();
    const k = this.zoomK;
    el.style.left = Math.round((r.left - rr.left + dx) / k) + 'px';
    el.style.top = Math.round((r.bottom - rr.top - k) / k) + 'px';
    this.fitInside(el);
  }

  /** keep a pop-up inside the widget (a narrow screen would cut it off): shift it left / up, never past the top-left */
  private fitInside(el: HTMLElement): void {
    if (!this.fluid) return;
    // the element is placed in the zoomed coordinates of the pop-ups (left / top are divided by the zoom)
    const k = this.zoomK;
    const rr = this.root.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    let dx = 0;
    let dy = 0;
    if (r.right > rr.right - 4) dx = rr.right - 4 - r.right;
    if (r.left + dx < rr.left + 4) dx = rr.left + 4 - r.left;
    if (r.bottom > rr.bottom - 4) dy = rr.bottom - 4 - r.bottom;
    if (r.top + dy < rr.top + 4) dy = rr.top + 4 - r.top;
    if (dx) el.style.left = parseFloat(el.style.left || '0') + dx / k + 'px';
    if (dy) el.style.top = parseFloat(el.style.top || '0') + dy / k + 'px';
  }

  private openPicker(c: Control, btn: HTMLElement): void {
    this.closePopup();
    this.dropHidden('wrs_matrixButtonPanel');
    const el = h('div', { class: 'wrs_matrixButtonPanel wrs_panel', role: 'dialog', 'aria-label': c.title });
    const cells: HTMLElement[] = [];
    const grid = h('table');
    const gb = h('tbody');
    for (let r = 0; r < 6; r++) {
      const tr = h('tr');
      for (let k = 0; k < 6; k++) {
        const cell = h('div', { class: 'wrs_matrixButton' });
        cell.dataset.r = String(r + 1);
        cell.dataset.c = String(k + 1);
        cells.push(cell);
        tr.append(h('td', {}, cell));
      }
      gb.append(tr);
    }
    grid.append(gb);
    const rows = h('input', { type: 'number', title: 'Rows' }) as HTMLInputElement;
    const cols = h('input', { type: 'number', title: 'Columns' }) as HTMLInputElement;
    const dims = h('table', {}, h('tbody', {}, h('tr', {}, h('td', { text: 'Rows: ' }), h('td', { class: 'wrs_inputCell' }, rows)), h('tr', {}, h('td', { text: 'Columns: ' }), h('td', { class: 'wrs_inputCell' }, cols))));
    el.append(grid, dims);
    const paint = (r: number, k: number) => cells.forEach((cell) => cell.classList.toggle('wrs_selected', +cell.dataset.r! <= r && +cell.dataset.c! <= k));
    const insert = (r: number, k: number) => {
      const R = Math.max(1, Math.trunc(Number.isFinite(r) ? r : 1) || 1);
      const C = Math.max(1, Math.trunc(Number.isFinite(k) ? k : 1) || 1);
      this.closePopup();
      this.insertTable(R, C, c.title);
    };
    cells.forEach((cell) => {
      cell.addEventListener('mouseenter', () => {
        const r = +cell.dataset.r!;
        const k = +cell.dataset.c!;
        paint(r, k);
        rows.value = String(r);
        cols.value = String(k);
      });
      cell.addEventListener('click', () => insert(+cell.dataset.r!, +cell.dataset.c!));
    });
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        insert(parseFloat(rows.value), parseFloat(cols.value));
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        this.closePopup();
        btn.focus();
      }
    };
    rows.addEventListener('keydown', onKey);
    cols.addEventListener('keydown', onKey);
    this.root.append(el);
    this.placePanel(el, btn);
    this.popup = { el, kind: 'picker', owner: btn as HTMLElement, close: () => undefined };
    // on a touch screen the squares are tapped; focusing a number field would only raise the soft keyboard
    this.focusField(rows);
  }

  private insertTable(rows: number, cols: number, title: string): void {
    const core = this.core;
    const cells = Array.from({ length: rows * cols }, () => [] as any[]);
    const table = { t: 'mtable', a: [] as [string, string][], c: cells, cols };
    let el: any = table;
    const fenceOf: Record<string, [string | null, string | null]> = { 'Matrix with vertical bars': ['|', '|'], 'Matrix with square brackets': ['[', ']'], 'Matrix with parenthesis': [null, null] };
    if (title in fenceOf) {
      const [o, cl] = fenceOf[title];
      const a: [string, string][] = [];
      if (o) a.push(['open', o]);
      if (cl) a.push(['close', cl]);
      el = { t: 'mfenced', a, c: [[table]] };
    }
    (core as any).insertElement(el, this.opts.parity === 'improved');
    this.focusEditor();
    // Q-01: in exact parity the focus is left on <body>
    if (this.opts.parity === 'exact') (document.activeElement as HTMLElement | null)?.blur?.();
  }

  /* -------------------------------------------------------------- palette */
  private openPalette(btn: HTMLElement): void {
    if (this.popup?.kind === 'palette') return;
    this.closePopup();
    this.dropHidden('wrs_colorChooserPanel');
    const el = h('div', { class: 'wrs_colorChooserPanel wrs_panel', role: 'dialog', 'aria-label': 'Color' });
    const swatches: HTMLElement[] = [];
    const tb = h('tbody');
    for (let r = 0; r < 5; r++) {
      const tr = h('tr');
      for (let k = 0; k < 5; k++) {
        const i = r * 5 + k;
        const c = SWATCHES[i];
        const sw = h('div', { class: 'wrs_colorButton', role: 'button', tabindex: '0', title: c, style: { background: c } });
        sw.addEventListener('click', () => {
          this.core.setColor(c);
          this.closePopup();
          this.focusEditor();
        });
        sw.addEventListener('keydown', (e) => {
          const key = e.key;
          if (key === 'Enter' || key === ' ') {
            e.preventDefault();
            sw.click();
          } else if (key === 'ArrowRight') swatches[Math.min(i + 1, 24)].focus();
          else if (key === 'ArrowLeft') swatches[Math.max(i - 1, 0)].focus();
          else if (key === 'ArrowDown') swatches[Math.min(i + 5, 24)].focus();
          else if (key === 'ArrowUp') swatches[Math.max(i - 5, 0)].focus();
        });
        swatches.push(sw);
        tr.append(h('td', {}, sw));
      }
      tb.append(tr);
    }
    const hex = h('input', { type: 'text', title: 'Color', value: '#000000' }) as HTMLInputElement;
    hex.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.value.trim());
        if (m) {
          let v = m[1].toUpperCase();
          if (v.length === 3) v = v.split('').map((ch) => ch + ch).join('');
          this.core.setColor('#' + v);
          this.closePopup();
          this.focusEditor();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closePopup();
        btn.focus();
      }
    });
    el.append(h('table', {}, tb), h('div', { text: 'Color: ' }, hex));
    el.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') {
        this.closePopup();
        btn.focus();
      }
    });
    this.root.append(el);
    this.placePanel(el, btn);
    this.popup = { el, kind: 'palette', owner: btn, close: () => undefined };
    this.focusField(hex);
    hex.select();
  }

  /* --------------------------------------------------- special characters */
  private openUnicode(btn: HTMLElement): void {
    if (this.popup?.kind === 'unicode') return;
    this.closePopup();
    this.dropHidden('wrs_unicodeChooserPanel');
    const el = h('div', { class: 'wrs_unicodeChooserPanel wrs_panel', id: 'wrs_unicodeChooserPanelId', role: 'dialog', 'aria-label': 'Insert special characters' });
    // (the hexadecimal "Code" field of the reference dialog is not offered: nobody knows code points by heart, the
    // categories and the shapes are the way in)
    const cat = h('select', { 'aria-label': 'Category' }) as HTMLSelectElement;
    const CATS: [string, keyof typeof unicodeData][] = [['S', 'Symbol'], ['P', 'Punctuation'], ['L', 'Letter'], ['M', 'Mark'], ['N', 'Number'], ['F', 'Phonetical'], ['C', 'Other']];
    // the Arabic mathematical symbols (the symbol tables of the Zulfi keyboard maps) are lists of their own: first in an
    // Arabic editor, after the Unicode categories otherwise
    const arabicUi = /^ar/i.test(this.lang) || this.core.rtl;
    // one entry per shape list, in the same flat list as the Unicode categories (a group heading would not be clickable)
    const zOptions = ZULFI_GROUPS.map((g) => h('option', { value: 'Z:' + g.id, text: arabicUi ? 'الحروف الرياضية العربية' : 'Arabic math letters' }));
    if (arabicUi) zOptions.forEach((o) => cat.append(o));
    CATS.forEach(([v, n]) => cat.append(h('option', { value: v, text: n })));
    if (!arabicUi) zOptions.forEach((o) => cat.append(o));
    const container = h('div', { class: 'wrs_unicodeChooserTableContainer' });
    el.append(h('div', {}, cat), container);
    const pick = (cp: number) => {
      this.closePopup();
      this.core.typeText(String.fromCodePoint(cp));
      this.focusEditor();
    };
    const fill = (cps: number[]) => {
      container.textContent = '';
      const tb = h('tbody');
      // the shapes are 40 px cells: as many columns as the panel is wide
      const COLS = el.classList.contains('wrs_zulfiMode') ? Math.max(4, Math.min(8, Math.floor((container.clientWidth || 320) / 40))) : 9;
      const max = Math.min(cps.length, 3600);
      for (let i = 0; i < max; i += COLS) {
        const tr = h('tr');
        for (let k = 0; k < COLS; k++) {
          const td = h('td');
          const cp = cps[i + k];
          if (i + k < max && cp !== undefined) {
            const zs = zulfiSymbol(cp);
            const d = h('div', { class: 'wrs_unicodeButton wrs_mathChar wrs_font_stix' + (zs ? ' wrs_zulfiButton' : ''), tabindex: '0', title: zs ? `${zs.k}\n U+${cp.toString(16).toUpperCase()}` : 'U+' + cp.toString(16).toUpperCase().padStart(4, '0') + '\n &#' + cp + ';' });
            if (zs) {
              d.innerHTML = zulfiSvg(cp, 26);
              d.setAttribute('role', 'button');
              d.setAttribute('aria-label', zs.k);
            } else d.textContent = String.fromCodePoint(cp);
            d.addEventListener('click', () => pick(cp));
            d.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pick(cp);
              } else if (e.key === 'Escape') {
                this.closePopup();
                btn.focus();
              }
            });
            td.append(d);
          }
          tr.append(td);
        }
        tb.append(tr);
      }
      container.append(h('table', { class: 'wrs_unicodeTable' }, tb));
    };
    const showCategory = () => {
      // the Arabic math symbols are bigger shapes: the panel grows for them
      el.classList.toggle('wrs_zulfiMode', cat.value.startsWith('Z:'));
      // the bigger panel must stay on the screen
      this.fitInside(el);
      if (cat.value.startsWith('Z:')) fill(ZULFI_GROUPS.find((g) => g.id === cat.value.slice(2))?.items ?? []);
      else fill((unicodeData as any)[CATS.find((c) => c[0] === cat.value)![1]]);
    };
    cat.addEventListener('change', () => showCategory());
    el.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') {
        this.closePopup();
        btn.focus();
      }
    });
    this.root.append(el);
    this.placePanel(el, btn);
    cat.selectedIndex = 0;
    showCategory();
    this.popup = { el, kind: 'unicode', owner: btn, close: () => undefined };
    this.focusField(cat);
  }

  /* --------------------------------------------------------- length field */
  private openLength(id: string, btn: HTMLElement): void {
    this.closePopup();
    const ctl = this.ctx?.controls.find((c) => c.id === id);
    const loc = locate(this.core);
    const cur = loc ? ctxValue(this.core, loc, id).value ?? '' : '';
    // the panel of the reference: the title and a "Value:" row under the pressed button
    const el = h('div', { class: 'wrs_lengthButtonPanel', role: 'dialog', 'aria-label': ctl?.title ?? id });
    const r = btn.getBoundingClientRect();
    const rr = this.root.getBoundingClientRect();
    el.style.left = Math.round((r.left - rr.left) / this.zoomK) + 'px';
    el.style.top = Math.round((r.top - rr.top + 21 * this.zoomK) / this.zoomK) + 'px';
    const input = h('input', { type: 'text', value: cur, title: 'Value', 'aria-label': 'Value', spellcheck: 'false' }) as HTMLInputElement;
    const table = h('table', {}, h('tr', {}, h('td', { colspan: '2', text: ctl?.title ?? id })), h('tr', {}, h('td', { text: 'Value:' }), h('td', { class: 'wrs_inputCell' }, input)));
    el.append(table);
    input.addEventListener('input', () => {
      input.classList.remove('wrs_invalid');
      input.removeAttribute('aria-invalid');
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = parseLength(input.value);
        if (v === null) {
          // rejected: the panel stays open (Q-05) and the field is marked, so the refusal is not silent
          input.classList.add('wrs_invalid');
          input.setAttribute('aria-invalid', 'true');
          input.select();
          return;
        }
        this.closePopup();
        applyContext(this.core, id, v);
        this.refreshContext();
        this.focusEditor();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closePopup();
        btn.focus();
      }
    });
    this.root.append(el);
    this.fitInside(el);
    this.popup = { el, kind: 'length', owner: btn, close: () => undefined };
    this.focusField(input);
    input.setSelectionRange(0, 0);
  }

  /* ------------------------------------------------------------- keyboard */
  /** tab switching works wherever the focus is inside the widget: Alt+digit (Ctrl+digit on macOS), Alt+Left/Right */
  private onRootKeyDown = (e: KeyboardEvent): void => {
    if (this.root.classList.contains('wrs_handMode')) return;
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    const digit = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
    if (digit && ((e.altKey && !isMac && !e.ctrlKey) || (e.ctrlKey && isMac && !e.altKey))) {
      e.preventDefault();
      e.stopPropagation();
      const n = parseInt(digit[1], 10);
      if ((n === 0 || n === 10) && this.toolbar.ctxOff) return;
      this.selectTab(n === 0 ? 9 : n - 1, true);
      return;
    }
    if (e.altKey && !e.ctrlKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      e.stopPropagation();
      const t = this.toolbar.selected + (e.key === 'ArrowRight' ? 1 : -1) * (this.core.rtl ? -1 : 1);
      if (t >= 0 && t <= 9 && !(t === 9 && this.toolbar.ctxOff)) this.selectTab(t, true);
      else this.selectTab(this.toolbar.selected, true);
    }
  };

  private onKeyDown(e: KeyboardEvent): void {
    const mods = { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey };
    const host = { ed: this.core, runGeneral: (title: string) => this.runGeneral(title) };
    if (!(e.ctrlKey || e.metaKey) && e.key.length === 1) return; // text goes through the input event
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v'].includes(e.key.toLowerCase())) return; // clipboard events
    if (handleKey(host, e.key, mods)) {
      e.preventDefault();
      this.display.poke();
    }
  }

  private runGeneral(title: string): void {
    const c = findControl(0, 0, title);
    if (c) this.core.activate(c);
  }

  private onInput(): void {
    const input = this.display.input;
    const v = input.value;
    if (!v) return;
    input.value = '';
    this.core.typeText(v);
  }

  private onFocus(on: boolean): void {
    this.focused = on;
    if (on) {
      this.display.startBlink();
      this.emitEv('focus', {});
    } else {
      this.display.stopBlink();
      this.emitEv('blur', {});
      // keep the formula; caret hidden
    }
    this.display.renderOverlay({ caret: this.core.caret, sel: this.core.sel, focused: on, rtl: this.core.rtl, showCaret: true });
    this.scheduleAccessible(true);
  }

  /* ---------------------------------------------------------------- mouse */
  private contentPoint(e: MouseEvent): { x: number; y: number } {
    return this.display.toContent(e.clientX, e.clientY);
  }

  private longPressedAt = 0;
  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    if (Date.now() - this.longPressedAt < 1200) {
      e.preventDefault();
      return;
    }
    this.closePopup();
    const p = this.contentPoint(e);
    const hit = this.display.hitTest(p.x, p.y);
    if (!hit) {
      this.wantKeyboard();
      this.focusEditor();
      e.preventDefault();
      return;
    }
    // Q-03: shift+click only moves the caret
    this.core.setCaret(hit);
    this.dragging = true;
    this.dragAnchor = hit;
    // a double tap re-renders the formula between the two taps, so the browser sends no dblclick: select from here
    if (e.detail === 2) {
      this.core.selectRun(hit);
      this.lastDblAt = Date.now();
    }
    this.wantKeyboard();
    this.focusEditor();
    e.preventDefault();
  }

  /** a tap on the formula is the one thing that brings the phone's keyboard up */
  private wantKeyboard(): void {
    const input = this.display.input;
    if (input.inputMode !== 'none') return;
    input.inputMode = 'text';
    this.navKeyboard?.setAttribute('aria-pressed', 'true');
    this.navKeyboard?.classList.add('wrs_navOn');
    // the mode counts when the field is focused (again)
    input.blur();
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.dragging || !this.dragAnchor) return;
    const p = this.contentPoint(e);
    const hit = this.display.hitTest(p.x, p.y);
    if (hit) this.core.selectRange(this.dragAnchor as any, hit);
  };

  private onMouseUp = (): void => {
    this.dragging = false;
  };

  private lastDblAt = 0;

  private onDblClick(e: MouseEvent): void {
    if (Date.now() - this.lastDblAt < 600) return; // already selected by the second mouse press
    const p = this.contentPoint(e);
    const hit = this.display.hitTest(p.x, p.y);
    if (!hit) return;
    this.core.selectRun(hit);
    this.focusEditor();
  }

  /* ------------------------------------------------------------ clipboard */
  private selectionMathML(): string {
    const c = this.core;
    if (!c.hasSelection()) return '';
    return c.selectionMathML();
  }

  private writeClipboard(mml: string, ev?: ClipboardEvent): void {
    const html = `<span class="wrs_mathml">${mml}</span>`;
    if (ev && ev.clipboardData) {
      ev.clipboardData.setData('text/plain', mml);
      ev.clipboardData.setData('text/html', html);
      try {
        ev.clipboardData.setData('application/mathml+xml', mml);
      } catch {
        /* optional */
      }
      return;
    }
    const ta = this.clipboardArea;
    ta.value = mml;
    ta.readOnly = false;
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.readOnly = true;
    if (!ok && navigator.clipboard) void navigator.clipboard.writeText(mml).catch(() => undefined);
  }

  private onCopy(e: ClipboardEvent, cut: boolean): void {
    if (!this.core.hasSelection()) return;
    e.preventDefault();
    this.writeClipboard(this.selectionMathML(), e);
    if (cut) this.core.backspace();
  }

  private copySelection(cut: boolean): void {
    if (!this.core.hasSelection()) return;
    this.writeClipboard(this.selectionMathML());
    if (cut) this.core.backspace();
  }

  private pasteButton(): void {
    // Q-02: the toolbar paste button has no visible effect in exact parity (tooltip: press Ctrl+V)
    if (this.opts.parity === 'improved' && navigator.clipboard?.readText) {
      void navigator.clipboard.readText().then((t) => this.pasteText(t)).catch(() => undefined);
    }
  }

  private onPaste(e: ClipboardEvent): void {
    e.preventDefault();
    const cd = e.clipboardData;
    if (!cd) return;
    const mml = cd.getData('application/mathml+xml');
    const text = mml || cd.getData('text/plain') || cd.getData('text/html');
    void this.pasteText(text);
  }

  async pasteText(raw: string): Promise<void> {
    const t = raw.trim();
    if (!t) return;
    const core = this.core;
    const m = /<math[\s>/][\s\S]*<\/math>|<math[^>]*\/>/.exec(t);
    if (m) {
      try {
        core.insertMathML(m[0]);
        return;
      } catch {
        /* fall through to text */
      }
    }
    if (/\\[A-Za-z]+|[\^_]\{|\{.*\}|\\\\/.test(t) || /^\$.*\$$/.test(t)) {
      try {
        const out = await this.services.fromLatex(t.replace(/^\$+|\$+$/g, ''));
        core.insertMathML(out);
        return;
      } catch {
        /* plain text */
      }
    }
    core.typeText(t);
  }

  /* --------------------------------------------------------- accessibility */
  private announceCaret(): void {
    if (!this.focused) return;
    const txt = this.core.describeCaret();
    if (txt !== (this.display.live as any)._last) {
      (this.display.live as any)._last = txt;
      this.display.live.textContent = txt;
    }
  }

  private scheduleAccessible(force = false): void {
    if (this.accessibleTimer) clearTimeout(this.accessibleTimer);
    this.accessibleTimer = setTimeout(() => {
      const mml = this.core.getMathML();
      if (!force && mml === this.lastAccessible) return;
      this.lastAccessible = mml;
      void this.services
        .accessible(mml, this.lang)
        .then((txt) => {
          this.display.view.setAttribute('aria-description', txt);
          this.display.input.setAttribute('aria-label', 'Math input');
          this.display.view.dataset.accessible = txt;
        })
        .catch(() => undefined);
    }, 260);
  }

  /* ------------------------------------------------------------ handwriting */
  openHand(): void {
    this.closePopup();
    this.root.classList.add('wrs_handMode');
    this.services.warmUp();
    this.hand.open(this.core.getMathML());
    this.emitEv('handstart', {});
  }

  /** the recognised formula is the document while handwriting is open */
  applyRecognized(mml: string): void {
    try {
      this.core.setMathML(mml);
    } catch {
      /* ignore malformed recognition results */
    }
  }

  closeHand(mml?: string): void {
    this.root.classList.remove('wrs_handMode');
    if (mml) {
      try {
        this.core.setMathML(mml);
        this.core.clearHistory();
      } catch {
        /* keep */
      }
    }
    this.render();
    this.focusEditor();
    this.emitEv('handend', {});
  }

  /* ----------------------------------------------------------- public API */
  getMathML(o: { semantics?: boolean; annotations?: boolean } = {}): string {
    const base = this.core.getMathML();
    if (!o.semantics) return base;
    let tex: string;
    try {
      tex = mathml2latex(base);
    } catch {
      return base; // a formula LaTeX cannot express: no annotation
    }
    return base.replace(/>(.*)<\/math>$/, (_m, inner) => `><semantics><mrow>${inner}</mrow><annotation encoding="application/x-tex">${tex.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</annotation></semantics></math>`);
  }

  async setMathML(mml: string, o: { focus?: boolean } = {}): Promise<void> {
    this.core.setMathML(mml || EMPTY);
    this.lastMml = this.core.getMathML();
    if (o.focus) this.focusEditor();
  }

  isEmpty(): boolean {
    return this.core.isEmpty();
  }
  isFormulaEmpty(): boolean {
    return this.isEmpty();
  }
  /** true while the handwriting mode is displayed */
  isHandOpen(): boolean {
    return this.root.classList.contains('wrs_handMode');
  }
  isReady(): boolean {
    return this.ready;
  }
  focus(): void {
    this.focusEditor();
  }
  blur(): void {
    this.display.input.blur();
  }
  undo(): void {
    this.core.undo();
  }
  redo(): void {
    this.core.redo();
  }
  reset(): void {
    this.core.reset();
  }
  getVersion(): string {
    return VERSION;
  }
  setParams(p: Partial<EditorOptions>): void {
    Object.assign(this.opts, p);
    if (p.parity) this.core.parity = p.parity;
    if (p.autoformat !== undefined) this.core.autoformat = !!p.autoformat;
  }
  async getLaTeX(o: { signal?: AbortSignal } = {}): Promise<string> {
    return this.services.latex(this.core.getMathML(), o.signal);
  }
  async getAccessibleText(lang?: string, o: { signal?: AbortSignal } = {}): Promise<string> {
    return this.services.accessible(this.core.getMathML(), lang ?? this.lang, o.signal);
  }
  getPlainText(): string {
    return this.core.plainText();
  }
  async getSVG(o: { zoom?: number; background?: string; color?: string; fontSize?: string; signal?: AbortSignal } = {}): Promise<string> {
    const r = await this.services.render(this.core.getMathML(), 'svg', o);
    return r.body.text();
  }
  async getPDF(o: { zoom?: number; background?: string; color?: string; fontSize?: string; signal?: AbortSignal } = {}): Promise<Blob> {
    return (await this.services.render(this.core.getMathML(), 'pdf', o)).body;
  }
  async getEPS(o: { zoom?: number; background?: string; color?: string; fontSize?: string; signal?: AbortSignal } = {}): Promise<Blob> {
    return (await this.services.render(this.core.getMathML(), 'eps', o)).body;
  }
  async getPNG(o: { zoom?: number; dpi?: number; background?: string; color?: string; fontSize?: string; signal?: AbortSignal } = {}): Promise<Blob> {
    return (await this.services.render(this.core.getMathML(), 'png', o)).body;
  }
  async getImageDataURL(format: 'svg' | 'png', o: any = {}): Promise<string> {
    if (format === 'svg') return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(await this.getSVG(o));
    const b = await this.getPNG(o);
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(r.error);
      r.readAsDataURL(b);
    });
  }

  on(ev: Ev, cb: (e: any) => void): () => void {
    let s = this.listeners.get(ev);
    if (!s) this.listeners.set(ev, (s = new Set()));
    s.add(cb);
    return () => s!.delete(cb);
  }
  private emitEv(ev: Ev, payload: any): void {
    this.listeners.get(ev)?.forEach((f) => {
      try {
        f(payload);
      } catch (err) {
        console.error(err);
      }
    });
  }
}


/** the entry point: MathTypeX.JsEditor.newInstance(...) */
export const JsEditor = { newInstance: (o: EditorOptions = {}) => MathEditor.newInstance(o) };
void serializeMathML;
void parseMathML;
void controlIcon;
