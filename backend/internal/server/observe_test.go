package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hoshivel/sr-web/backend/internal/logging"
)

// observed builds just enough Server to exercise the middleware, and returns
// the buffer its logger writes to.
func observed(t *testing.T, level string) (*Server, *strings.Builder) {
	t.Helper()
	out := &strings.Builder{}
	opts := logging.Defaults()
	opts.Level = level
	opts.Console = out
	log, err := logging.New(opts)
	if err != nil {
		t.Fatal(err)
	}
	return &Server{log: log}, out
}

// A panic must become a logged 500 with the request attached, not a dropped
// connection whose only trace is a stack on the standard library's logger.
func TestPanicIsRecoveredAndLogged(t *testing.T) {
	srv, out := observed(t, logging.LevelInfo)
	handler := srv.withObservability(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom while building a dispatch snapshot")
	}))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/play.json?region=hk1", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	id := rec.Header().Get(requestIDHeader)
	if id == "" {
		t.Fatal("no request id was returned, so a report cannot be tied to the log")
	}
	logged := out.String()
	for _, want := range []string{
		"panic while serving a request",
		"boom while building a dispatch snapshot",
		"/api/play.json",
		"stack=",
		"request=" + id,
	} {
		if !strings.Contains(logged, want) {
			t.Fatalf("the panic record is missing %q:\n%s", want, logged)
		}
	}
	// The query is where a token ends up when somebody puts one there, and a
	// log outlives and out-travels the request.
	if strings.Contains(logged, "region=hk1") {
		t.Fatalf("the query string reached the log:\n%s", logged)
	}
}

// A 5xx is worth a line whatever the level, a 4xx too; ordinary traffic is not.
func TestRequestLoggingFollowsLevel(t *testing.T) {
	srv, out := observed(t, logging.LevelInfo)
	serve := func(status int, path string) {
		h := srv.withObservability(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(status)
		}))
		h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, path, nil))
	}

	serve(http.StatusOK, "/healthz")
	if out.Len() != 0 {
		t.Fatalf("a healthy request was logged at info level:\n%s", out)
	}

	serve(http.StatusNotFound, "/api/nope")
	if !strings.Contains(out.String(), "request refused") || !strings.Contains(out.String(), "status=404") {
		t.Fatalf("a 4xx was not recorded at info level:\n%s", out)
	}

	serve(http.StatusBadGateway, "/api/play.json")
	if !strings.Contains(out.String(), "request failed") || !strings.Contains(out.String(), "status=502") {
		t.Fatalf("a 5xx was not recorded at info level:\n%s", out)
	}
}

func TestDebugModeTracesEveryRequest(t *testing.T) {
	srv, out := observed(t, logging.LevelDebug)
	handler := srv.withObservability(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("hello"))
	}))
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/healthz", nil))

	logged := out.String()
	for _, want := range []string{`msg=request`, "path=/healthz", "status=200", "bytes=5", "duration=", "request="} {
		if !strings.Contains(logged, want) {
			t.Fatalf("debug tracing is missing %q:\n%s", want, logged)
		}
	}
}
