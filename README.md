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
- `assets/css/styles.css` — shared dark styling (dashboard + tool shells + alias pages)
- `assets/js/tools.registry.js` — all tool metadata (name, alias, category, tags)
- `assets/js/app.js` — registry rendering, search/filter, pins, recents, copy actions
- `tools/` — canonical implementation folders by category
- `t/` — short alias redirect pages for fast URL access

## URL Strategy

Use two paths for every tool:

- Canonical implementation path: `tools/<category>/<slug>/`
- Short alias path (daily use/bookmarks): `t/<alias>/`

Examples:

- `t/json/` → `tools/dev/json-formatter/`
- `t/focus/` → `tools/productivity/focus-timer/`
- `t/words/` → `tools/writing/word-counter/`

This keeps source organized while keeping navigation fast.

## Add a New Tool (Recommended Workflow)

1. Copy `tools/_template/` into the target category and rename to your slug.
2. Implement the tool at `tools/<category>/<slug>/index.html`.
3. Add the tool entry to `assets/js/tools.registry.js`.
4. Create `t/<alias>/index.html` redirect page.
5. Reload `index.html` and verify search + alias link + source path.

## Dashboard Features

- Search by name, alias, path, category, and description
- Token filters: `@dev`, `@utilities`, `#json`, `#timer`
- Pinned tools (stored in browser `localStorage`)
- Recent launches (stored in browser `localStorage`)
- Copy alias path and source path per tool
- Shortcuts to open top visible tools with `1..0`

## Notes

- No build system or framework required.
- Works as a static local workspace.
- If you later host it, the same `t/<alias>/` structure stays useful.
