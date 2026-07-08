# substack-mcp

## Repo overview

Single-package ESM Node.js project. No TypeScript, no build step. No tests, no linter, no formatter, no typechecker. Plain JS only.

## Entrypoint

`src/index.js` — registers tool handlers for `@modelcontextprotocol/sdk` over stdio transport.

## Adding a new tool

1. Create `src/tools/<name>.js` exporting `<name>Schema` (zod object) and `<name>Handler` (async fn).
2. Import and register in `src/index.js` under both `ListToolsRequestSchema` and `CallToolRequestSchema`.

## Required env

- `SUBSTACK_PUBLICATION_URL`
- `SUBSTACK_SESSION_TOKEN`
- `SUBSTACK_USER_ID`

The server throws on startup if any are missing. Auth cookie: `substack.sid=<token>; connect.sid=<token>;` (see `src/api/substack/SubstackApi.js:16`).

## Commands

- `yarn start` — run the server (alias for `node src/index.js`)
- `yarn install --frozen-lockfile` — install (used in Dockerfile and CI)

No other scripts exist.

## Dev quirks

- `cursor_config.json` in repo root uses `SESSION_ID` (typo). This is a dev/local config example; ignore for production use.
- The `draft_body` field is serialized via `JSON.stringify` before being sent to the Substack API (`SubstackPost.getDraft()`). Callers should pass body as a ProseMirror doc JSON string.
- Build artifacts: none (pure JS). Docker multi-arch build + npm publish both trigger on `v*` tags via GitHub Actions. Manual deploy scripts in `ops/`.
