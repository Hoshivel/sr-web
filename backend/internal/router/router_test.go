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

func TestDisabledRegionsExcluded(t *testing.T) {
	cfg := config.Config{
		Regions: []config.Region{
			{ID: "a", Host: "a", URL: "https://a/"},
			{ID: "b", Host: "b", URL: "https://b/", Disabled: true},
		},
		ProbeInterval: time.Minute,
		ProbeTimeout:  time.Second,
	}
	r := New(cfg)
	snap := r.Snapshot()
	if len(snap.Regions) != 1 || snap.Regions[0].ID != "a" {
		t.Errorf("disabled region should be excluded, got %+v", snap.Regions)
	}
}

func TestDispatchNodesCarryCoords(t *testing.T) {
	cfg := config.Config{
		Regions:       []config.Region{{ID: "hk1", Host: "hk1", URL: "https://hk1/", Lat: 22.32, Lon: 114.17}},
		ProbeInterval: time.Minute,
		ProbeTimeout:  time.Second,
	}
	r := New(cfg)
	nodes, ts := r.DispatchNodes()
	if len(nodes) != 1 || !nodes[0].HasCoord || nodes[0].Coord.Lat != 22.32 {
		t.Errorf("coord not carried into dispatch node: %+v", nodes)
	}
	if ts == "" {
		t.Errorf("updatedAt empty")
	}
}

func TestSetRegionsReplacesAndPreservesHealth(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer up.Close()

	cfg := config.Config{
		Regions:       []config.Region{{ID: "a", Host: "a", URL: "https://a/", HealthURL: up.URL}},
		ProbeInterval: time.Minute,
		ProbeTimeout:  2 * time.Second,
	}
	r := New(cfg)
	r.probeAll(context.Background())
	if !r.Snapshot().Regions[0].Healthy {
		t.Fatalf("precondition: a should be healthy after probe")
	}

	// 動態替換：保留 a、新增 b、更新 a 的 host。
	r.SetRegions([]config.Region{
		{ID: "a", Host: "a-new", URL: "https://a/", HealthURL: up.URL},
		{ID: "b", Host: "b", URL: "https://b/"},
	})
	snap := r.Snapshot()
	if len(snap.Regions) != 2 {
		t.Fatalf("after SetRegions regions = %d, want 2", len(snap.Regions))
	}
	byID := map[string]play.Region{}
	for _, rg := range snap.Regions {
		byID[rg.ID] = rg
	}
	if !byID["a"].Healthy {
		t.Errorf("a should retain healthy status across reload")
	}
	if byID["a"].Host != "a-new" {
		t.Errorf("a host should update to a-new, got %q", byID["a"].Host)
	}
	if byID["b"].Healthy {
		t.Errorf("newly added b should start unhealthy until probed")
	}
}

func TestSetRegionsDropsDisabled(t *testing.T) {
	r := New(config.Config{
		Regions:       []config.Region{{ID: "a", Host: "a", URL: "https://a/"}},
		ProbeInterval: time.Minute, ProbeTimeout: time.Second,
	})
	r.SetRegions([]config.Region{
		{ID: "a", Host: "a", URL: "https://a/"},
		{ID: "b", Host: "b", URL: "https://b/", Disabled: true},
	})
	if regs := r.Snapshot().Regions; len(regs) != 1 || regs[0].ID != "a" {
		t.Errorf("disabled region should not be probed, got %+v", regs)
	}
}
