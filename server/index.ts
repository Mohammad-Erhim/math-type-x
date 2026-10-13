/**
 * HTTP server: editor services (SVC-001…011) and static hosting of the demo page.
 * Node ≥ 22, no framework: http + the shared converters.
 */
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { mathml2accessible } from '../src/convert/speech';
import { mathml2latex } from '../src/convert/tex';
import { latex2mathml } from '../src/convert/latex';
import { mathml2content, content2mathml } from '../src/convert/content';
import { accessible2mathml } from '../src/convert/accessible';
import { recognize } from '../src/hand/recognize';
import { parseMathML } from '../src/core/mathml';
import { renderSvg, renderPng, renderRaster, safeColor } from './render';
import { rgbaToPdf, rgbaToEps } from './pdf';

const env = process.env;
export interface Config {
  port: number;
  host: string;
  base: string;
  staticDir: string;
  corsOrigins: string[];
  rateLimit: number;
  maxBody: number;
  /** extra origins the page may load fonts from (the reference symbol fonts) */
  fontSrc: string;
}
export function loadConfig(): Config {
  return {
    port: Number(env.PORT ?? 8080),
    host: env.HOST ?? '0.0.0.0',
    base: '/' + (env.SERVICES_BASE ?? '/editor-services/').replace(/^\/+|\/+$/g, '') + '/',
    staticDir: resolve(env.STATIC_DIR ?? 'dist/public'),
    corsOrigins: (env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim()).filter(Boolean),
    rateLimit: Number(env.RATE_LIMIT ?? 120),
    maxBody: Number(env.MAX_BODY ?? 1_048_576),
    fontSrc: env.FONT_SRC ?? 'https://www.wiris.net',
  };
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

class HttpError extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

async function readBody(req: IncomingMessage, max: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let n = 0;
  for await (const c of req) {
    n += (c as Buffer).length;
    if (n > max) throw new HttpError(413, 'payload too large');
    chunks.push(c as Buffer);
  }
  return Buffer.concat(chunks);
}

function parseParams(url: URL, body: Buffer, ctype: string): Record<string, string> {
  const out: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (out[k] = v));
  if (body.length) {
    const text = body.toString('utf8');
    if (ctype.includes('application/json')) {
      let j: unknown;
      try {
        j = JSON.parse(text);
      } catch {
        throw new HttpError(400, 'invalid JSON');
      }
      if (j && typeof j === 'object') {
        for (const [k, v] of Object.entries(j as Record<string, unknown>)) out[k] = typeof v === 'string' ? v : JSON.stringify(v);
      }
    } else if (ctype.includes('application/x-www-form-urlencoded') || !ctype) {
      new URLSearchParams(text).forEach((v, k) => (out[k] = v));
    } else if (text.trimStart().startsWith('<')) {
      out.mml = text;
    } else out.latex = text;
  }
  return out;
}

const buckets = new Map<string, { n: number; t: number }>();
function limited(ip: string, limit: number): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now - b.t > 60_000) {
    buckets.set(ip, { n: 1, t: now });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (now - v.t > 60_000) buckets.delete(k);
    return false;
  }
  b.n++;
  return b.n > limit;
}

const EMPTY = '<math xmlns="http://www.w3.org/1998/Math/MathML"/>';
const NUMBER = /^-?\d+(\.\d+)?$/;
const num = (s: string | undefined, d: number, lo: number, hi: number) => {
  if (s === undefined || !NUMBER.test(s)) return d;
  return Math.min(hi, Math.max(lo, Number(s)));
};

function mmlOf(p: Record<string, string>): string {
  if (p.mml !== undefined) {
    const m = p.mml.trim();
    if (!m) return EMPTY;
    try {
      parseMathML(m); // validates (throws on malformed / forbidden input)
    } catch (e) {
      throw new HttpError(400, 'invalid MathML: ' + (e as Error).message);
    }
    return m;
  }
  if (p.latex !== undefined) {
    const out = latex2mathml(p.latex);
    if (out.startsWith('Error')) throw new HttpError(400, out);
    return out;
  }
  throw new HttpError(400, 'missing parameter: mml');
}

interface Reply {
  status?: number;
  type: string;
  body: string | Buffer;
  headers?: Record<string, string>;
}
const text = (body: string): Reply => ({ type: 'text/plain; charset=UTF-8', body });

function handleService(name: string, p: Record<string, string>): Reply {
  switch (name) {
    case 'mathml2accessible': {
      const m = mmlOf(p);
      try {
        return text(mathml2accessible(m, p.lang) || 'blank');
      } catch (e) {
        if (e instanceof HttpError) throw e;
        return text('Error converting from MathML to accessible text.');
      }
    }
    case 'accessible2mathml':
      if (p.accessible === undefined) throw new HttpError(400, 'missing parameter: accessible');
      return text(accessible2mathml(p.accessible, p.lang));
    case 'latex2mathml': {
      if (p.latex === undefined) throw new HttpError(400, 'missing parameter: latex');
      const out = latex2mathml(p.latex);
      if (out.startsWith('Error')) throw new HttpError(400, out);
      return text(out);
    }
    case 'mathml2latex':
      try {
        return text(mathml2latex(mmlOf(p)));
      } catch (e) {
        // a formula the service cannot write is answered like the reference does: with a message, not a failure
        if (e instanceof HttpError) throw e;
        return text('Error converting from MathML to LaTeX');
      }
    case 'mathml2content': {
      const out = mathml2content(mmlOf(p));
      if (out.startsWith('Error')) throw new HttpError(422, out);
      return text(out);
    }
    case 'content2mathml': {
      if (p.mml === undefined) throw new HttpError(400, 'missing parameter: mml');
      const out = content2mathml(p.mml);
      if (out.startsWith('Error')) throw new HttpError(422, out);
      return text(out);
    }
    case 'hand/recognize': {
      const raw = p.input ?? (p.x !== undefined ? JSON.stringify({ x: JSON.parse(p.x), y: JSON.parse(p.y ?? '[]') }) : undefined);
      if (raw === undefined) throw new HttpError(400, 'missing strokes');
      let j: { x?: number[][]; y?: number[][] };
      try {
        j = JSON.parse(raw);
      } catch {
        throw new HttpError(400, 'invalid strokes');
      }
      if (!Array.isArray(j.x) || !Array.isArray(j.y) || j.x.length > 200) throw new HttpError(400, 'invalid strokes');
      const r = recognize({ x: j.x, y: j.y });
      return { type: 'application/json; charset=UTF-8', body: JSON.stringify({ result: r, status: 'ok' }) };
    }
    case 'tick':
      return text('ok');
  }
  const m = /^render(?:\.(svg|png|pdf|eps))?$/.exec(name);
  if (m) {
    const fmt = (m[1] ?? p.format ?? 'png').toLowerCase();
    const mml = mmlOf(p);
    const o = {
      zoom: num(p.zoom, 1, 0.25, 8),
      dpi: num(p.dpi, 96, 36, 600),
      fontSize: num(p.fontSize, 16, 4, 128),
      color: p.color ? safeColor(p.color, '#000000') : undefined,
      background: p.backgroundColor ?? p.background,
    };
    if (fmt === 'svg') {
      const r = renderSvg(mml, o);
      return { type: 'image/svg+xml; charset=UTF-8', body: r.svg, headers: { 'X-Baseline': String(r.baseline), 'Access-Control-Expose-Headers': 'X-Baseline' } };
    }
    if (fmt === 'png') {
      const r = renderPng(mml, o);
      return { type: 'image/png', body: r.png, headers: { 'X-Baseline': String(r.baseline), 'Access-Control-Expose-Headers': 'X-Baseline' } };
    }
    if (fmt === 'pdf' || fmt === 'eps') {
      const r = renderRaster(mml, o);
      const body = fmt === 'pdf' ? rgbaToPdf(r.rgba, r.width, r.height, r.ptW, r.ptH) : rgbaToEps(r.rgba, r.width, r.height, r.ptW, r.ptH, safeColor(o.background, '#ffffff'));
      return { type: fmt === 'pdf' ? 'application/pdf' : 'application/postscript', body, headers: { 'X-Baseline': String(r.baseline) } };
    }
    throw new HttpError(400, 'unsupported format');
  }
  throw new HttpError(404, 'unknown service: ' + name);
}

export function createApp(cfg: Config) {
  const staticRoot = cfg.staticDir;
  const fontSrc = cfg.fontSrc;
  return createServer(async (req, res) => {
    const t0 = Date.now();
    let status = 500;
    let bytes = 0;
    const url = new URL(req.url ?? '/', 'http://localhost');
    const origin = req.headers.origin;
    const send = (st: number, type: string, body: string | Buffer, headers: Record<string, string> = {}) => {
      status = st;
      const buf = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
      bytes = buf.length;
      res.writeHead(st, {
        'Content-Type': type,
        'Content-Length': buf.length,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        ...headers,
      });
      res.end(req.method === 'HEAD' ? undefined : buf);
    };
    const cors: Record<string, string> = {};
    if (origin && (cfg.corsOrigins.includes('*') || cfg.corsOrigins.includes(origin))) {
      cors['Access-Control-Allow-Origin'] = cfg.corsOrigins.includes('*') ? '*' : origin;
      cors['Vary'] = 'Origin';
      cors['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      cors['Access-Control-Allow-Headers'] = 'Content-Type, X-Requested-With';
      cors['Access-Control-Expose-Headers'] = 'X-Baseline';
      cors['Access-Control-Max-Age'] = '600';
    }
    try {
      if (req.method === 'OPTIONS') return send(204, 'text/plain', '', cors);
      if (url.pathname === '/healthz') return send(200, 'text/plain', 'ok');
      if (url.pathname.startsWith(cfg.base)) {
        if (req.method !== 'GET' && req.method !== 'POST') throw new HttpError(405, 'method not allowed');
        const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
        if (limited(ip, cfg.rateLimit)) throw new HttpError(429, 'rate limit exceeded');
        const body = req.method === 'POST' ? await readBody(req, cfg.maxBody) : Buffer.alloc(0);
        const params = parseParams(url, body, String(req.headers['content-type'] ?? ''));
        const name = url.pathname.slice(cfg.base.length);
        const r = handleService(name, params);
        return send(r.status ?? 200, r.type, r.body, { 'Cache-Control': 'no-store', ...cors, ...(r.headers ?? {}) });
      }
      // static
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method not allowed');
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = normalize(join(staticRoot, rel));
      if (file !== staticRoot && !file.startsWith(staticRoot + sep)) throw new HttpError(403, 'forbidden');
      const st = await stat(file).catch(() => null);
      if (!st || !st.isFile()) throw new HttpError(404, 'not found');
      const data = await readFile(file);
      const type = MIME[extname(file)] ?? 'application/octet-stream';
      return send(200, type, data, {
        'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600',
        'Content-Security-Policy': `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' ${fontSrc}; frame-ancestors 'self'`,
      });
    } catch (e) {
      const he = e instanceof HttpError ? e : new HttpError(500, 'internal error');
      if (!(e instanceof HttpError)) console.error(JSON.stringify({ level: 'error', msg: (e as Error).message }));
      const strict = url.searchParams.get('httpstatus') === 'true';
      const isService = url.pathname.startsWith(cfg.base);
      // reference behaviour: services answer 200 with the error text unless httpstatus=true
      if (isService && !strict && he.status !== 429 && he.status !== 413) send(200, 'text/plain; charset=UTF-8', 'Error: ' + he.message, cors);
      else send(he.status, 'text/plain; charset=UTF-8', he.message, cors);
    } finally {
      if (env.LOG !== 'off') console.log(JSON.stringify({ t: new Date().toISOString(), m: req.method, p: url.pathname, s: status, ms: Date.now() - t0, b: bytes }));
    }
  });
}
