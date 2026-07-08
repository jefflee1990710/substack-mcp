# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An MCP (Model Context Protocol) server exposing 16 tools for automating a Substack publication (drafts, posts, notes, tags, profile/publication settings, stats). Single-package ESM Node.js, plain JavaScript — no TypeScript, no build step, no tests, no linter.

## Commands

- `yarn start` — run the MCP server over stdio (`node src/index.js`)
- `yarn install --frozen-lockfile` — install deps (same command used in Dockerfile and CI)
- `yarn explore [/path] [--headless]` — API explorer: launches Chromium with your session cookies injected and logs every non-GET `/api/` request (method, URL, payload) to the terminal. Use it to reverse-engineer new Substack endpoints before writing a tool. Defaults to `/publish/settings`.

There are no test/lint/build scripts. Node version: v22.15.0 (`.nvmrc`).

Required env (server throws at startup if missing): `SUBSTACK_PUBLICATION_URL`, `SUBSTACK_SESSION_TOKEN`, `SUBSTACK_USER_ID`.

## Architecture

Substack has no public API — everything here rides on undocumented internal endpoints, authenticated with a session cookie. There are two integration strategies:

1. **REST via axios** (`src/api/substack/SubstackApi.js`) — used by almost all tools. The auth cookie is `substack.sid=<token>; connect.sid=<token>;` (same token in both). Two base URLs matter:
   - `<publication_url>/api/v1/...` — publication-scoped endpoints (drafts, posts, tags, publication settings)
   - `https://substack.com/api/v1/...` (`base_url`) — user-scoped endpoints (profile)
2. **Playwright browser automation** — only for `create_note` (`src/tools/create_note.js`). Substack blocks the Notes API for scripts, so this tool drives a headless Chromium through the real composer UI (click "What's on your mind?", type, click Post). `create_short_post` is the REST-only alternative: it creates and immediately publishes a title-only draft that behaves like a Note on the publication feed (dummy title `'Solo Quant Quick Thought'` — deliberately not `'.'`, which broke Activity-feed rendering).

### Request flow

`src/index.js` creates the MCP `Server` (stdio transport) and registers every tool in **two places**: the `ListToolsRequestSchema` handler (name/description/`zodToJsonSchema(schema)`) and the `CallToolRequestSchema` switch (calls the handler, JSON-stringifies the result). Each tool in `src/tools/<name>.js` exports `<name>Schema` (zod object) and `<name>Handler` (async fn) and constructs its own `SubstackApi` from env vars.

### Adding a new tool

1. Reverse-engineer the endpoint with `yarn explore` if needed.
2. Create `src/tools/<name>.js` exporting `<name>Schema` + `<name>Handler` (follow any existing tool as a template).
3. Register it in `src/index.js` in **both** the ListTools list and the CallTool switch — forgetting one is the common mistake.
4. Update the tools table in `README.md`.

### Post bodies are ProseMirror JSON, not Markdown

Draft/post `body` must be a ProseMirror doc (`{"type":"doc","content":[...]}`) serialized with `JSON.stringify` before hitting the API (see `SubstackPost.getDraft()` and `create_short_post.js`). Inline marks (`strong`, `em`, `code`, `link` with `attrs.href`) go on `type: "text"` nodes — never as top-level node types; getting this wrong crashes the Substack editor. `src/api/substack/SubstackPost.js` is a builder class for these docs (paragraphs, headings, lists, images, buttons, paywall) — note it contains hardcoded Quickview-newsletter helper sections (`addHeader`, `becamePremiumMember`, `addFooter`) specific to the original author's publication.

## Release

Pushing a `v*` tag triggers both GitHub Actions workflows: npm publish and multi-arch Docker build/push (Docker Hub `marcomoauro/substack-mcp`). The workflows call the scripts in `ops/`, which can also be run manually.

## Quirks

- `cursor_config.json` in the repo root is a local config example with a `SESSION_ID` typo (should be the three real env vars) — ignore it for production use.
- `poster_state.json` is runtime state for an external posting loop, not app config.
