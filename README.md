# Web Tools Workspace (Developer-First)

A local-first launcher and folder structure for daily web tools, designed for predictable paths and fast access.

## What Changed (Design Principles)

- Compact dark UI optimized for scanning, not decorative cards
- Single source of truth tool registry: `assets/js/tools.registry.js`
- Predictable canonical paths: `tools/<category>/<slug>/`
- Short daily-use aliases: `t/<alias>/`
- Keyboard-first navigation on the dashboard (`/`, `j/k`, `Enter`, `p`, `y`, `Y`, `1-0`)

## Directory Layout

- `index.html` — developer launcher dashboard (rendered from registry)
- `assets/css/styles.css` — shared dark styling (dashboard + tool shells)
- `assets/js/tools.registry.js` — all tool metadata (name, alias, category, tags)
- `assets/js/app.js` — registry rendering, search/filter, pins, recents, copy actions
- `tools/` — canonical implementation folders by category
- `/t/<alias>/` — short alias URLs served dynamically by the Go server

## URL Strategy

Use two paths for every tool:

- Canonical implementation path: `tools/<category>/<slug>/`
- Short alias path (daily use/bookmarks): `t/<alias>/`

Examples:

- `t/json/` → `tools/dev/json-formatter/`
- `t/focus/` → `tools/productivity/focus-timer/`
- `t/words/` → `tools/writing/word-counter/`

This keeps source organized while keeping navigation fast. Alias redirects for
`/t/<alias>/` are generated dynamically by the Go server from
`assets/js/tools.registry.js` (there is no `t/` redirect folder).

## Add a New Tool (Recommended Workflow)

1. Copy `tools/_template/` into the target category and rename to your slug.
2. Implement the tool at `tools/<category>/<slug>/index.html`.
3. Add the tool entry to `assets/js/tools.registry.js`.
4. Reload `index.html` and verify search + alias link + source path.

## Dashboard Features

- Search by name, alias, path, category, and description
- Token filters: `@dev`, `@utilities`, `#json`, `#timer`
- Pinned tools (stored in browser `localStorage`)
- Recent launches (stored in browser `localStorage`)
- Copy alias path and source path per tool
- Shortcuts to open top visible tools with `1..0`

## UI Framework (Phase 2)

To keep the project minimal but consistent, the UI now uses a small local CSS
framework in `assets/css/framework.css` (no external dependency/build step).

What it provides:

- shared design tokens (`--ui-*`) that map to the app theme
- reusable component primitives (`ui-panel`, `ui-btn`, `ui-chip`, `ui-field-shell`)
- utility classes for layout/spacing (`ui-stack`, `ui-row`, `ui-grid-2`, etc.)
- dev-tool-friendly defaults (dark surfaces, compact controls, mono support)

How it is loaded:

- `assets/css/styles.css` imports `assets/css/framework.css`
- existing launcher/tool styles remain app-specific and can be migrated gradually

## UI Skins & Custom Styles

The default UI now uses a softer dark skin (`assets/css/skins/canva-dark.css`)
that loads after `assets/css/styles.css`.

A shared developer override file is also loaded last on every launcher/tool
page:

- `assets/css/user.css`

Use `assets/css/user.css` for local branding, spacing tweaks, or custom themes
without editing core CSS files.

If you want the older terminal-style look on a page, add `theme-terminal` to the
`<body>` class for that page to opt out of the default soft skin.

## Notes

- No build system or framework required.
- Canonical pages work as static files; short `t/<alias>/` aliases require the Go server.
- Alias routes stay stable because they are generated from `assets/js/tools.registry.js`.

## Run as a Web Server (Go)

This project now includes a small Go server so you can run the static workspace as a local web app or package it as a command.

Files:

- `cmd/webtools/` - CLI entrypoint (`serve`, `print-config`)
- `internal/webtools/` - server + config logic
- `webtools.json` - shared dev config (portable defaults)

### Quick Start

From `project/`:

```bash
go run ./cmd/webtools serve
```

Open:

- `http://127.0.0.1:8080`

### Useful Flags

```bash
go run ./cmd/webtools serve -port 9000
go run ./cmd/webtools serve -config ./webtools.json -root .
go run ./cmd/webtools serve -auth-enabled=true -auth-user dev -auth-pass 'secret'
```

Supported overrides:

- `-port`
- `-bind`
- `-root`
- `-config`
- `-auth-enabled`
- `-auth-user`
- `-auth-pass`

### Config File (`webtools.json`)

The server uses `webtools.json` (JSON instead of YAML to keep the Go implementation dependency-free).

Lookup order:

1. `-config <path>`
2. `WEBTOOLS_CONFIG`
3. `./webtools.json` (if present)

Environment variables also override config values:

- `WEBTOOLS_PORT`
- `WEBTOOLS_BIND`
- `WEBTOOLS_ROOT`
- `WEBTOOLS_AUTH_ENABLED`
- `WEBTOOLS_AUTH_USER`
- `WEBTOOLS_AUTH_PASS`

### Password Protection

Basic Auth is supported and is **disabled by default**.

Set in config:

- `auth.enabled = true`
- `auth.username`
- `auth.password`

Or override with flags/env vars.

### Nice Extras Included

- `/healthz` endpoint (no auth) for Compose/health checks
- blocks direct access to `.git` paths when serving the project root
- dynamic `/t/<alias>` redirects loaded from `assets/js/tools.registry.js`
- basic request logging
- graceful shutdown on `SIGINT`/`SIGTERM`

## Docker / Compose

### Docker Compose

From `project/`:

```bash
docker compose -f compose.yml up --build
```

The service:

- builds the Go server image
- mounts the project directory read-only
- serves from `/srv/webtools`
- reads config from `/srv/webtools/webtools.json`

Change the port:

```bash
WEBTOOLS_PORT=9090 docker compose -f compose.yml up --build
```

Enable auth:

```bash
WEBTOOLS_AUTH_ENABLED=true \
WEBTOOLS_AUTH_USER=dev \
WEBTOOLS_AUTH_PASS='secret' \
docker compose -f compose.yml up --build
```
