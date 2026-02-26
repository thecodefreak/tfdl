package tfdl

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path"
	"regexp"
	"strings"
)

type aliasRegistryDoc struct {
	Tools []aliasRegistryTool `json:"tools"`
}

type aliasRegistryTool struct {
	Alias    string `json:"alias"`
	Category string `json:"category"`
	Slug     string `json:"slug"`
	ID       string `json:"id"`
}

// LoadAliasRedirects loads alias mappings from tools.registry.js using a filesystem interface.
// This supports both embedded filesystems (embed.FS) and external directories (os.DirFS).
func LoadAliasRedirects(fsys fs.FS) (map[string]string, error) {
	registryPath := "assets/js/tools.registry.js"
	data, err := fs.ReadFile(fsys, registryPath)
	if err != nil {
		return nil, fmt.Errorf("read registry: %w", err)
	}

	jsonBytes, err := extractRegistryJSON(data)
	if err != nil {
		return nil, fmt.Errorf("parse registry wrapper: %w", err)
	}

	var doc aliasRegistryDoc
	if err := json.Unmarshal(jsonBytes, &doc); err != nil {
		return nil, fmt.Errorf("decode registry JSON: %w", err)
	}

	redirects := make(map[string]string, len(doc.Tools))
	for _, tool := range doc.Tools {
		alias := strings.ToLower(strings.TrimSpace(tool.Alias))
		category := strings.TrimSpace(tool.Category)
		slug := strings.TrimSpace(tool.Slug)
		if alias == "" {
			continue
		}
		if category == "" {
			continue
		}
		if slug == "" {
			slug = strings.TrimSpace(tool.ID)
		}
		if slug == "" {
			continue
		}
		if _, exists := redirects[alias]; exists {
			// First entry wins to avoid silent route flips from duplicate aliases.
			continue
		}

		redirects[alias] = path.Clean("/tools/"+category+"/"+slug) + "/"
	}

	return redirects, nil
}

// LoadAliasRedirectsFromPath loads alias mappings from a directory path.
// This is a convenience wrapper for external file systems.
func LoadAliasRedirectsFromPath(rootDir string) (map[string]string, error) {
	return LoadAliasRedirects(os.DirFS(rootDir))
}

func LookupAliasRedirect(aliasRedirects map[string]string, requestPath string) (string, bool) {
	if len(aliasRedirects) == 0 {
		return "", false
	}

	cleanPath := path.Clean("/" + requestPath)
	if cleanPath == "/t" || cleanPath == "/t/" {
		return "", false
	}

	trimmed := strings.TrimPrefix(cleanPath, "/")
	segments := strings.Split(trimmed, "/")
	if len(segments) < 2 || segments[0] != "t" {
		return "", false
	}

	if len(segments) > 3 {
		return "", false
	}
	if len(segments) == 3 && segments[2] != "index.html" {
		return "", false
	}

	alias := strings.ToLower(strings.TrimSpace(segments[1]))
	if alias == "" {
		return "", false
	}

	target, ok := aliasRedirects[alias]
	if !ok {
		return "", false
	}
	return target, true
}

func extractRegistryJSON(data []byte) ([]byte, error) {
	src := strings.TrimSpace(string(data))
	start := strings.IndexByte(src, '{')
	end := strings.LastIndexByte(src, '}')
	if start < 0 || end < 0 || end <= start {
		return nil, fmt.Errorf("could not find JSON object")
	}
	objectLiteral := src[start : end+1]

	// `tools.registry.js` is a JS object literal (`window.TOOLS_REGISTRY = { ... }`)
	// with unquoted keys. Convert keys to JSON form for stdlib decoding.
	keyPattern := regexp.MustCompile(`([,{]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:`)
	jsonLike := keyPattern.ReplaceAllString(objectLiteral, `$1"$2":`)

	return []byte(jsonLike), nil
}
