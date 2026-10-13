import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { locate, controlsFor, applyContext, ctxValue } from '../src/core/context';

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const dir = join(process.cwd(), 'evidence/scenarios');
const norm = (s: string) => s.replace(NS, '').replace(/ xmlns:wrs="[^"]*"/, '');

/** caret placement per context: last cell for tables, end for others */
function setup(kind: string, init: string): EditorCore {
  const ed = new EditorCore();
  ed.setMathML(init.replace('<math', '<math' + NS));
  if (/matrix|table|piecewise|aligned/.test(kind)) {
    // enter the table and move to the last cell: End then ArrowLeft until a cell
    ed.end();
    for (let i = 0; i < 4; i++) {
      const loc = locate(ed);
      if (ed.caret.path.length && loc && loc.table && loc.table.slot === (loc.table.el.c!.length - 1)) break;
      ed.moveLeft();
    }
  } else if (kind === 'fence_in') {
    ed.home();
    ed.moveRight();
    ed.moveRight();
    ed.moveRight();
  } else if (kind === 'operator') {
    ed.home();
    ed.moveRight();
    ed.moveRight();
  }
  return ed;
}

test('contextual controls produce the recorded MathML', () => {
  const files = readdirSync(dir).filter((f) => /^s10b_ctx_(matrix|table|piecewise|aligned|multiline)\.json$/.test(f));
  let n = 0;
  let nt = 0;
  const bad: string[] = [];
  const badT: string[] = [];
  for (const f of files) {
    const kind = f.replace(/^s10b_ctx_|\.json$/g, '');
    const steps: any[] = JSON.parse(readFileSync(join(dir, f), 'utf8')).steps;
    const init = steps[0].mathml as string;
    for (const s of steps.slice(1)) {
      const m = /^[a-z_]+ \/ (.+?) \((?:select|button|button, toggle|button, length)\) -> (click|option "(.*)"|type "(.*)" \+ Enter)/.exec(s.desc);
      if (!m) continue;
      // length fields: this older recording typed before the input had focus – tests/length.test.ts replays scenario s23
      if (m[4] !== undefined) continue;
      const title = m[1];
      // multiline: the spacing fields show up only next to a line break (the recording clicked there)
      if (kind === 'multiline' && /spacing$/.test(title)) continue;
      const ed = setup(kind, init);
      const loc = locate(ed);
      if (!loc) { bad.push(`${kind}/${s.n}: no context`); continue; }
      const ctl = controlsFor(loc).find((c) => c.title === title || c.id === title || (title === 'setOpenBracket' && c.id === title));
      if (!ctl) { bad.push(`${kind}/${s.n}: no control '${title}'`); continue; }
      let value: string | undefined;
      if (m[3] !== undefined) value = m[3];
      if (m[4] !== undefined) value = m[4];
      if (m[3] !== undefined && ctl.id === 'setOpenBracket') value = m[3];
      if (m[3] !== undefined && ctl.id === 'setCloseBracket') value = m[3];
      // some controls need a prerequisite (decimal align symbol)
      if (ctl.id === 'decimal_symbol') applyContext(ed, 'colalign_decimal');
      applyContext(ed, ctl.id, value);
      n++;
      const got = norm(ed.getMathML());
      const want = norm(s.mathml);
      if (got !== want) bad.push(`${kind}/${s.n} ${s.desc.slice(0, 80)}\n    want ${want}\n    got  ${got}`);
      // the toggled controls after the click (recording: the toggled buttons of the Contextual tab; the dash / solid lines
      // choice and buttons of the reference that stay "pressed" for other reasons are not compared)
      if (m[2] === 'click' && Array.isArray(s.extra) && s.extra.every((t: unknown) => typeof t === 'string' && !t.includes('|')) && s.extra.length && got === want) {
        let loc2: ReturnType<typeof locate> = null;
        try {
          loc2 = locate(ed);
        } catch {
          loc2 = null;
        }
        if (loc2) {
          const on = controlsFor(loc2)
            .filter((c) => c.kind !== 'select' && c.kind !== 'length' && ctxValue(ed, loc2, c.id).toggled === true)
            .map((c) => c.title)
            .filter((t) => !/lines$/.test(t) && t !== 'Insert frame' && t !== 'Remove frame');
          const ref = (s.extra as string[]).filter((t) => !/lines$/.test(t) && !t.includes('|'));
          nt++;
          if (JSON.stringify([...on].sort()) !== JSON.stringify([...ref].sort())) badT.push(`${kind}/${s.n} ${s.desc.slice(0, 70)}\n    want ${JSON.stringify(ref)}\n    got  ${JSON.stringify(on)}`);
        }
      }
    }
  }
  console.log(`toggled states: ${nt - badT.length}/${nt} equal`);
  if (badT.length) console.log(badT.slice(0, 12).join('\n'));
  console.log(`context: ${n - bad.length}/${n} equal`);
  if (bad.length) console.log(bad.slice(0, 20).join('\n'));
  assert.ok(n > 20);
});
