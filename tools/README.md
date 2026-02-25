# Canonical Tool Pages (`tools/`)

This directory contains the canonical implementation for each tool.

Convention:

- `tools/<category>/<slug>/index.html` = real tool page
- `t/<alias>/index.html` = short redirect alias for static-file hosting (optional when using the Go server)

Why this split:

- `tools/` stays organized by category
- `t/` stays fast and memorable for bookmarks/typing
- aliases can change without moving source code (if you update redirects and registry)

## Go Server Note

When running the Go server (`cmd/webtools`), alias redirects for `/t/<alias>` are
generated dynamically from `assets/js/tools.registry.js`.

That means you can skip creating `t/<alias>/index.html` while developing/running
the server, and only add it if you still want static-file-only compatibility.

## Categories Included

- `dev/`
- `productivity/`
- `utilities/`
- `finance/`
- `media/`
- `writing/`

## Template

Use `tools/_template/` when creating a new tool.

The template and launcher now use the local UI framework (`assets/css/framework.css`,
loaded through `assets/css/styles.css`) so new tools can reuse:

- `ui-panel`
- `ui-btn` / `ui-btn--ghost` / `ui-btn--primary`
- `ui-chip` / `ui-code-chip`
- `ui-field-shell`
- `ui-stack` / `ui-row` / `ui-grid-2`
