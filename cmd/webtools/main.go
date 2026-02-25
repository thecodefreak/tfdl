package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	webtools "webtools/internal/webtools"
)

func main() {
	logger := log.New(os.Stdout, "", log.LstdFlags)

	if err := run(os.Args[1:], logger); err != nil {
		logger.Printf("error: %v", err)
		os.Exit(1)
	}
}

func run(args []string, logger *log.Logger) error {
	if len(args) == 0 {
		return runServe(args, logger)
	}

	switch args[0] {
	case "serve":
		return runServe(args[1:], logger)
	case "print-config":
		return runPrintConfig(args[1:], logger)
	case "help", "-h", "--help":
		printRootHelp(os.Stdout)
		return nil
	default:
		if strings.HasPrefix(args[0], "-") {
			return runServe(args, logger)
		}
		printRootHelp(os.Stderr)
		return fmt.Errorf("unknown command: %s", args[0])
	}
}

func runServe(args []string, logger *log.Logger) error {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	configPathFlag := fs.String("config", "", "path to config file (default: WEBTOOLS_CONFIG or ./webtools.json if present)")
	portFlag := fs.Int("port", 0, "port override")
	bindFlag := fs.String("bind", "", "bind address override (for example 0.0.0.0)")
	rootFlag := fs.String("root", "", "static root directory override")
	authEnabledFlag := fs.String("auth-enabled", "", "override auth enabled (true/false)")
	authUserFlag := fs.String("auth-user", "", "override basic auth username")
	authPassFlag := fs.String("auth-pass", "", "override basic auth password")

	fs.Usage = func() {
		fmt.Fprintf(fs.Output(), "Usage: webtools serve [options]\n\n")
		fs.PrintDefaults()
	}

	if err := fs.Parse(args); err != nil {
		return err
	}

	cfg, configPath, err := loadEffectiveConfig(*configPathFlag, logger)
	if err != nil {
		return err
	}

	explicitFlags := visitedFlags(fs)
	applyEnvOverrides(&cfg)
	if err := applyFlagOverrides(&cfg, explicitFlags, serveOverrides{
		port:        *portFlag,
		bind:        *bindFlag,
		root:        *rootFlag,
		authEnabled: *authEnabledFlag,
		authUser:    *authUserFlag,
		authPass:    *authPassFlag,
	}); err != nil {
		return err
	}

	if err := cfg.NormalizeAndValidate(); err != nil {
		return err
	}

	addr := webtools.ListenAddr(cfg)
	mux := webtools.NewMux(cfg, logger)
	server := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	logger.Printf("webtools server starting")
	logger.Printf("  root: %s", cfg.Server.RootDir)
	if configPath != "" {
		logger.Printf("  config: %s", configPath)
	} else {
		logger.Printf("  config: <none>")
	}
	logger.Printf("  auth: %s", ternary(cfg.Auth.Enabled, fmt.Sprintf("enabled (%s)", cfg.Auth.Username), "disabled"))
	logger.Printf("  listen: http://%s", addr)

	errCh := make(chan error, 1)
	go func() {
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(sigCh)

	select {
	case err := <-errCh:
		return err
	case sig := <-sigCh:
		logger.Printf("shutdown signal received: %s", sig)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			return fmt.Errorf("graceful shutdown failed: %w", err)
		}
		<-errCh
		logger.Printf("server stopped")
		return nil
	}
}

func runPrintConfig(args []string, logger *log.Logger) error {
	_ = logger
	fs := flag.NewFlagSet("print-config", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	configPathFlag := fs.String("config", "", "path to config file")
	prettyFlag := fs.Bool("pretty", true, "pretty print JSON")
	if err := fs.Parse(args); err != nil {
		return err
	}

	cfg, _, err := loadEffectiveConfig(*configPathFlag, nil)
	if err != nil {
		return err
	}
	applyEnvOverrides(&cfg)
	if err := cfg.NormalizeAndValidate(); err != nil {
		return err
	}

	var output []byte
	if *prettyFlag {
		output, err = json.MarshalIndent(cfg, "", "  ")
	} else {
		output, err = json.Marshal(cfg)
	}
	if err != nil {
		return err
	}

	_, err = os.Stdout.Write(append(output, '\n'))
	return err
}

type serveOverrides struct {
	port        int
	bind        string
	root        string
	authEnabled string
	authUser    string
	authPass    string
}

func loadEffectiveConfig(explicitConfigPath string, logger *log.Logger) (webtools.Config, string, error) {
	path := webtools.ConfigPathFromArgsOrEnv(explicitConfigPath)
	if path == "" {
		cfg := webtools.DefaultConfig()
		return cfg, "", nil
	}

	cfg, err := webtools.LoadConfigFile(path)
	if err != nil {
		return webtools.Config{}, path, err
	}

	if logger != nil {
		logger.Printf("loaded config from %s", path)
	}
	return cfg, path, nil
}

func applyEnvOverrides(cfg *webtools.Config) {
	if v := strings.TrimSpace(os.Getenv("WEBTOOLS_BIND")); v != "" {
		cfg.Server.Bind = v
	}
	if v := strings.TrimSpace(os.Getenv("WEBTOOLS_ROOT")); v != "" {
		cfg.Server.RootDir = v
	}
	if v := strings.TrimSpace(os.Getenv("WEBTOOLS_PORT")); v != "" {
		if port, err := strconv.Atoi(v); err == nil {
			cfg.Server.Port = port
		}
	}
	if v := strings.TrimSpace(os.Getenv("WEBTOOLS_AUTH_ENABLED")); v != "" {
		if enabled, err := parseBool(v); err == nil {
			cfg.Auth.Enabled = enabled
		}
	}
	if v, ok := os.LookupEnv("WEBTOOLS_AUTH_USER"); ok {
		cfg.Auth.Username = strings.TrimSpace(v)
	}
	if v, ok := os.LookupEnv("WEBTOOLS_AUTH_PASS"); ok {
		cfg.Auth.Password = v
	}
}

func applyFlagOverrides(cfg *webtools.Config, explicit map[string]bool, flags serveOverrides) error {
	if explicit["bind"] {
		cfg.Server.Bind = flags.bind
	}
	if explicit["root"] {
		cfg.Server.RootDir = flags.root
	}
	if explicit["port"] {
		cfg.Server.Port = flags.port
	}
	if explicit["auth-enabled"] {
		enabled, err := parseBool(flags.authEnabled)
		if err != nil {
			return fmt.Errorf("invalid -auth-enabled value: %w", err)
		}
		cfg.Auth.Enabled = enabled
	}
	if explicit["auth-user"] {
		cfg.Auth.Username = flags.authUser
	}
	if explicit["auth-pass"] {
		cfg.Auth.Password = flags.authPass
	}
	return nil
}

func visitedFlags(fs *flag.FlagSet) map[string]bool {
	out := map[string]bool{}
	fs.Visit(func(f *flag.Flag) {
		out[f.Name] = true
	})
	return out
}

func parseBool(v string) (bool, error) {
	b, err := strconv.ParseBool(strings.TrimSpace(v))
	if err != nil {
		return false, fmt.Errorf("expected true/false, got %q", v)
	}
	return b, nil
}

func printRootHelp(out *os.File) {
	fmt.Fprintln(out, "webtools - local web tools launcher server")
	fmt.Fprintln(out)
	fmt.Fprintln(out, "Commands:")
	fmt.Fprintln(out, "  serve        Run the static web server (default command)")
	fmt.Fprintln(out, "  print-config Print the effective config after file+env resolution")
	fmt.Fprintln(out)
	fmt.Fprintln(out, "Examples:")
	fmt.Fprintln(out, "  webtools serve -port 8080")
	fmt.Fprintln(out, "  webtools serve -config ./webtools.json -auth-enabled=true -auth-user amal -auth-pass secret")
}

func ternary[T any](cond bool, a, b T) T {
	if cond {
		return a
	}
	return b
}
