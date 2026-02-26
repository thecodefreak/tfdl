// Package static provides embedded static files for the tfdl server.
// This package must be at the project root to access static directories via embed.
package static

import "embed"

// FS contains all static assets bundled at compile time.
// When root_dir is not specified, the server uses these files.
//
//go:embed index.html site.webmanifest
//go:embed all:assets
//go:embed all:tools
var FS embed.FS
