# HTTP services

Base path `/editor-services/` (override with `SERVICES_BASE`). Every service accepts GET (query) and POST
(`application/x-www-form-urlencoded`, JSON, or a raw body). Responses are `text/plain` / `application/json`
or an image. Errors are returned as `Error: …` text with HTTP 200 (like the reference), or with the real
status when `httpstatus=true` is passed.

| service | parameters | response |
| --- | --- | --- |
| `mathml2accessible` | `mml`, `lang` | accessible text, e.g. `a over b` |
| `accessible2mathml` | `text`, `lang` | MathML |
| `latex2mathml` | `latex` | MathML |
| `mathml2latex` | `mml` | LaTeX |
| `mathml2content` | `mml` | Content MathML |
| `content2mathml` | `mml` | Presentation MathML |
| `render`, `render.svg`, `render.png`, `render.pdf`, `render.eps` | `mml` or `latex`, `zoom`, `dpi`, `backgroundColor`, `color`, `fontSize` | image; PNG / SVG carry the baseline in the `X-Baseline` header |
| `hand/recognize` | strokes (JSON) | recognised MathML |
| `tick` | – | keep-alive |

Other routes: `GET /healthz` → `ok`; everything else is served from `STATIC_DIR` (default `dist/public`).

Where the reference answers a formula with *"Error converting from MathML to …"* (for instance some
elementary-maths stacks to LaTeX) this service answers the same text; the recorded cases are in
`tests/oracle/services_stack.json`.

## Limits and hardening

* body ≤ 1 MB (`MAX_BODY`), 120 requests / minute / IP (`RATE_LIMIT`)
* strict MathML parser: no DOCTYPE, no entities, nesting depth ≤ 64, ≤ 20 000 nodes
* CORS origins from `CORS_ORIGINS` (default `*`; restrict it in production)
* structured one-line JSON access log (`LOG=off` disables it)

## Configuration

| variable | default | meaning |
| --- | --- | --- |
| `PORT` | `8080` | listen port |
| `HOST` | `0.0.0.0` | listen address |
| `SERVICES_BASE` | `/editor-services/` | service path prefix |
| `STATIC_DIR` | `dist/public` | static files |
| `CORS_ORIGINS` | `*` | comma-separated allowed origins |
| `RATE_LIMIT` | `120` | requests / minute / IP |
| `MAX_BODY` | `1048576` | maximum body bytes |
| `LOG` | on | `off` silences the access log |

## Embedding with another backend

Point `services.baseUrl` of the editor to any server implementing the table above; the client does not
depend on this implementation.

## Without the services (static hosting)

`src/ui/services.ts` calls the services first. A network error or a 403 / 404 / 405 / 501 answer marks the server as
absent for 60 s and the call is answered locally: `render` (`src/render/svg.ts` + canvas rasterising in
`src/render/client.ts`, PDF / EPS from `src/render/pdf.ts`), `hand/recognize` (`src/hand/worker.ts`, built to
`hand-worker.js`; the recogniser runs on the page when workers are unavailable) and the converters. Other error
statuses (400, 500, …) are real answers of a service and are reported. `services: { local: true }` skips the server.
