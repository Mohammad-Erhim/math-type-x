// Ask the reference recogniser (https://www.wiris.net/demo/hand/recognize) about every sample of a corpus.
// node tools/gen/hand_oracle.mjs in.json out.json
import fs from 'node:fs';
const inp = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outFile = process.argv[3];
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const rid = (n = 10) => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join('');
const todo = inp.filter((s) => !(s.name in out));
console.log('samples', inp.length, 'todo', todo.length);
const post = async (s) => {
  const input = JSON.stringify({ x: s.x, y: s.y, t: s.t, version: '2.0.0' });
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch('https://www.wiris.net/demo/hand/recognize?httpstatus=true', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', origin: 'https://www.wiris.com', referer: 'https://www.wiris.com/' },
        body: new URLSearchParams({ input, s: rid(), r: rid(), 'wrs-license': 'null', 'wrs-deployment': 'mathtype-web-hand-java', 'wrs-cause': 'math_hand_recognition' }),
      });
      return await r.json();
    } catch (e) { await new Promise((r) => setTimeout(r, 700)); }
  }
  return null;
};
let n = 0;
const worker = async () => {
  while (todo.length) {
    const s = todo.pop();
    const r = await post(s);
    out[s.name] = { mml: s.mml, ref: r && r.result ? r.result.mathml : null, score: r && r.result ? r.result.score : null, status: r && r.status };
    if (++n % 50 === 0) fs.writeFileSync(outFile, JSON.stringify(out));
  }
};
await Promise.all([worker(), worker(), worker()]);
fs.writeFileSync(outFile, JSON.stringify(out));
console.log('done', Object.keys(out).length);
