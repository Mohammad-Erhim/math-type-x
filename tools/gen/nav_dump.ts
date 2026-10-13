// caret stops of the engine (Home, then ArrowRight until the end): node .build/nav_dump.cjs '<mml>'
import { EditorCore } from '../../src/core/engine';
const mml = process.argv[2];
const e = new EditorCore();
e.setMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${mml}</math>`);
e.home();
const seen: string[] = [];
for (let i = 0; i < 40; i++) {
  seen.push(JSON.stringify(e.caret.path) + '#' + e.caret.index);
  const before = seen[seen.length - 1];
  e.moveRight();
  if (JSON.stringify(e.caret.path) + '#' + e.caret.index === before) break;
}
console.log(seen.join('\n'));
console.log(e.getMathML().replace(/ xmlns="[^"]*"/, ''));
