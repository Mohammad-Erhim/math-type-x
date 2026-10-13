/** Typed services client with automatic offline fallback to the bundled converters (NFR-010). */
import { mathml2accessible as accessibleOf } from '../convert/speech';
import { mathml2latex as latexOf } from '../convert/tex';
import { latex2mathml } from '../convert/latex';

export interface ServicesOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  telemetry?: boolean;
  /** use only the local implementation */
  local?: boolean;
}

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
  constructor(public opts: ServicesOptions) {}

  private async post(name: string, body: Record<string, string>, key = name): Promise<string> {
    this.pending.get(key)?.abort();
    const ac = new AbortController();
    this.pending.set(key, ac);
    const base = this.opts.baseUrl.replace(/\/?$/, '/');
    const res = await fetch(base + name + '?httpstatus=true', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', ...(this.opts.headers ?? {}) },
      body: new URLSearchParams(body),
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(name + ' ' + res.status);
    return res.text();
  }

  async accessible(mml: string, lang: string): Promise<string> {
    if (this.opts.local) return mathml2accessible(mml, lang);
    try {
      return await this.post('mathml2accessible', { mml, lang, 'wrs-cause': 'editor_screen_reader' });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      return mathml2accessible(mml, lang);
    }
  }

  async latex(mml: string): Promise<string> {
    if (this.opts.local) return mathml2latex(mml);
    try {
      return await this.post('mathml2latex', { mml });
    } catch {
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

  async render(mml: string, format: 'svg' | 'png', o: { zoom?: number; dpi?: number; background?: string; color?: string; fontSize?: string } = {}): Promise<{ body: Blob; text?: string }> {
    const params: Record<string, string> = { mml, format };
    if (o.zoom) params.zoom = String(o.zoom);
    if (o.dpi) params.dpi = String(o.dpi);
    if (o.background) params.backgroundColor = o.background;
    if (o.color) params.color = o.color;
    if (o.fontSize) params.fontSize = o.fontSize;
    const base = this.opts.baseUrl.replace(/\/?$/, '/');
    const res = await fetch(base + 'render.' + format, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', ...(this.opts.headers ?? {}) }, body: new URLSearchParams(params) });
    if (!res.ok) throw new Error('render ' + res.status);
    return { body: await res.blob() };
  }

  async recognize(strokes: { x: number[][]; y: number[][] }): Promise<{ mathml: string; score: number }> {
    const base = this.opts.baseUrl.replace(/\/?$/, '/');
    const res = await fetch(base + 'hand/recognize?httpstatus=true', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', ...(this.opts.headers ?? {}) },
      body: new URLSearchParams({ input: JSON.stringify(strokes) }),
    });
    if (!res.ok) throw new Error('recognize ' + res.status);
    const j = (await res.json()) as { result: { mathml: string; score: number }; status: string };
    return j.result;
  }
}
