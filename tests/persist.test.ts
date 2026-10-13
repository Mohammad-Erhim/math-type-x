import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitize, Store } from '../src/ui/persist';

const MML = '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math>';

function fakeStorage(init: Record<string, string> = {}, full = false) {
  const m = new Map(Object.entries(init));
  (globalThis as any).localStorage = {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => {
      if (full) throw new Error('QuotaExceededError');
      m.set(k, v);
    },
    removeItem: (k: string) => void m.delete(k),
  };
  return m;
}

test('a saved record keeps only values of the right shape', () => {
  assert.equal(sanitize(null), null);
  assert.equal(sanitize({ v: 2, mml: MML }), null, 'unknown version');
  assert.deepEqual(sanitize({ v: 1, mml: MML, tab: 3, output: 'png', lang: 'ar', modes: { bold: true, digits: 'arabicIndic', color: '#FF0000' } }), {
    v: 1,
    lang: 'ar',
    mml: MML,
    tab: 3,
    output: 'png',
    modes: { bold: true, digits: 'arabicIndic', color: '#FF0000' },
  });
  const bad = sanitize({ v: 1, mml: '<script>alert(1)</script>', tab: 99, output: 'PNG<', modes: { bold: 'yes', digits: 'klingon', color: 'url(x)' } })!;
  assert.equal(bad.mml, undefined);
  assert.equal(bad.tab, undefined);
  assert.equal(bad.output, undefined);
  assert.deepEqual(bad.modes, {});
});

test('the store writes after a pause, flushes on demand and survives unreadable data', async () => {
  const m = fakeStorage({ k: '{not json' });
  const s = new Store('k');
  assert.equal(s.read(), null, 'garbage is ignored');
  s.set({ mml: MML, tab: 2 }, 10);
  s.set({ tab: 4 }, 10);
  assert.equal(m.get('k'), '{not json', 'nothing written while changes keep coming');
  await new Promise((r) => setTimeout(r, 40));
  assert.deepEqual(JSON.parse(m.get('k')!), { v: 1, mml: MML, tab: 4 });
  s.set({ output: 'latex' }, 10_000);
  s.flush();
  assert.equal(JSON.parse(m.get('k')!).output, 'latex');
  const again = new Store('k').read();
  assert.equal(again?.mml, MML);
  assert.equal(again?.output, 'latex');
});

test('a full or blocked storage never throws', () => {
  fakeStorage({}, true);
  const s = new Store('k');
  s.set({ mml: MML }, 0);
  assert.equal(s.ok, false);
  delete (globalThis as any).localStorage;
  assert.equal(new Store('k').read(), null);
});
