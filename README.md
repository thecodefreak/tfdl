# TFDL (Tools For Dev Life)

TFDL is a local-first launcher for browser-based utility tools (formatters, timers,
calculators, writing helpers, finance tools, and more). It is designed for fast
keyboard use, predictable paths, and zero frontend build tooling.

You can use it in two ways:

- Static mode: open `index.html` directly and use canonical tool pages under `tools/`
- Server mode (recommended): run the included Go server for `/t/<alias>/` shortcuts,
  optional Basic Auth, and `/healthz`

## Highlights

- Keyboard-first launcher (`/`, `j/k`, `Enter`, `p`, `y`, `Y`, `1-0`, `v`)
- Registry-driven dashboard from `assets/js/tools.registry.js`
- Stable canonical paths: `tools/<category>/<slug>/`
- Short aliases: `/t/<alias>/` (served dynamically by the Go server)
- No Node build step required
- Docker and Docker Compose support

## Quick Start

### 1. Static (no server)

Open `index.html` in a browser.

- Works for the launcher UI and canonical tool pages
- Does not support `/t/<alias>/` routes (those require the Go server)

### 2. Run the local Go server (recommended)

Requirements:

- Go `1.25+` (see `go.mod`)

From the repo root:

```bash
go run ./cmd/tfdl serve
```

Open `http://127.0.0.1:8080`.

Useful examples:

```bash
go run ./cmd/tfdl serve -port 9000
go run ./cmd/tfdl serve -config ./tfdl.json -root .
go run ./cmd/tfdl serve -auth-enabled=true -auth-user dev -auth-pass 'secret'
```

You can also build a local binary:

```bash
go build -o tfdl ./cmd/tfdl
./tfdl serve
```

### 3. Docker Compose

```bash
docker compose -f compose.yml up --build
```

Examples:

```bash
TFDL_PORT=9090 docker compose -f compose.yml up --build
```

```bash
TFDL_AUTH_ENABLED=true \
TFDL_AUTH_USER=dev \
TFDL_AUTH_PASS='secret' \
docker compose -f compose.yml up --build
```

## How It Works

### Canonical Paths and Aliases

Each tool has:

- A canonical source path: `tools/<category>/<slug>/`
- A short alias URL: `/t/<alias>/`

Examples:

- `/t/json/` -> `tools/dev/json-formatter/`
- `/t/focus/` -> `tools/productivity/focus-timer/`
- `/t/words/` -> `tools/writing/word-counter/`

Aliases are generated dynamically by the Go server from
`assets/js/tools.registry.js`. The registry is the single source of truth.

## Launcher Features

- Search by name, alias, category, path, and description
- Token filters such as `@dev`, `@finance`, `#json`, `#timer`
- Pin tools and store recents in browser `localStorage`
- Copy alias path and source path from the launcher
- Open top visible results with `1..0`
- Card and table views with keyboard navigation

## Project Layout

- `index.html` - launcher dashboard
- `assets/css/styles.css` - shared styling for launcher and tools
- `assets/css/framework.css` - local UI framework primitives/utilities
- `assets/css/skins/canva-dark.css` - default skin
- `assets/css/user.css` - local overrides loaded last
- `assets/js/tools.registry.js` - tool metadata registry (name, alias, category, tags)
- `assets/js/app.js` - launcher behavior (search, filters, pins, recents, views)
- `tools/` - canonical tool implementations by category
- `cmd/tfdl/` - Go CLI entrypoint (`serve`, `print-config`)
- `internal/tfdl/` - Go server and config logic
- `tfdl.json` - optional server config file

## Add a Tool

1. Copy `tools/_template/` into the target category and rename it to your slug.
2. Implement `tools/<category>/<slug>/index.html` (and page assets if needed).
3. Add the tool entry to `assets/js/tools.registry.js`.
4. Reload the launcher and verify:
   - search results
   - alias path (`/t/<alias>/`)
   - source path link

Recommended quick validation:

```bash
node --check assets/js/app.js
node --check assets/js/tools.registry.js
```

If you changed a tool script, run `node --check` on that file too.

## Go Server Configuration

The Go server is optional, but enables alias routing and a better local app flow.

Commands:

- `tfdl serve` - run the static file server (default command)
- `tfdl print-config` - print the effective config after file + env resolution

Supported `serve` flags:

- `-config`
- `-port`
- `-bind`
- `-root`
- `-auth-enabled`
- `-auth-user`
- `-auth-pass`

## `tfdl.json` Format

The config file is JSON (no YAML dependency).

Example:

```json
{
  "server": {
    "bind": "0.0.0.0",
    "port": 8080,
    "root_dir": "."
  },
  "auth": {
    "enabled": false,
    "username": "admin",
    "password": ""
  }
}
```

Config lookup order:

1. `-config <path>`
2. `TFDL_CONFIG`
3. `./tfdl.json` (if present)

Environment variable overrides:

- `TFDL_PORT`
- `TFDL_BIND`
- `TFDL_ROOT`
- `TFDL_AUTH_ENABLED`
- `TFDL_AUTH_USER`
- `TFDL_AUTH_PASS`

## Server Features

- Dynamic `/t/<alias>/` redirects from the registry
- `/healthz` endpoint (no auth)
- Optional Basic Auth (disabled by default)
- Blocks direct access to `.git` paths when serving project root
- Request logging and graceful shutdown (`SIGINT` / `SIGTERM`)

## Theming and Local Overrides

- `assets/css/styles.css` imports `assets/css/framework.css`
- `assets/css/skins/canva-dark.css` provides the default skin
- `assets/css/user.css` is loaded last for local tweaks/branding

To use the older terminal-style look on a page, add `theme-terminal` to that
page's `<body>` class.