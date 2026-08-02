package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/hoshivel/sr-web/backend/internal/logging"
)

// observe.go is the request log and the panic net: the one place that can say
// "this arrived, this came back, and it took this long", and the one place that
// turns a panic into a recorded 500 instead of a dropped connection.
//
// What it deliberately does not record is the query string. A query is where a
// token ends up when somebody puts one there, and a log is copied and kept in
// more places than a database is. The path alone answers every question a log
// is asked, and the audit trail carries the rest.
//
// How much is written follows the level, which is what "debug mode" means here:
//
//	error  a request the server itself failed (5xx), and any panic
//	warn   a request that was refused (4xx)
//	debug  every request, including the ones that worked
//
// At the default level a healthy service is therefore quiet, and an unhealthy
// one is not.

// requestIDHeader lets an operator tie what somebody saw to what was logged. It
// is not a secret and identifies nothing on its own.
const requestIDHeader = "X-Request-Id"

func (s *Server) withObservability(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := logging.NewRequestID()
		ctx := logging.WithRequestID(r.Context(), id)
		r = r.WithContext(ctx)
		w.Header().Set(requestIDHeader, id)

		started := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		defer func() {
			if v := recover(); v != nil {
				s.log.ErrorContext(ctx, "panic while serving a request",
					"method", r.Method, "path", r.URL.Path,
					"remote_addr", r.RemoteAddr, "user_agent", r.UserAgent(),
					"duration", time.Since(started).Round(time.Millisecond).String(),
					"panic", fmt.Sprint(v), "stack", string(debug.Stack()))
				// ErrAbortHandler is the standard library's way of saying "give
				// up on this connection quietly"; it is not a fault and the
				// server has its own handling for it.
				if err, ok := v.(error); ok && errors.Is(err, http.ErrAbortHandler) {
					panic(v)
				}
				if !rec.wroteHeader {
					http.Error(rec, "internal error (request id: "+id+")", http.StatusInternalServerError)
				}
				return
			}
			s.logRequest(ctx, rec, r, started)
		}()

		next.ServeHTTP(rec, r)
	})
}

func (s *Server) logRequest(ctx context.Context, rec *statusRecorder, r *http.Request, started time.Time) {
	attrs := []any{
		"method", r.Method,
		"path", r.URL.Path,
		"status", rec.status,
		"bytes", rec.written,
		"duration", time.Since(started).Round(time.Millisecond).String(),
		"ip", r.RemoteAddr,
	}
	switch {
	case rec.status >= http.StatusInternalServerError:
		s.log.ErrorContext(ctx, "request failed", attrs...)
	case rec.status >= http.StatusBadRequest:
		s.log.WarnContext(ctx, "request refused", attrs...)
	default:
		// The user agent is only interesting when something is being
		// investigated, and it is long enough to bury the rest of the line.
		s.log.DebugContext(ctx, "request", append(attrs, "user_agent", r.UserAgent())...)
	}
}

// statusRecorder remembers what was actually sent. Handlers here write status
// codes through several paths — http.Error, writeJSON, the CORS wrapper — and
// none of them reports back.
type statusRecorder struct {
	http.ResponseWriter
	status  int
	written int
	// wroteHeader guards against the double WriteHeader that a handler which
	// both sets a status and then errors would otherwise produce in the log.
	wroteHeader bool
}

func (r *statusRecorder) WriteHeader(status int) {
	if r.wroteHeader {
		return
	}
	r.status, r.wroteHeader = status, true
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(p []byte) (int, error) {
	if !r.wroteHeader {
		r.wroteHeader = true
	}
	n, err := r.ResponseWriter.Write(p)
	r.written += n
	return n, err
}

// Unwrap lets http.ResponseController reach the real writer, so wrapping does
// not quietly take flushing or deadline control away from a handler.
func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }
