package adminplane_test

import (
	"context"
	"log/slog"
	"path/filepath"
	"testing"

	"github.com/hoshivel/hoshi-sdk/go/controlplane"
	"github.com/hoshivel/hoshi-sdk/go/kit/logging"
	"github.com/hoshivel/sr-web/backend/internal/adminplane"
	"github.com/hoshivel/sr-web/backend/internal/config"
)

// 診斷鍵是唯一直接作用在行程上、而不經過 config.Store 的設定，
// 所以值得單獨測：它們不能被寫回 config.json，也不能默默吃下壞值。
func diagnosticsAdapter(t *testing.T, level string) (*adminplane.Adapter, *logging.Logger) {
	t.Helper()
	opts := logging.Defaults()
	opts.Level = level
	opts.Console = discard{}
	log, err := logging.New(opts)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = log.Close() })

	store := config.NewStore(config.File{
		Listen:               config.Listen{Port: 8090},
		ProbeIntervalSeconds: 10,
		ProbeTimeoutSeconds:  3,
		MaxCandidates:        3,
	}, filepath.Join(t.TempDir(), "config.json"))
	return adminplane.New(store, &fakeRouter{}, "test", log), log
}

type discard struct{}

func (discard) Write(p []byte) (int, error) { return len(p), nil }

func TestDiagnosticsTogglesDebugAtRuntime(t *testing.T) {
	adapter, log := diagnosticsAdapter(t, logging.LevelInfo)

	res, err := adapter.ConfigPut(context.Background(), controlplane.ConfigPatch{
		Values: map[string]any{adminplane.KeyDebug: true},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !log.Debugging() {
		t.Fatal("debug mode did not take effect")
	}
	if !contains(res.Applied, adminplane.KeyDebug) {
		t.Fatalf("Applied = %v, want it to include %s", res.Applied, adminplane.KeyDebug)
	}

	// ConfigGet reports the live state, not what the file says — the whole point
	// of the section is to answer "is this service in debug mode right now".
	doc, err := adapter.ConfigGet(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if doc.Values[adminplane.KeyDebug] != true || doc.Values[adminplane.KeyLogLevel] != "debug" {
		t.Fatalf("ConfigGet does not report the live state: %v", doc.Values)
	}
}

// 同一份 patch 同時帶兩個鍵時，「關掉 debug、改到 warn」必須落在 warn，
// 而不是回到 debug 之前的那個層級。range 走 map 是隨機順序，所以這條會抓到
// 「照 patch 的迭代順序處理」的實作。
func TestDiagnosticsLevelAndDebugTogether(t *testing.T) {
	adapter, log := diagnosticsAdapter(t, logging.LevelInfo)
	log.SetDebug(true)

	if _, err := adapter.ConfigPut(context.Background(), controlplane.ConfigPatch{
		Values: map[string]any{
			adminplane.KeyLogLevel: "warn",
			adminplane.KeyDebug:    false,
		},
	}); err != nil {
		t.Fatal(err)
	}
	if log.Level() != slog.LevelWarn {
		t.Fatalf("level = %v, want warn", log.Level())
	}
}

func TestDiagnosticsRejectsBadValues(t *testing.T) {
	adapter, log := diagnosticsAdapter(t, logging.LevelInfo)

	for name, values := range map[string]map[string]any{
		"unknown level":  {adminplane.KeyLogLevel: "verbose"},
		"level not text": {adminplane.KeyLogLevel: 3},
		"empty level":    {adminplane.KeyLogLevel: "  "},
		"debug not bool": {adminplane.KeyDebug: "yes"},
	} {
		_, err := adapter.ConfigPut(context.Background(), controlplane.ConfigPatch{Values: values})
		if err == nil {
			t.Fatalf("%s: accepted", name)
		}
		// 呼叫端要被告知該修哪個欄位，而不只是「有東西錯了」。
		if _, ok := err.(*controlplane.ValidationError); !ok {
			t.Fatalf("%s: %v is not a field-level validation error", name, err)
		}
	}
	if log.Level() != slog.LevelInfo {
		t.Fatalf("a rejected patch changed the level to %v", log.Level())
	}
}

func contains(all []string, want string) bool {
	for _, v := range all {
		if v == want {
			return true
		}
	}
	return false
}
