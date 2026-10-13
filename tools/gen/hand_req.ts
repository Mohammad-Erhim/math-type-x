import { readFileSync } from 'node:fs';
import { recognize } from '../../src/hand/recognize';
const d = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { name: string; req: string; mathml: string }[];
for (const s of d) {
  const input = JSON.parse(decodeURIComponent(/input=([^&]*)/.exec(s.req)![1]));
  const t0 = Date.now();
  const r = recognize({ x: input.x, y: input.y, t: input.t });
  console.log(s.name.padEnd(8), 'ref', s.mathml.replace(/ xmlns="[^"]*"/, ''), '| ours', r.mathml.replace(/ xmlns="[^"]*"/, ''), r.score, Date.now() - t0, 'ms');
}
