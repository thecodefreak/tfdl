# Canonical Tool Pages (`tools/`)

This directory contains the canonical implementation for each tool.

Convention:

- `tools/<category>/<slug>/index.html` = real tool page
- `t/<alias>/index.html` = short redirect alias for daily use

Why this split:

- `tools/` stays organized by category
- `t/` stays fast and memorable for bookmarks/typing
- aliases can change without moving source code (if you update redirects and registry)

## Categories Included

- `dev/`
- `productivity/`
- `utilities/`
- `finance/`
- `media/`
- `writing/`

## Template

Use `tools/_template/` when creating a new tool.
