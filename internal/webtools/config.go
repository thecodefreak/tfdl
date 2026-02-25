package webtools

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Server ServerConfig `json:"server"`
	Auth   AuthConfig   `json:"auth"`
}

type ServerConfig struct {
	Bind    string `json:"bind"`
	Port    int    `json:"port"`
	RootDir string `json:"root_dir"`
}

type AuthConfig struct {
	Enabled  bool   `json:"enabled"`
	Username string `json:"username"`
	Password string `json:"password"`
}

func DefaultConfig() Config {
	return Config{
		Server: ServerConfig{
			Bind:    "0.0.0.0",
			Port:    8080,
			RootDir: ".",
		},
		Auth: AuthConfig{
			Enabled:  false,
			Username: "admin",
			Password: "",
		},
	}
}

func LoadConfigFile(path string) (Config, error) {
	cfg := DefaultConfig()

	cleanPath, err := filepath.Abs(path)
	if err != nil {
		return Config{}, fmt.Errorf("resolve config path: %w", err)
	}

	file, err := os.Open(cleanPath)
	if err != nil {
		return Config{}, fmt.Errorf("open config file: %w", err)
	}
	defer file.Close()

	dec := json.NewDecoder(file)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&cfg); err != nil {
		return Config{}, fmt.Errorf("decode config file: %w", err)
	}

	if cfg.Server.RootDir == "" {
		cfg.Server.RootDir = "."
	}

	// Resolve relative roots from the config file location so configs are portable.
	if !filepath.IsAbs(cfg.Server.RootDir) {
		cfg.Server.RootDir = filepath.Join(filepath.Dir(cleanPath), cfg.Server.RootDir)
	}

	if err := cfg.NormalizeAndValidate(); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func (c *Config) NormalizeAndValidate() error {
	c.Server.Bind = strings.TrimSpace(c.Server.Bind)
	c.Server.RootDir = strings.TrimSpace(c.Server.RootDir)
	c.Auth.Username = strings.TrimSpace(c.Auth.Username)

	if c.Server.Bind == "" {
		c.Server.Bind = "0.0.0.0"
	}
	if c.Server.Port == 0 {
		c.Server.Port = 8080
	}
	if c.Server.RootDir == "" {
		c.Server.RootDir = "."
	}

	if c.Server.Port < 1 || c.Server.Port > 65535 {
		return fmt.Errorf("server.port must be between 1 and 65535 (got %d)", c.Server.Port)
	}

	absRoot, err := filepath.Abs(c.Server.RootDir)
	if err != nil {
		return fmt.Errorf("resolve server.root_dir: %w", err)
	}
	c.Server.RootDir = absRoot

	info, err := os.Stat(c.Server.RootDir)
	if err != nil {
		return fmt.Errorf("stat server.root_dir: %w", err)
	}
	if !info.IsDir() {
		return errors.New("server.root_dir must be a directory")
	}

	if _, err := os.Stat(filepath.Join(c.Server.RootDir, "index.html")); err != nil {
		return fmt.Errorf("server.root_dir must contain index.html: %w", err)
	}

	if c.Auth.Enabled {
		if c.Auth.Username == "" {
			return errors.New("auth.username is required when auth.enabled is true")
		}
		if c.Auth.Password == "" {
			return errors.New("auth.password is required when auth.enabled is true")
		}
	}

	return nil
}

func ConfigPathFromArgsOrEnv(explicit string) string {
	explicit = strings.TrimSpace(explicit)
	if explicit != "" {
		return explicit
	}

	if envPath := strings.TrimSpace(os.Getenv("WEBTOOLS_CONFIG")); envPath != "" {
		return envPath
	}

	if _, err := os.Stat("webtools.json"); err == nil {
		return "webtools.json"
	}

	return ""
}
