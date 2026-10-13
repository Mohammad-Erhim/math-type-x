# Contributing

## Setup

```
nvm use            # Node 22 (see .nvmrc)
npm ci
npm run build
npm test
```

## Workflow

1. Branch from `main`: `feat/…`, `fix/…`, `docs/…`, `test/…`, `chore/…`.
2. Keep commits focused and use [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat(layout): …`, `fix(core): …`).
3. Before opening a PR: `npm run typecheck` and `npm test` must pass; add or extend a test for every
   behaviour change.
4. Behaviour that mirrors the reference must be backed by recorded evidence (see
   [docs/TESTING.md](docs/TESTING.md)); do not guess reference behaviour.
5. Update `README.md`, `docs/` and `CHANGELOG.md` when behaviour, API or configuration changes.

## Conventions

* TypeScript, strict mode; match the surrounding code's style (see `.editorconfig`).
* The editing engine ends every state change with `sanitize()`; keep that invariant.
* Generated data in `src/data` is produced by `tools/gen/`; edit the generator, not the JSON.
* Never commit secrets or personal data; `evidence/ours/` (local replay output) is ignored.
