package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestLoadGeneratesDefault(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	cfg, err := Load([]string{"-config", path})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.ListenAddr != ":8090" {
		t.Errorf("ListenAddr = %q, want :8090", cfg.ListenAddr)
	}
	if cfg.ProbeInterval != 10*time.Second {
		t.Errorf("ProbeInterval = %v, want 10s", cfg.ProbeInterval)
	}
	if cfg.ProbeTimeout != 3*time.Second {
		t.Errorf("ProbeTimeout = %v, want 3s", cfg.ProbeTimeout)
	}
	if len(cfg.Regions) != 1 || cfg.Regions[0].ID != "sr1" {
		t.Errorf("Regions = %+v, want the single default node sr1", cfg.Regions)
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("default config not generated: %v", err)
	}
}

func TestLoadFromFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	f := File{
		Listen:               Listen{IP: "127.0.0.1", Port: 9000},
		AllowedOrigins:       []string{"https://sr.hoshivel.com"},
		ProbeIntervalSeconds: 5,
		ProbeTimeoutSeconds:  2,
		Regions:              []Region{{ID: "hk1", Host: "hk1.svc.hoshivel.com", URL: "https://hk1.svc.hoshivel.com/"}},
	}
	raw, _ := json.Marshal(f)
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load([]string{"-config", path})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.ListenAddr != "127.0.0.1:9000" {
		t.Errorf("ListenAddr = %q, want 127.0.0.1:9000", cfg.ListenAddr)
	}
	if cfg.ProbeInterval != 5*time.Second {
		t.Errorf("ProbeInterval = %v, want 5s", cfg.ProbeInterval)
	}
	if len(cfg.AllowedOrigins) != 1 || cfg.AllowedOrigins[0] != "https://sr.hoshivel.com" {
		t.Errorf("AllowedOrigins = %v", cfg.AllowedOrigins)
	}
	if len(cfg.Regions) != 1 || cfg.Regions[0].ID != "hk1" {
		t.Errorf("Regions = %v", cfg.Regions)
	}
}

func TestFlagsOverrideFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	raw, _ := json.Marshal(File{Listen: Listen{Port: 9000}})
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load([]string{"-config", path, "-ip", "0.0.0.0", "-port", "9999"})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.ListenAddr != "0.0.0.0:9999" {
		t.Errorf("ListenAddr = %q, want 0.0.0.0:9999 (flags override file)", cfg.ListenAddr)
	}
}

func TestNonPositiveProbeFallsBackToDefault(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	raw, _ := json.Marshal(File{ProbeIntervalSeconds: 0, ProbeTimeoutSeconds: -1})
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load([]string{"-config", path})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.ProbeInterval != 10*time.Second {
		t.Errorf("ProbeInterval = %v, want 10s fallback", cfg.ProbeInterval)
	}
	if cfg.ProbeTimeout != 3*time.Second {
		t.Errorf("ProbeTimeout = %v, want 3s fallback", cfg.ProbeTimeout)
	}
}

func TestRegionCoord(t *testing.T) {
	// 精確座標優先。
	if c, ok := (Region{Lat: 22.32, Lon: 114.17}).Coord(); !ok || c.Lat != 22.32 || c.Lon != 114.17 {
		t.Errorf("explicit coord = %+v ok=%v", c, ok)
	}
	// 無精確座標 → 以國別碼近似。
	if c, ok := (Region{Country: "JP"}).Coord(); !ok || c.Lat == 0 {
		t.Errorf("country fallback = %+v ok=%v, want JP centroid", c, ok)
	}
	// 皆無 → 不可用。
	if _, ok := (Region{}).Coord(); ok {
		t.Errorf("no coord and no country should be unusable")
	}
	// 未知國別碼且無座標 → 不可用。
	if _, ok := (Region{Country: "ZZ"}).Coord(); ok {
		t.Errorf("unknown country should be unusable")
	}
}

func TestGeoConfigSettings(t *testing.T) {
	g := GeoConfig{
		TrustProxyHeaders: true,
		CountryCoords:     map[string][2]float64{"xx": {10, 20}},
	}
	s := g.Settings()
	if !s.TrustProxyHeaders {
		t.Errorf("trust flag not carried")
	}
	if s.LatHeader != "CF-IPLatitude" { // 補預設
		t.Errorf("default lat header not filled: %q", s.LatHeader)
	}
	if c, ok := s.CountryCoords["XX"]; !ok || c.Lat != 10 || c.Lon != 20 { // 鍵轉大寫
		t.Errorf("custom country coord = %+v ok=%v", c, ok)
	}
}

func TestMaxCandidatesDefault(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	// 預設產生的檔 MaxCandidates=3。
	cfg, err := Load([]string{"-config", path})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.MaxCandidates != 3 {
		t.Errorf("default MaxCandidates = %d, want 3", cfg.MaxCandidates)
	}
	// 非正值 → 退回預設。
	raw, _ := json.Marshal(File{MaxCandidates: 0})
	_ = os.WriteFile(path, raw, 0o644)
	cfg, _ = Load([]string{"-config", path})
	if cfg.MaxCandidates != 3 {
		t.Errorf("MaxCandidates=0 should fall back to 3, got %d", cfg.MaxCandidates)
	}
}

func TestDefaultRegionsHaveCoords(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	cfg, _ := Load([]string{"-config", path})
	for _, r := range cfg.Regions {
		if _, ok := r.Coord(); !ok {
			t.Errorf("default region %s missing usable coord", r.ID)
		}
	}
}
