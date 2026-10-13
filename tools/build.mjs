// Bundles the browser editor (dist/public/editor.js) and the server (dist/server.mjs).
import { build } from 'esbuild';
import { cpSync, mkdirSync, copyFileSync, rmSync, renameSync, existsSync } from 'node:fs';

const OUT = 'dist-build';

const prod = process.argv.includes('--prod');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/public/fonts`, { recursive: true });
cpSync('public', `${OUT}/public`, { recursive: true });
copyFileSync('node_modules/@fontsource/stix-two-math/files/stix-two-math-latin-400-normal.woff2', `${OUT}/public/fonts/stix-two-math.woff2`);

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
if (existsSync('dist')) renameSync('dist', 'dist-old');
renameSync(OUT, 'dist');
rmSync('dist-old', { recursive: true, force: true });
