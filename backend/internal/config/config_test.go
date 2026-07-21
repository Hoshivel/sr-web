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
	if len(cfg.Regions) != 3 {
		t.Errorf("Regions = %d, want 3 default", len(cfg.Regions))
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("default config not generated: %v", err)
	}
}

func TestLoadFromFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	f := File{
		Listen:               Listen{IP: "127.0.0.1", Port: 9000},
		AllowedOrigins:       []string{"https://sr.oha.li"},
		ProbeIntervalSeconds: 5,
		ProbeTimeoutSeconds:  2,
		Regions:              []Region{{ID: "hk1", Host: "hk1.svc.oha.li", URL: "https://hk1.svc.oha.li/"}},
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
	if len(cfg.AllowedOrigins) != 1 || cfg.AllowedOrigins[0] != "https://sr.oha.li" {
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
