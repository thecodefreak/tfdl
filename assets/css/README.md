# CSS Structure

## Files

- `framework.css` - local shared UI framework (tokens, primitives, utilities)
- `styles.css` - project-specific launcher/tool-shell styling and overrides

## Why a Local Framework

The project needs a neat, dev-friendly UI without adding a build step or large
third-party CSS dependency. `framework.css` provides a small reusable layer for:

- panels and surfaces
- compact buttons and chips
- input shells / form controls
- layout utilities (`ui-row`, `ui-stack`, `ui-grid-2`, etc.)

## Usage Pattern

`styles.css` imports `framework.css`, so tool pages that already include
`assets/css/styles.css` can use framework classes immediately.

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
