/** Entry point: starts the HTTP server (bundled to dist/server.mjs). */
import { createApp, loadConfig } from './index';
import { recognize } from '../src/hand/recognize';

const cfg = loadConfig();
createApp(cfg).listen(cfg.port, cfg.host, () => {
  console.log(JSON.stringify({ msg: 'listening', port: cfg.port, base: cfg.base, static: cfg.staticDir }));
  // the first recognition builds the template tables (1–3 s): do it now so the first stroke of a user is answered at once
  setTimeout(() => recognize({ x: [[10, 40, 70], [40, 40, 40]], y: [[10, 40, 70], [70, 40, 10]] }), 0);
});
