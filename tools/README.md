# Canonical Tool Pages (`tools/`)

This directory contains the canonical implementation for each tool.

Convention:

- `tools/<category>/<slug>/index.html` = real tool page
- `/t/<alias>/` = short alias URL resolved dynamically by the Go server

Why this split:

- `tools/` stays organized by category
- `/t/<alias>/` stays fast and memorable for bookmarks/typing
- aliases can change without moving source code (update the registry only)

## Go Server Note

When running the Go server (`cmd/tfdl`), alias redirects for `/t/<alias>` are
generated dynamically from `assets/js/tools.registry.js`.

There is no `t/<alias>/index.html` stub page workflow anymore; the registry is
the single source of truth for aliases.

## Categories Included

- `dev/`
- `productivity/`
- `utilities/`
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

All tool pages also load:

- `assets/css/skins/canva-dark.css` (default soft dark skin)
- `assets/css/user.css` (developer overrides, loaded last)

If you want a tool page to use the older terminal look, add `theme-terminal` to
that page's `<body>` class.
