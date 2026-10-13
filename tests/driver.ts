/** Executes probe programs (same DSL as tools/probe.js) against the headless engine. */
import { EditorCore } from '../src/core/engine';
import { handleKey } from '../src/core/keys';
import { catalogue, findControl } from '../src/core/catalogue';
import { DocGeometry } from '../src/layout/geometry';

export type Step = Record<string, any>;

export function newEditor(): EditorCore {
  return new EditorCore();
}

export function runProgram(steps: Step[], ed = new EditorCore()): string[] {
  ed.geometry = new DocGeometry(ed);
  const out: string[] = [];
  let tab = 0;
  let group = 0;
  const host = {
    ed,
    runGeneral(title: string) {
      const c = findControl(0, 0, title);
      if (c) ed.activate(c);
    },
  };
  for (const s of steps) {
    if (s.reset) ed.reset();
    else if (s.set !== undefined) ed.setMathML(s.set.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"'));
    else if (s.type !== undefined) {
      for (const ch of s.type) ed.typeChar(ch);
    } else if (s.text !== undefined) ed.typeText(s.text);
    else if (s.press !== undefined) {
      const parts = String(s.press).split('+');
      const key = parts.pop()!;
      const mods = { ctrl: parts.includes('Control'), alt: parts.includes('Alt'), shift: parts.includes('Shift'), meta: parts.includes('Meta') };
      for (let i = 0; i < (s.n || 1); i++) handleKey(host, key.length === 1 ? key : key, mods);
    } else if (s.tab !== undefined) {
      tab = s.tab;
      group = 0;
    } else if (s.more !== undefined) group = s.more + 1;
    else if (s.click !== undefined || s.item !== undefined) {
      const title = s.click ?? s.item;
      const c = findControl(tab, s.item !== undefined ? group : 0, title) ?? findControl(tab, 0, title);
      if (!c) throw new Error('control not found: ' + title + ' tab ' + tab);
      applyControl(ed, c);
      if (s.item !== undefined) group = 0;
    } else if (s.mml) out.push(ed.getMathML({ xmlns: false }));
  }
  return out;
}

function applyControl(ed: EditorCore, c: (typeof catalogue.controls)[number]) {
  if (c.special) {
    const t = c.title;
    if (/^Bold/.test(t)) ed.toggleBold();
    else if (/^Italic/.test(t)) ed.toggleItalic();
    else if (/^Automatic italic/.test(t)) ed.setAutoItalic(!ed.modes.autoItalic);
    else if (/^Regular text/.test(t)) ed.setRegularText(!ed.modes.text);
    else if (/^Undo/.test(t)) ed.undo();
    else if (/^Redo/.test(t)) ed.redo();
    return;
  }
  ed.activate(c);
}
