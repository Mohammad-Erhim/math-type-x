import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp, loadConfig } from '../server/index';

let srv: Server;
let base = '';

before(async () => {
  process.env.LOG = 'off';
  const cfg = { ...loadConfig(), port: 0, host: '127.0.0.1', rateLimit: 10_000 };
  srv = createApp(cfg).listen(0, '127.0.0.1');
  await new Promise((r) => srv.once('listening', r));
  base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/editor-services/`;
});
after(() => {
  srv.closeAllConnections();
  srv.close();
});

const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const post = (name: string, body: Record<string, string>, q = '') =>
  fetch(base + name + q, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });

test('mathml2accessible', async () => {
  const r = await post('mathml2accessible', { mml: `<math ${NS}><mfrac><mi>a</mi><mi>b</mi></mfrac></math>`, lang: 'en' });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type') ?? '', /text\/plain/);
  assert.equal(await r.text(), 'a over b');
});

test('empty formula is "blank"', async () => {
  const r = await post('mathml2accessible', { mml: `<math ${NS}/>` });
  assert.equal(await r.text(), 'blank');
});

test('latex round trip', async () => {
  const mml = await (await post('latex2mathml', { latex: '\\frac{a}{b}+x^2' })).text();
  assert.match(mml, /<mfrac><mi>a<\/mi><mi>b<\/mi><\/mfrac>/);
  const tex = await (await post('mathml2latex', { mml })).text();
  assert.equal(tex, '\\frac ab+x^2');
});

test('content MathML', async () => {
  const c = await (await post('mathml2content', { mml: `<math ${NS}><mi>x</mi><mo>+</mo><mn>1</mn></math>` })).text();
  assert.match(c, /<apply><plus\/><ci>x<\/ci><cn>1<\/cn><\/apply>/);
});

test('render.png has a baseline header and a PNG body', async () => {
  const r = await post('render.png', { mml: `<math ${NS}><msqrt><mi>x</mi></msqrt></math>`, zoom: '2' });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  assert.ok(Number(r.headers.get('x-baseline')) > 0);
  const b = Buffer.from(await r.arrayBuffer());
  assert.equal(b.subarray(1, 4).toString(), 'PNG');
});

test('render.svg / pdf / eps', async () => {
  const mml = `<math ${NS}><mn>1</mn></math>`;
  assert.match(await (await post('render.svg', { mml })).text(), /^<svg /);
  assert.equal(Buffer.from(await (await post('render.pdf', { mml })).arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
  assert.match(await (await post('render.eps', { mml })).text(), /^%!PS-Adobe/);
});

test('hand/recognize answers with the documented JSON', async () => {
  const r = await fetch(base + 'hand/recognize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ x: [[10, 10, 10], [0, 20]], y: [[0, 20, 40], [20, 20]] }) });
  const j = (await r.json()) as { result: { mathml: string; score: number }; status: string };
  assert.equal(j.status, 'ok');
  assert.match(j.result.mathml, /^<math/);
});

test('errors: HTTP 200 with the message unless httpstatus=true', async () => {
  const a = await post('mathml2accessible', { mml: '<math><foo' });
  assert.equal(a.status, 200);
  assert.match(await a.text(), /^Error:/);
  const b = await post('mathml2accessible', { mml: '<math><foo' }, '?httpstatus=true');
  assert.equal(b.status, 400);
  assert.equal((await post('nope', {})).status, 200);
  assert.equal((await post('nope', {}, '?httpstatus=true')).status, 404);
});

test('DOCTYPE / entities are rejected', async () => {
  const r = await post('mathml2accessible', { mml: '<!DOCTYPE math [<!ENTITY x "y">]><math><mi>&x;</mi></math>' }, '?httpstatus=true');
  assert.equal(r.status, 400);
});

test('CORS and security headers', async () => {
  const r = await fetch(base + 'mathml2accessible', { method: 'OPTIONS', headers: { origin: 'https://example.org' } });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  const g = await fetch(base + 'mathml2latex?mml=' + encodeURIComponent(`<math ${NS}><mi>x</mi></math>`));
  assert.equal(g.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await g.text(), 'x');
});

test('body limit', async () => {
  const r = await post('mathml2accessible', { mml: '<math>' + 'x'.repeat(1_100_000) + '</math>' });
  assert.equal(r.status, 413);
});
