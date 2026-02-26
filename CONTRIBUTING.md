# Contributing to TFDL

Thanks for contributing.

TFDL is a local-first, static tool workspace with a small Go server for local
serving, alias routing, and optional auth. Contributions should stay focused,
practical, and easy to review.

## Development Setup

Requirements:

- Go `1.25+`
- Node.js (for `node --check` syntax checks)

Run locally:

```bash
go run ./cmd/tfdl serve
```

Open `http://127.0.0.1:8080`.

Optional local config:

```bash
cp tfdl.example.json tfdl.json
```

## Project Structure

- `index.html` - launcher UI
- `assets/js/tools.registry.js` - tool registry metadata
- `assets/js/app.js` - launcher behavior
- `tools/` - canonical tool pages
- `cmd/tfdl/` - Go CLI entrypoint
- `internal/tfdl/` - Go server internals

## Tool Changes

Recommended workflow for adding a tool:

1. Copy `tools/_template/` into the correct category.
2. Build the tool in `tools/<category>/<slug>/`.
3. Add/update the registry entry in `assets/js/tools.registry.js`.
4. Verify the launcher search, alias, and source path.

Keep source pages under canonical paths (`tools/<category>/<slug>/`).
Short aliases are resolved dynamically by the Go server from the registry.

## Validation

Before opening a PR, run the checks relevant to your changes.

Go changes:

```bash
go test ./...
go build ./...
```

Launcher changes:

```bash
node --check assets/js/app.js
node --check assets/js/tools.registry.js
```

Tool JS changes:

```bash
node --check tools/<category>/<slug>/app.js
```

If you touched multiple JS files, run `node --check` on each of them.

## Pull Requests

- Keep PRs focused and small.
- Avoid unrelated refactors in the same PR.
- For new tools, prefer one tool per PR (or at least one tool per commit).
- Include a short summary of behavior changes and manual validation steps.
- If you changed keyboard behavior or launcher interactions, note it clearly.

## Release Notes

User-facing changes are easier to release when PR titles and commit messages are
short and descriptive.
