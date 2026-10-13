/** The static build: the services client falls back to the browser's own implementations when there is no server. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, inflateSync } from 'node:zlib';
import { Services } from '../src/ui/services';
import { renderSvg } from '../src/render/svg';
import { rgbaToPdf, rgbaToEps } from '../src/render/pdf';
import { facesFor } from '../src/render/client';

const MML = '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mi>a</mi><mn>2</mn></mfrac></math>';
const STROKES = { x: [[100, 140], [140, 100]], y: [[150, 210], [150, 210]] };

function withFetch(impl: (url: string) => Promise<Response>, fn: () => Promise<void>) {
  const prev = globalThis.fetch;
  globalThis.fetch = ((u: string) => impl(String(u))) as typeof fetch;
  return fn().finally(() => {
    globalThis.fetch = prev;
  });
}

test('without a server (404 from a static host) the images and the recogniser are local', async () => {
  let calls = 0;
  await withFetch(
    async () => {
      calls++;
      return new Response('', { status: 404 });
    },
    async () => {
      const s = new Services({ baseUrl: '/editor-services/' });
      const svg = await (await s.render(MML, 'svg')).body.text();
      assert.equal(svg, renderSvg(MML).svg);
      const r = await s.recognize(STROKES);
      assert.match(r.mathml, /^<math/);
      // the server is not asked again for a while
      const before = calls;
      await s.render(MML, 'svg');
      await s.recognize(STROKES);
      assert.equal(calls, before);
    },
  );
});

test('a network error falls back as well; a server error is not hidden', async () => {
  await withFetch(
    async () => {
      throw new TypeError('network');
    },
    async () => {
      const s = new Services({ baseUrl: '/x/' });
      assert.match(await (await s.render(MML, 'svg')).body.text(), /^<svg/);
    },
  );
  await withFetch(
    async () => new Response('boom', { status: 500 }),
    async () => {
      const s = new Services({ baseUrl: '/x/' });
      await assert.rejects(() => s.render(MML, 'svg'), /render 500|service 500/);
    },
  );
});

test('local: true never calls the network', async () => {
  await withFetch(
    async () => {
      throw new Error('network used');
    },
    async () => {
      const s = new Services({ baseUrl: '/x/', local: true });
      assert.match(await (await s.render(MML, 'svg', { zoom: 2 })).body.text(), /width="/);
      assert.ok((await s.recognize(STROKES)).score >= 0);
      assert.equal(await s.accessible(MML, 'en'), 'a over 2');
    },
  );
});

test('PDF and EPS writers give the same bytes with any deflate', async () => {
  const rgba = new Uint8Array(4 * 4 * 4).map((_, i) => (i * 37) % 256);
  const pdf = await rgbaToPdf(rgba, 4, 4, 3, 3, (d) => deflateSync(d));
  const text = Buffer.from(pdf).toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
  // the xref offsets point at the objects
  const xref = /startxref\n(\d+)/.exec(text)!;
  assert.equal(text.slice(+xref[1], +xref[1] + 4), 'xref');
  // the image streams inflate to the pixels
  const streams = [...text.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((m) => Buffer.from(m[1], 'latin1'));
  assert.equal(inflateSync(streams[1]).length, 4 * 4 * 3);
  const eps = Buffer.from(rgbaToEps(rgba, 4, 4, 3, 3)).toString('latin1');
  assert.ok(eps.startsWith('%!PS-Adobe-3.0 EPSF-3.0'));
  // CompressionStream (the browser's deflate) is zlib wrapped: PDF's FlateDecode reads it
  if (typeof CompressionStream !== 'undefined') {
    const viaStream = async (d: Uint8Array) => new Uint8Array(await new Response(new Blob([d as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
    const p2 = Buffer.from(await rgbaToPdf(rgba, 4, 4, 3, 3, viaStream)).toString('latin1');
    const s2 = [...p2.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((m) => Buffer.from(m[1], 'latin1'));
    assert.deepEqual(inflateSync(s2[1]), inflateSync(streams[1]));
  }
});

test('only the font faces an image uses are embedded', () => {
  const sansOnly = renderSvg('<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi><mn>1</mn></math>').svg;
  const f = facesFor(sansOnly).map((x) => `${x.family}/${x.weight}/${x.style}`);
  assert.deepEqual(f.sort(), ['Liberation Sans/400/italic', 'Liberation Sans/400/normal']);
  const withSign = renderSvg('<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi><mo>+</mo></math>').svg;
  assert.ok(facesFor(withSign).some((x) => x.family === 'STIX Two Math'));
});
