// Bundles the browser editor (dist/public/editor.js) and the server (dist/server.mjs).
import { build } from 'esbuild';
import { cpSync, mkdirSync, copyFileSync, rmSync, renameSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

// --out=<dir>: where the finished build goes (default dist)
const FINAL = (process.argv.find((a) => a.startsWith('--out=')) ?? '--out=dist').slice(6);
const OUT = `${FINAL}-build`;

const prod = process.argv.includes('--prod');
// --static: the browser files only (a static host; the editor then runs without the services)
const staticOnly = process.argv.includes('--static');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/public/fonts`, { recursive: true });
cpSync('public', `${OUT}/public`, { recursive: true });
// the script and style URLs of the page carry the build time: a new release is never served from a browser's cache
const indexFile = `${OUT}/public/index.html`;
writeFileSync(indexFile, readFileSync(indexFile, 'utf8').replace(/__BUILD__/g, String(Date.now())));
copyFileSync('node_modules/@fontsource/stix-two-math/files/stix-two-math-latin-400-normal.woff2', `${OUT}/public/fonts/stix-two-math.woff2`);
// the fonts of the PNG / PDF export in the browser (the server uses the same files)
for (const f of ['Regular', 'Bold', 'Italic', 'BoldItalic']) copyFileSync(`server/fonts/LiberationSans-${f}.ttf`, `${OUT}/public/fonts/LiberationSans-${f}.ttf`);
for (const f of ['Regular', 'Bold']) copyFileSync(`server/fonts/MtxArabic-${f}.ttf`, `${OUT}/public/fonts/MtxArabic-${f}.ttf`);

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: prod,
  sourcemap: !prod,
  outfile: `${OUT}/public/editor.js`,
  loader: { '.json': 'json' },
  logLevel: 'info',
});
// handwriting recognition off the main thread when there is no server
await build({
  entryPoints: ['src/hand/worker.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: prod,
  outfile: `${OUT}/public/hand-worker.js`,
  logLevel: 'info',
});
if (!staticOnly)
await build({
  entryPoints: ['server/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: `${OUT}/server.mjs`,
  external: ['@resvg/resvg-js'],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'info',
});

// swap the finished build into place (a running server keeps serving from dist/public)
if (existsSync(FINAL)) renameSync(FINAL, `${FINAL}-old`);
renameSync(OUT, FINAL);
rmSync(`${FINAL}-old`, { recursive: true, force: true });
