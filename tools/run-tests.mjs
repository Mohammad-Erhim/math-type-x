// Bundle tests with esbuild and run them with the Node test runner.
import { build } from 'esbuild';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const dir = new URL('../tests/', import.meta.url).pathname;
const only = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith('.test.ts') && (!only.length || only.some((o) => f.includes(o))));
if (!files.length) { console.error('no tests'); process.exit(1); }
await build({
  entryPoints: files.map((f) => dir + f),
  outdir: new URL('../.build/tests/', import.meta.url).pathname,
  bundle: true, platform: 'node', format: 'esm', target: 'node22', sourcemap: 'inline', logLevel: 'warning',
  outExtension: { '.js': '.mjs' }, external: ['playwright', '@resvg/resvg-js', 'harfbuzzjs'],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
const out = files.map((f) => new URL('../.build/tests/' + f.replace(/\.ts$/, '.mjs'), import.meta.url).pathname);
const r = spawnSync('node', ['--test', '--test-reporter=spec', ...out], { stdio: 'inherit' });
process.exit(r.status ?? 1);
