/** Typed services client with automatic offline fallback to the bundled converters (NFR-010). */
import { mathml2accessible as accessibleOf } from '../convert/speech';
import { mathml2latex as latexOf } from '../convert/tex';
import { latex2mathml } from '../convert/latex';
import { renderSvg, safeColor } from '../render/svg';
import { renderPngBlob, renderVector, getAssetsBase } from '../render/client';
import { recognize as recognizeHere } from '../hand/recognize';

export interface ServicesOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  telemetry?: boolean;
  /** use only the local implementation (no server at all) */
  local?: boolean;
  /** the hand-writing worker script (default: hand-worker.js next to editor.js) */
  workerUrl?: string;
}

/** a failed call that says the service itself is not there (no network, or a static host without the service) */
class Unavailable extends Error {}

/** after a failure the server is not tried again for this long (a static host answers 404 for every call) */
const RETRY_AFTER_MS = 60_000;

/** local conversion: formulas the service refuses give its error message */
function mathml2accessible(mml: string, lang?: string): string {
  try {
    return accessibleOf(mml, lang);
  } catch {
    return 'Error converting from MathML to accessible text.';
  }
}
function mathml2latex(mml: string): string {
  try {
    return latexOf(mml);
  } catch {
    return 'Error converting from MathML to LaTeX';
  }
}

export class Services {
  private pending = new Map<string, AbortController>();
  private downSince = 0;
  private worker: Worker | null | undefined;
  private waiting = new Map<number, { ok: (r: { mathml: string; score: number }) => void; fail: (e: Error) => void; input: { x: number[][]; y: number[][]; t?: number[][] } }>();
  private seq = 0;
  constructor(public opts: ServicesOptions) {}

  private get remoteOff(): boolean {
    return !!this.opts.local || (this.downSince > 0 && Date.now() - this.downSince < RETRY_AFTER_MS);
  }

  /** run a call against the server; throws Unavailable when there is none (and remembers that for a while) */
  private async remote<T>(call: () => Promise<Response>, read: (r: Response) => Promise<T>): Promise<T> {
    if (this.remoteOff) throw new Unavailable('local');
    let res: Response;
    try {
      res = await call();
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      this.downSince = Date.now();
      throw new Unavailable('network');
    }
    // 403 / 404 / 405 / 501: a static host without the services
    if (res.status === 403 || res.status === 404 || res.status === 405 || res.status === 501) {
      this.downSince = Date.now();
      throw new Unavailable('status ' + res.status);
    }
    if (!res.ok) throw new Error('service ' + res.status);
    this.downSince = 0;
    return read(res);
  }

  private async post(name: string, body: Record<string, string>, key = name, signal?: AbortSignal): Promise<string> {
    this.pending.get(key)?.abort();
    const ac = new AbortController();
    this.pending.set(key, ac);
    // the caller can cancel too (a newer formula makes this answer useless)
    if (signal) {
      if (signal.aborted) ac.abort();
      else signal.addEventListener('abort', () => ac.abort(), { once: true });
    }
    const base = this.opts.baseUrl.replace(/\/?$/, '/');
    return this.remote(
      () =>
        fetch(base + name + '?httpstatus=true', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded', ...(this.opts.headers ?? {}) },
          body: new URLSearchParams(body),
          signal: ac.signal,
        }),
      (res) => res.text(),
    );
  }

  async accessible(mml: string, lang: string, signal?: AbortSignal): Promise<string> {
    if (this.opts.local) return mathml2accessible(mml, lang);
    try {
      return await this.post('mathml2accessible', { mml, lang, 'wrs-cause': 'editor_screen_reader' }, 'mathml2accessible', signal);
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      return mathml2accessible(mml, lang);
    }
  }

  async latex(mml: string, signal?: AbortSignal): Promise<string> {
    if (this.opts.local) return mathml2latex(mml);
    try {
      return await this.post('mathml2latex', { mml }, 'mathml2latex', signal);
    } catch (e) {
      // cancelled by the caller: its answer is not wanted, no local conversion either
      if (signal?.aborted && (e as Error).name === 'AbortError') throw e;
      return mathml2latex(mml);
    }
  }

  async fromLatex(latex: string): Promise<string> {
    if (this.opts.local) return latex2mathml(latex);
    try {
      return await this.post('latex2mathml', { latex, pasteformat: 'auto', 'wrs-cause': 'paste' }, 'latex2mathml');
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      return latex2mathml(latex);
    }
  }

  async render(mml: string, format: 'svg' | 'png' | 'pdf' | 'eps', o: { zoom?: number; dpi?: number; background?: string; color?: string; fontSize?: string; signal?: AbortSignal } = {}): Promise<{ body: Blob; text?: string }> {
    const params: Record<string, string> = { mml, format };
    if (o.zoom) params.zoom = String(o.zoom);
    if (o.dpi) params.dpi = String(o.dpi);
    if (o.background) params.backgroundColor = o.background;
    if (o.color) params.color = o.color;
    if (o.fontSize) params.fontSize = o.fontSize;
    const base = this.opts.baseUrl.replace(/\/?$/, '/');
    try {
      const body = await this.remote(
        () => fetch(base + 'render.' + format, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', ...(this.opts.headers ?? {}) }, body: new URLSearchParams(params), signal: o.signal }),
        (r) => r.blob(),
      );
      return { body };
    } catch (e) {
      if (!(e instanceof Unavailable)) throw e;
    }
    return this.renderLocal(mml, format, o);
  }

  /** the same image as the server makes, produced in the browser */
  async renderLocal(mml: string, format: 'svg' | 'png' | 'pdf' | 'eps', o: { zoom?: number; dpi?: number; background?: string; color?: string; fontSize?: string }): Promise<{ body: Blob }> {
    const clamp = (v: string | number | undefined, d: number, lo: number, hi: number) => {
      const n = Number(v);
      return Number.isFinite(n) && v !== undefined && v !== '' ? Math.min(Math.max(n, lo), hi) : d;
    };
    const ro = {
      zoom: clamp(o.zoom, 1, 0.25, 8),
      dpi: clamp(o.dpi, 96, 36, 600),
      fontSize: clamp(o.fontSize, 16, 4, 128),
      color: o.color ? safeColor(o.color, '#000000') : undefined,
      background: o.background,
    };
    if (format === 'svg') return { body: new Blob([renderSvg(mml, ro).svg], { type: 'image/svg+xml;charset=UTF-8' }) };
    if (format === 'png') return { body: (await renderPngBlob(mml, ro)).blob };
    return { body: await renderVector(mml, format, ro) };
  }

  async recognize(strokes: { x: number[][]; y: number[][]; t?: number[][] }): Promise<{ mathml: string; score: number }> {
    const base = this.opts.baseUrl.replace(/\/?$/, '/');
    try {
      return await this.remote(
        () =>
          fetch(base + 'hand/recognize?httpstatus=true', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', ...(this.opts.headers ?? {}) },
            body: new URLSearchParams({ input: JSON.stringify(strokes) }),
          }),
        async (r) => ((await r.json()) as { result: { mathml: string; score: number } }).result,
      );
    } catch (e) {
      if (!(e instanceof Unavailable)) throw e;
    }
    return this.recognizeLocal(strokes);
  }

  /** the recogniser of the server, in a worker (or on the page when workers are not available) */
  recognizeLocal(strokes: { x: number[][]; y: number[][]; t?: number[][] }): Promise<{ mathml: string; score: number }> {
    const w = this.getWorker();
    if (!w) return Promise.resolve(recognizeHere(strokes));
    return new Promise((ok, fail) => {
      const id = ++this.seq;
      this.waiting.set(id, { ok, fail, input: strokes });
      w.postMessage({ id, input: strokes });
    });
  }

  /** starts the worker (and with it the template build) before the first stroke comes, when there is no server to ask */
  warmUp(): void {
    if (this.opts.local || this.downSince > 0) {
      this.getWorker();
      return;
    }
    const base = this.opts.baseUrl.replace(/\/?$/, '/');
    void this.remote(
      () => fetch(base + 'tick', { headers: this.opts.headers }),
      async () => true,
    ).catch((e) => {
      if (e instanceof Unavailable) this.getWorker();
    });
  }

  private getWorker(): Worker | null {
    if (this.worker !== undefined) return this.worker;
    this.worker = null;
    try {
      const url = this.opts.workerUrl ?? new URL('../hand-worker.js', getAssetsBase() || location.href).href;
      const w = new Worker(url);
      w.onmessage = (e: MessageEvent) => {
        const { id, result, error } = e.data as { id: number; result?: { mathml: string; score: number }; error?: string };
        const p = this.waiting.get(id);
        if (!p) return;
        this.waiting.delete(id);
        if (error) p.fail(new Error(error));
        else p.ok(result!);
      };
      // a worker that cannot start (file://, a blocked script): the page recognises by itself from now on
      w.onerror = () => {
        this.worker = null;
        w.terminate();
        for (const [id, p] of this.waiting) {
          this.waiting.delete(id);
          try {
            p.ok(recognizeHere(p.input));
          } catch (err) {
            p.fail(err as Error);
          }
        }
      };
      this.worker = w;
    } catch {
      this.worker = null;
    }
    return this.worker;
  }
}
