package webtools

import (
	"crypto/subtle"
	"fmt"
	"log"
	"net/http"
	"path"
	"strings"
	"time"
)

func NewMux(cfg Config, logger *log.Logger) http.Handler {
	if logger == nil {
		logger = log.Default()
	}

	fileHandler := http.FileServer(http.Dir(cfg.Server.RootDir))
	staticChain := withRequestLogging(logger, withSecurityHeaders(withNoGitAccess(fileHandler)))

	if cfg.Auth.Enabled {
		staticChain = withBasicAuth(cfg.Auth.Username, cfg.Auth.Password, staticChain)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok\n"))
	})
	mux.Handle("/", staticChain)

	return mux
}

func ListenAddr(cfg Config) string {
	return fmt.Sprintf("%s:%d", cfg.Server.Bind, cfg.Server.Port)
}

func withNoGitAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cleanPath := path.Clean("/" + r.URL.Path)
		if cleanPath == "/.git" || strings.HasPrefix(cleanPath, "/.git/") || strings.Contains(cleanPath, "/.git/") {
			http.NotFound(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func withSecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "same-origin")
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		next.ServeHTTP(w, r)
	})
}

func withRequestLogging(logger *log.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		rw := &statusCapture{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rw, r)
		logger.Printf("%s %s %d %s", r.Method, r.URL.Path, rw.status, time.Since(started).Round(time.Millisecond))
	})
}

func withBasicAuth(username, password string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if ok && secureEqual(user, username) && secureEqual(pass, password) {
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Set("WWW-Authenticate", `Basic realm="web-tools"`)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	})
}

func secureEqual(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

type statusCapture struct {
	http.ResponseWriter
	status int
}

func (w *statusCapture) WriteHeader(statusCode int) {
	w.status = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}
