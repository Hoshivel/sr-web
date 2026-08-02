package server

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hoshivel/sr-web/backend/internal/config"
	"github.com/hoshivel/sr-web/backend/internal/play"
	"github.com/hoshivel/sr-web/backend/internal/router"
)

// newTestServer wires a live snapshot (one seeded region) through the HTTP layer.
func newTestServer(origins []string) *httptest.Server {
	store := config.NewStore(config.File{
		AllowedOrigins: origins,
		Regions:        []config.Region{{ID: "hk1", Host: "hk1.svc.hoshivel.com", URL: "https://hk1.svc.hoshivel.com/"}},
	}, "")
	rt := router.New(store.Config())
	return httptest.NewServer(New(store, rt).Handler())
}

func get(t *testing.T, ts *httptest.Server, path, origin string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, ts.URL+path, nil)
	if err != nil {
		t.Fatal(err)
	}
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	resp, err := ts.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func TestHealthz(t *testing.T) {
	ts := newTestServer(nil)
	defer ts.Close()

	resp := get(t, ts, "/healthz", "")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if strings.TrimSpace(string(body)) != "ok" {
		t.Errorf("body = %q, want ok", body)
	}
}

func TestPlayJSONContract(t *testing.T) {
	ts := newTestServer(nil)
	defer ts.Close()

	resp := get(t, ts, "/api/play.json", "")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); !strings.Contains(ct, "application/json") {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
	if cc := resp.Header.Get("Cache-Control"); cc != "no-store" {
		t.Errorf("Cache-Control = %q, want no-store", cc)
	}
	var got play.Response
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(got.Regions) != 1 || got.Regions[0].ID != "hk1" {
		t.Errorf("regions = %+v, want single hk1", got.Regions)
	}
	if got.Regions[0].URL != "https://hk1.svc.hoshivel.com/" {
		t.Errorf("region url = %q", got.Regions[0].URL)
	}
	if got.UpdatedAt == "" {
		t.Errorf("updatedAt empty")
	}
}

func TestPlayAlias(t *testing.T) {
	ts := newTestServer(nil)
	defer ts.Close()

	resp := get(t, ts, "/api/play", "")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("/api/play status = %d, want 200", resp.StatusCode)
	}
}

func TestPlayMethodNotAllowed(t *testing.T) {
	ts := newTestServer(nil)
	defer ts.Close()

	resp, err := ts.Client().Post(ts.URL+"/api/play.json", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("POST status = %d, want 405", resp.StatusCode)
	}
}

func TestCORSAllowlist(t *testing.T) {
	ts := newTestServer([]string{"https://sr.hoshivel.com"})
	defer ts.Close()

	allowed := get(t, ts, "/api/play.json", "https://sr.hoshivel.com")
	defer allowed.Body.Close()
	if got := allowed.Header.Get("Access-Control-Allow-Origin"); got != "https://sr.hoshivel.com" {
		t.Errorf("allowed origin ACAO = %q, want https://sr.hoshivel.com", got)
	}

	denied := get(t, ts, "/api/play.json", "https://evil.example")
	defer denied.Body.Close()
	if got := denied.Header.Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("disallowed origin ACAO = %q, want empty", got)
	}
}

func TestCORSDevAllowsAny(t *testing.T) {
	ts := newTestServer(nil) // no allowlist = dev
	defer ts.Close()

	resp := get(t, ts, "/api/play.json", "https://anything.example")
	defer resp.Body.Close()
	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("dev ACAO = %q, want *", got)
	}
}

func TestCORSPreflight(t *testing.T) {
	ts := newTestServer([]string{"https://sr.hoshivel.com"})
	defer ts.Close()

	req, err := http.NewRequest(http.MethodOptions, ts.URL+"/api/play.json", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Origin", "https://sr.hoshivel.com")
	resp, err := ts.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Errorf("preflight status = %d, want 204", resp.StatusCode)
	}
}

func newGeoServer(regions []config.Region, max int) *httptest.Server {
	store := config.NewStore(config.File{
		Regions:       regions,
		MaxCandidates: max,
		Geo:           config.GeoConfig{TrustProxyHeaders: true},
	}, "")
	rt := router.New(store.Config())
	return httptest.NewServer(New(store, rt).Handler())
}

func TestPlayGeoSelectionAndCap(t *testing.T) {
	regions := []config.Region{
		{ID: "hk1", Host: "hk1", URL: "https://hk1/", Country: "HK"},
		{ID: "jp1", Host: "jp1", URL: "https://jp1/", Country: "JP"},
		{ID: "sg1", Host: "sg1", URL: "https://sg1/", Country: "SG"},
		{ID: "us1", Host: "us1", URL: "https://us1/", Country: "US"},
	}
	ts := newGeoServer(regions, 2)
	defer ts.Close()

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/play.json", nil)
	req.Header.Set("CF-IPCountry", "SG")
	resp, err := ts.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	var got play.Response
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(got.Regions) != 2 {
		t.Fatalf("want 2 candidates (capped), got %d: %+v", len(got.Regions), got.Regions)
	}
	if got.Regions[0].ID != "sg1" {
		t.Errorf("nearest to SG should be sg1 first, got %s", got.Regions[0].ID)
	}
	if got.RecommendedID != "sg1" {
		t.Errorf("recommendedId = %q, want sg1 (backend-chosen entry point)", got.RecommendedID)
	}
	// 不應暴露所有 4 個節點（收斂）。
	if len(got.Regions) == len(regions) {
		t.Errorf("should not return all nodes")
	}
}

func TestPlayCapWithoutGeo(t *testing.T) {
	regions := []config.Region{
		{ID: "a", Host: "a", URL: "https://a/"},
		{ID: "b", Host: "b", URL: "https://b/"},
		{ID: "c", Host: "c", URL: "https://c/"},
	}
	// 無 geo 設定 → trust off；候選仍收斂到 MaxCandidates。
	store := config.NewStore(config.File{Regions: regions, MaxCandidates: 2}, "")
	rt := router.New(store.Config())
	ts := httptest.NewServer(New(store, rt).Handler())
	defer ts.Close()

	resp := get(t, ts, "/api/play.json", "")
	defer resp.Body.Close()
	var got play.Response
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(got.Regions) != 2 {
		t.Errorf("cap without geo = %d, want 2", len(got.Regions))
	}
}
