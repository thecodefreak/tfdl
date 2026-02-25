# CSS Structure

## Files

- `framework.css` - local shared UI framework (tokens, primitives, utilities)
- `styles.css` - project-specific launcher/tool-shell styling and overrides
- `skins/canva-dark.css` - default soft dark skin overlay (loaded after `styles.css`)
- `user.css` - developer override file (loaded last)

## Why a Local Framework

The project needs a neat, dev-friendly UI without adding a build step or large
third-party CSS dependency. `framework.css` provides a small reusable layer for:

- panels and surfaces
- compact buttons and chips
- input shells / form controls
- layout utilities (`ui-row`, `ui-stack`, `ui-grid-2`, etc.)

## Usage Pattern

`styles.css` imports `framework.css`, and pages then load:

1. `assets/css/styles.css`
2. `assets/css/skins/canva-dark.css` (default skin)
3. `assets/css/user.css` (developer overrides)

This keeps the base styles stable while making theme/polish changes easy.

Example:

```html
<section class="tool-panel ui-panel ui-stack">
  <div class="ui-row ui-row-between">
    <h2>Tool</h2>
    <button class="action-btn ui-btn ui-btn--primary">Run</button>
  </div>
  <label class="ui-field-shell">
    <span class="mono">&gt;</span>
    <input class="ui-input" type="text" />
  </label>
</section>
```

## Scope

Use the framework for shared structure and controls. Keep tool-specific layout
and interactions in each tool's own `styles.css`.

## Theme Opt-Out (Legacy Look)

The default soft skin applies to `theme-dark` pages. To keep the older terminal
look on a specific page, add `theme-terminal` to that page's `<body>` class.
