package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/moehoshio/sr-web/backend/internal/config"
	"github.com/moehoshio/sr-web/backend/internal/play"
)

func TestNewSeedsSnapshot(t *testing.T) {
	cfg := config.Config{
		Regions: []config.Region{
			{ID: "a", Host: "a.example", URL: "https://a.example/"},
			{ID: "b", Host: "b.example", URL: "https://b.example/"},
		},
		ProbeInterval: time.Minute,
		ProbeTimeout:  time.Second,
	}
	r := New(cfg)
	snap := r.Snapshot()

	if len(snap.Regions) != 2 {
		t.Fatalf("seed regions = %d, want 2", len(snap.Regions))
	}
	if snap.Regions[0].Healthy {
		t.Errorf("seed region should be unhealthy until first probe")
	}
	if snap.Regions[0].URL != "https://a.example/" {
		t.Errorf("URL not carried into snapshot: %q", snap.Regions[0].URL)
	}
	if snap.UpdatedAt == "" {
		t.Errorf("UpdatedAt empty")
	}
}

func TestProbeAllClassifiesAndRecommends(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer up.Close()
	down := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer down.Close()

	cfg := config.Config{
		Regions: []config.Region{
			{ID: "up", Host: "up", URL: "https://up/", HealthURL: up.URL},
			{ID: "down", Host: "down", URL: "https://down/", HealthURL: down.URL},
		},
		ProbeInterval: time.Minute,
		ProbeTimeout:  2 * time.Second,
	}
	r := New(cfg)
	r.probeAll(context.Background())
	snap := r.Snapshot()

	byID := map[string]play.Region{}
	for _, rg := range snap.Regions {
		byID[rg.ID] = rg
	}
	if !byID["up"].Healthy {
		t.Errorf("up should be healthy")
	}
	if byID["down"].Healthy {
		t.Errorf("down should be unhealthy")
	}
	if snap.RecommendedID != "up" {
		t.Errorf("RecommendedID = %q, want up", snap.RecommendedID)
	}
}

func TestHealthURLDefaultsToHealthz(t *testing.T) {
	if got := healthURL(config.Region{Host: "hk1.svc.oha.li"}); got != "https://hk1.svc.oha.li/healthz" {
		t.Errorf("healthURL default = %q", got)
	}
	if got := healthURL(config.Region{Host: "h", HealthURL: "http://h:9/z"}); got != "http://h:9/z" {
		t.Errorf("healthURL override = %q", got)
	}
}
