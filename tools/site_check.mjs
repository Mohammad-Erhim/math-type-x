// Checks the built website (dist-site): every page of the sitemap exists, one h1, a unique title, description and canonical of a good length,
// valid JSON-LD, and no broken internal link or image. Run after `npm run build:site`.
import { readFileSync, existsSync } from 'node:fs';
const root = 'dist-site';
const SITE_URL = (process.env.SITE_URL || 'https://mohammad-erhim.github.io/math-type-x').replace(/\/+$/, '');
const base = new URL(SITE_URL).pathname.replace(/\/+$/, '');
const sm = readFileSync(`${root}/sitemap.xml`, 'utf8');
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const toFile = (u) => { const p = new URL(u, 'https://x.test').pathname.replace(base, ''); return `${root}${p}${p.endsWith('/') ? 'index.html' : ''}`; };
let bad = 0;
const seen = new Set();
for (const u of urls) {
  const f = toFile(u);
  if (!existsSync(f)) { console.log('MISSING page', u); bad++; continue; }
  const h = readFileSync(f, 'utf8');
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const h1 = (h.match(/<h1[ >]/g) || []).length;
  const canon = (h.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let ldOk = true; for (const m of ld) { try { JSON.parse(m[1]); } catch { ldOk = false; } }
  const dupT = seen.has(title); seen.add(title);
  const warn = [];
  if (title.length > 70) warn.push('title ' + title.length);
  if (desc.length > 170 || desc.length < 70) warn.push('desc ' + desc.length);
  if (h1 !== 1 && !u.includes('/editor/')) warn.push('h1 x' + h1);
  if (h1 !== 1 && u.includes('/editor/')) warn.push('editor h1 x' + h1);
  if (canon !== u) warn.push('canonical ' + canon);
  if (!ldOk) warn.push('bad json-ld');
  if (dupT) warn.push('duplicate title');
  // links
  for (const m of h.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
    let l = m[1];
    if (/^(https?:|mailto:|data:)/.test(l)) continue;
    l = l.split('?')[0];
    if (!l.startsWith('/')) continue;
    const fp = `${root}${l.replace(base, '')}${l.endsWith('/') ? 'index.html' : ''}`;
    if (!existsSync(fp)) { warn.push('broken link ' + l); }
  }
  console.log((warn.length ? '!! ' : 'ok ') + u.replace(SITE_URL.replace(base, ''), '') + ' | t' + title.length + ' d' + desc.length + (warn.length ? ' | ' + warn.join('; ') : ''));
  bad += warn.length;
}
console.log('issues:', bad);
if (bad) process.exit(1);
