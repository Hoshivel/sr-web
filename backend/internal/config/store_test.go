package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func newStore(t *testing.T, file File) (*Store, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "config.json")
	return NewStore(file, path), path
}

func readBack(t *testing.T, path string) File {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read persisted: %v", err)
	}
	var f File
	if err := json.Unmarshal(raw, &f); err != nil {
		t.Fatalf("unmarshal persisted: %v", err)
	}
	return f
}

func TestStoreUpsertRegionPersistsAndNotifies(t *testing.T) {
	st, path := newStore(t, File{Regions: []Region{{ID: "hk1", URL: "https://hk1/"}}})

	var notified [][]Region
	st.OnRegionsChange(func(rs []Region) { notified = append(notified, rs) })

	// 更新既有節點。
	if err := st.UpsertRegion(Region{ID: "hk1", Host: "hk1.new", URL: "https://hk1.new/"}); err != nil {
		t.Fatalf("upsert existing: %v", err)
	}
	// 新增節點。
	if err := st.UpsertRegion(Region{ID: "jp1", URL: "https://jp1/"}); err != nil {
		t.Fatalf("upsert new: %v", err)
	}

	regs := st.Regions()
	if len(regs) != 2 {
		t.Fatalf("regions = %d, want 2", len(regs))
	}
	if regs[0].Host != "hk1.new" {
		t.Errorf("existing region not updated: %+v", regs[0])
	}
	if len(notified) != 2 {
		t.Errorf("expected 2 change notifications, got %d", len(notified))
	}
	// 持久化。
	if got := readBack(t, path); len(got.Regions) != 2 {
		t.Errorf("persisted regions = %d, want 2", len(got.Regions))
	}
}

func TestStoreDeleteRegion(t *testing.T) {
	st, _ := newStore(t, File{Regions: []Region{{ID: "a", URL: "u"}, {ID: "b", URL: "u"}}})
	if err := st.DeleteRegion("a"); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if regs := st.Regions(); len(regs) != 1 || regs[0].ID != "b" {
		t.Errorf("after delete = %+v, want [b]", regs)
	}
	if err := st.DeleteRegion("missing"); err == nil {
		t.Errorf("deleting missing region should error")
	}
}

func TestStoreSetRegionDisabled(t *testing.T) {
	st, _ := newStore(t, File{Regions: []Region{{ID: "a", URL: "u"}}})
	if err := st.SetRegionDisabled("a", true); err != nil {
		t.Fatalf("disable: %v", err)
	}
	if !st.Regions()[0].Disabled {
		t.Errorf("region should be disabled")
	}
	if err := st.SetRegionDisabled("nope", true); err == nil {
		t.Errorf("disabling missing region should error")
	}
}

func TestStoreUpdateSettings(t *testing.T) {
	st, path := newStore(t, File{})
	in := Settings{
		AllowedOrigins:       []string{"https://sr.hoshivel.com"},
		ProbeIntervalSeconds: 20,
		ProbeTimeoutSeconds:  4,
		MaxCandidates:        2,
		Geo:                  GeoConfig{TrustProxyHeaders: true},
	}
	if err := st.UpdateSettings(in); err != nil {
		t.Fatalf("update settings: %v", err)
	}
	if st.MaxCandidates() != 2 {
		t.Errorf("MaxCandidates = %d, want 2", st.MaxCandidates())
	}
	if !st.Geo().TrustProxyHeaders {
		t.Errorf("geo trust not applied")
	}
	if got := st.AllowedOrigins(); len(got) != 1 || got[0] != "https://sr.hoshivel.com" {
		t.Errorf("allowedOrigins = %v", got)
	}
	if got := readBack(t, path); got.ProbeIntervalSeconds != 20 {
		t.Errorf("persisted interval = %d, want 20", got.ProbeIntervalSeconds)
	}
	// settings 變更不應觸發 regions 通知。
	notified := false
	st.OnRegionsChange(func([]Region) { notified = true })
	_ = st.UpdateSettings(in)
	if notified {
		t.Errorf("settings change should not notify regions listener")
	}
}

func TestStoreValidateRejects(t *testing.T) {
	st, _ := newStore(t, File{Regions: []Region{{ID: "a", URL: "u"}}})
	// 重複 id。
	if err := st.UpsertRegion(Region{ID: "a", URL: ""}); err == nil {
		t.Errorf("empty url should be rejected")
	}
	// 直接塞重複 id 應被 validate 擋（透過 update）。
	if err := st.update(func(f *File) error {
		f.Regions = append(f.Regions, Region{ID: "a", URL: "u2"})
		return nil
	}); err == nil {
		t.Errorf("duplicate id should be rejected")
	}
	// 現狀不被破壞。
	if len(st.Regions()) != 1 {
		t.Errorf("failed update must not mutate state")
	}
}

func TestStoreFailedPersistDoesNotMutate(t *testing.T) {
	// path 指向不存在目錄 → 寫入失敗 → 現狀不變。
	st := NewStore(File{Regions: []Region{{ID: "a", URL: "u"}}}, "/nonexistent-dir-xyz/config.json")
	if err := st.UpsertRegion(Region{ID: "b", URL: "u"}); err == nil {
		t.Errorf("persist to bad path should error")
	}
	if len(st.Regions()) != 1 {
		t.Errorf("failed persist must not mutate in-memory state")
	}
}

func TestWriteConfigAtomicallyReplacesExistingFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	first := File{Regions: []Region{{ID: "a", URL: "https://a/"}}}
	second := File{Regions: []Region{{ID: "b", URL: "https://b/"}}}
	if err := writeConfig(path, first); err != nil {
		t.Fatal(err)
	}
	if err := writeConfig(path, second); err != nil {
		t.Fatal(err)
	}
	got := readBack(t, path)
	if len(got.Regions) != 1 || got.Regions[0].ID != "b" {
		t.Fatalf("replacement = %+v", got.Regions)
	}
	leftovers, err := filepath.Glob(filepath.Join(dir, ".config.json.tmp-*"))
	if err != nil {
		t.Fatal(err)
	}
	if len(leftovers) != 0 {
		t.Fatalf("temporary files left behind: %v", leftovers)
	}
}
