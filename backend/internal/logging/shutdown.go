package logging

import (
	"context"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

// processStart is as close to the real process start as this package can get.
// Package initialisation runs before main, so an uptime measured from here is
// honest even for a service that dies during startup.
var processStart = time.Now()

// Uptime is how long this process has been running.
func Uptime() time.Duration { return time.Since(processStart) }

// SignalContext is a context cancelled by an operating-system signal that
// remembers which signal it was.
//
// signal.NotifyContext cancels but discards the signal, and the difference
// matters when explaining a shutdown after the fact: SIGINT is a person at a
// terminal, SIGTERM is an orchestrator taking the instance away, and SIGHUP is
// usually neither on purpose. "The service stopped" answers nothing; "SIGTERM
// arrived 4 seconds after the readiness probe started failing" answers most of
// it.
type SignalContext struct {
	context.Context

	mu  sync.Mutex
	sig os.Signal
}

// NotifySignals returns a context cancelled when one of sigs arrives, and a
// stop function that releases the signal handler. With no signals given it
// watches the two that mean "stop": interrupt and SIGTERM.
func NotifySignals(parent context.Context, sigs ...os.Signal) (*SignalContext, func()) {
	if len(sigs) == 0 {
		sigs = []os.Signal{os.Interrupt, syscall.SIGTERM}
	}
	ctx, cancel := context.WithCancel(parent)
	sc := &SignalContext{Context: ctx}
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, sigs...)
	go func() {
		select {
		case s := <-ch:
			sc.mu.Lock()
			sc.sig = s
			sc.mu.Unlock()
			cancel()
		case <-ctx.Done():
		}
	}()
	return sc, func() {
		signal.Stop(ch)
		cancel()
	}
}

// Signal is the signal that cancelled the context, or nil if something else did.
func (s *SignalContext) Signal() os.Signal {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.sig
}

// SignalName names the signal for a log line, or "" when no signal arrived.
func (s *SignalContext) SignalName() string {
	if sig := s.Signal(); sig != nil {
		return sig.String()
	}
	return ""
}

// Shutdown records why a service is stopping and what happened on the way down.
//
// A shutdown that goes wrong is the hardest thing to investigate afterwards:
// the process is gone, and by convention it says the least exactly when it is
// doing the most — closing listeners, draining work in flight, flushing state.
// This turns the teardown into a record with a cause at the top, one line per
// step, and a summary saying how long it took and what did not finish.
type Shutdown struct {
	log    *Logger
	begun  time.Time
	reason string

	mu     sync.Mutex
	steps  int
	failed int
}

// BeginShutdown announces the shutdown and starts recording it. reason is the
// cause in a few words — "signal", "listener failed", "control plane requested"
// — and attrs carry the context that makes it actionable.
func (l *Logger) BeginShutdown(reason string, attrs ...any) *Shutdown {
	s := &Shutdown{log: l, begun: time.Now(), reason: reason}
	l.Info("shutting down", append([]any{
		"reason", reason,
		"uptime", Uptime().Round(time.Millisecond).String(),
	}, attrs...)...)
	return s
}

// Step records the outcome of one teardown step. A failure is logged with its
// error and whatever context the caller passes; a success is debug-level detail
// nobody needs unless they are already looking.
func (s *Shutdown) Step(name string, err error, attrs ...any) {
	s.mu.Lock()
	s.steps++
	if err != nil {
		s.failed++
	}
	s.mu.Unlock()

	base := []any{
		"step", name,
		"elapsed", time.Since(s.begun).Round(time.Millisecond).String(),
	}
	if err != nil {
		s.log.Error("shutdown step failed", append(append(base, "error", err), attrs...)...)
		return
	}
	s.log.Debug("shutdown step done", append(base, attrs...)...)
}

// Done closes the record. It reports at warn level when a step failed, because
// a shutdown with a failed step is how state gets left behind — a lease not
// released, a connection not closed, a game not handed over — and that is the
// thing someone will be looking for later.
func (s *Shutdown) Done(attrs ...any) {
	s.mu.Lock()
	steps, failed := s.steps, s.failed
	s.mu.Unlock()

	fields := append([]any{
		"reason", s.reason,
		"took", time.Since(s.begun).Round(time.Millisecond).String(),
		"uptime", Uptime().Round(time.Millisecond).String(),
		"steps", steps,
	}, attrs...)
	if failed > 0 {
		s.log.Warn("stopped with errors during shutdown", append(fields, "failed_steps", failed)...)
		return
	}
	s.log.Info("stopped cleanly", fields...)
}

// Operation times one unit of work and reports how it ended.
//
// It exists so a failure carries the context of what was being attempted rather
// than only the error text: "open database" plus the path and the elapsed time
// is diagnosable, `dial tcp: connection refused` on its own is not. Successes
// are debug-level, so the record of what a healthy service is doing appears
// exactly when debug mode is on and costs nothing when it is not.
type Operation struct {
	log     *Logger
	name    string
	started time.Time
	attrs   []any
}

// Begin starts recording an operation.
func (l *Logger) Begin(name string, attrs ...any) *Operation {
	op := &Operation{log: l, name: name, started: time.Now(), attrs: attrs}
	l.Debug("started", append([]any{"op", name}, attrs...)...)
	return op
}

// OK ends the operation successfully.
func (o *Operation) OK(attrs ...any) {
	o.log.Debug("finished", o.fields(nil, attrs)...)
}

// Fail ends the operation with an error and returns that same error, so a call
// site can log and return in one expression:
//
//	return op.Fail(err)
func (o *Operation) Fail(err error, attrs ...any) error {
	o.log.Error("failed", o.fields(err, attrs)...)
	return err
}

// End is Fail or OK depending on err, for a deferred call.
func (o *Operation) End(err error, attrs ...any) {
	if err != nil {
		_ = o.Fail(err, attrs...)
		return
	}
	o.OK(attrs...)
}

func (o *Operation) fields(err error, extra []any) []any {
	fields := []any{"op", o.name, "took", time.Since(o.started).Round(time.Millisecond).String()}
	fields = append(fields, o.attrs...)
	fields = append(fields, extra...)
	if err != nil {
		fields = append(fields, "error", err)
	}
	return fields
}
