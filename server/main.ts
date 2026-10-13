/** Entry point: starts the HTTP server (bundled to dist/server.mjs). */
import { createApp, loadConfig } from './index';

const cfg = loadConfig();
createApp(cfg).listen(cfg.port, cfg.host, () => console.log(JSON.stringify({ msg: 'listening', port: cfg.port, base: cfg.base, static: cfg.staticDir })));
