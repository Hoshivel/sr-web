package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func testClient() *http.Client { return &http.Client{Timeout: 2 * time.Second} }

func TestProbeRegionHealthyPlainOK(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	got := probeRegion(context.Background(), testClient(), srv.URL)
	if !got.healthy {
		t.Fatalf("healthy = false, want true")
	}
	if got.load != 0 {
		t.Errorf("load = %v, want 0 (plain ok carries no load signal)", got.load)
	}
	if got.latencyMS < 0 {
		t.Errorf("latencyMS = %d, want >= 0", got.latencyMS)
	}
}

func TestProbeRegionHealthyJSONLoad(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"status":"ok","load":0.5}`))
	}))
	defer srv.Close()

	got := probeRegion(context.Background(), testClient(), srv.URL)
	if !got.healthy {
		t.Fatalf("healthy = false, want true")
	}
	if got.load != 0.5 {
		t.Errorf("load = %v, want 0.5", got.load)
	}
}

func TestProbeRegionUnhealthyStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	got := probeRegion(context.Background(), testClient(), srv.URL)
	if got.healthy {
		t.Errorf("healthy = true for 503, want false")
	}
}

func TestProbeRegionUnreachable(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	url := srv.URL
	srv.Close() // close so the address refuses connections

	got := probeRegion(context.Background(), testClient(), url)
	if got.healthy {
		t.Errorf("healthy = true for unreachable host, want false")
	}
}

func TestParseLoad(t *testing.T) {
	cases := []struct {
		name string
		body string
		want float64
		ok   bool
	}{
		{"plain ok is not JSON", "ok", 0, false},
		{"empty body", "", 0, false},
		{"load field", `{"status":"ok","load":0.5}`, 0.5, true},
		{"load clamps above 1", `{"load":1.5}`, 1, true},
		{"load clamps below 0", `{"load":-0.25}`, 0, true},
		{"players over capacity", `{"players":1,"capacity":4}`, 0.25, true},
		{"zero capacity ignored", `{"players":3,"capacity":0}`, 0, false},
		{"no load fields", `{"status":"ok"}`, 0, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, ok := parseLoad([]byte(c.body))
			if got != c.want || ok != c.ok {
				t.Errorf("parseLoad(%q) = (%v, %v), want (%v, %v)", c.body, got, ok, c.want, c.ok)
			}
		})
	}
}
