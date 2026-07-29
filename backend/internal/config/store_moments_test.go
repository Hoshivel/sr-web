package config

import (
	"path/filepath"
	"testing"
)

func newMomentStore(t *testing.T) *Store {
	t.Helper()
	f := defaultFile()
	f.Regions = nil
	return NewStore(f, filepath.Join(t.TempDir(), "config.json"))
}

func regionByID(t *testing.T, st *Store, id string) Region {
	t.Helper()
	for _, r := range st.Regions() {
		if r.ID == id {
			return r
		}
	}
	t.Fatalf("region %q 不存在", id)
	return Region{}
}

// TestRegionCreatedAtIsStampedOnceCovers 節點登錄時點：設定檔沒有其他時間欄位，
// 這一刻不記就永遠取不回來；而且它屬於「當初加進來的那一刻」，不該隨編輯而變。
func TestRegionCreatedAtIsStampedOnce(t *testing.T) {
	st := newMomentStore(t)
	if err := st.UpsertRegion(Region{ID: "hk1", Host: "hk1.example.test", URL: "https://hk1.example.test/play"}); err != nil {
		t.Fatal(err)
	}
	created := regionByID(t, st, "hk1").CreatedAt
	if created == "" {
		t.Fatal("新節點沒有 CreatedAt")
	}

	// 編輯既有節點：連呼叫端刻意送進來的值也要被忽略，否則一次後臺編輯就能改掉它。
	if err := st.UpsertRegion(Region{ID: "hk1", Host: "hk1b.example.test", URL: "https://hk1.example.test/play", CreatedAt: "2001-01-01T00:00:00Z"}); err != nil {
		t.Fatal(err)
	}
	after := regionByID(t, st, "hk1")
	if after.CreatedAt != created {
		t.Errorf("編輯移動了 CreatedAt：%q → %q", created, after.CreatedAt)
	}
	if after.Host != "hk1b.example.test" {
		t.Errorf("編輯沒有生效：%q", after.Host)
	}
}

// TestRegionDisabledAtStampedAndCleared 覆蓋「只有 bool、沒有時點」這個漏法。
func TestRegionDisabledAtStampedAndCleared(t *testing.T) {
	st := newMomentStore(t)
	if err := st.UpsertRegion(Region{ID: "hk1", Host: "hk1.example.test", URL: "https://hk1.example.test/play"}); err != nil {
		t.Fatal(err)
	}
	if got := regionByID(t, st, "hk1").DisabledAt; got != "" {
		t.Errorf("啟用中的節點帶著 DisabledAt：%q", got)
	}

	if err := st.SetRegionDisabled("hk1", true); err != nil {
		t.Fatal(err)
	}
	off := regionByID(t, st, "hk1").DisabledAt
	if off == "" {
		t.Fatal("停用沒有記下時點")
	}

	// 停用中做無關編輯不該移動日期，否則這個值會退化成「最後一次編輯時間」。
	if err := st.UpsertRegion(Region{ID: "hk1", Host: "hk1c.example.test", URL: "https://hk1.example.test/play", Disabled: true}); err != nil {
		t.Fatal(err)
	}
	if got := regionByID(t, st, "hk1").DisabledAt; got != off {
		t.Errorf("無關編輯移動了 DisabledAt：%q → %q", off, got)
	}

	// 重新啟用要清空，否則會讀成「目前停用中，自 … 起」。
	if err := st.SetRegionDisabled("hk1", false); err != nil {
		t.Fatal(err)
	}
	if got := regionByID(t, st, "hk1").DisabledAt; got != "" {
		t.Errorf("啟用後 DisabledAt 仍殘留：%q", got)
	}
}

// TestRegionCreatedDisabledIsStamped：一開始就以停用狀態登錄的節點也要有時點。
func TestRegionCreatedDisabledIsStamped(t *testing.T) {
	st := newMomentStore(t)
	if err := st.UpsertRegion(Region{ID: "hk2", Host: "hk2.example.test", URL: "https://hk2.example.test/play", Disabled: true}); err != nil {
		t.Fatal(err)
	}
	r := regionByID(t, st, "hk2")
	if r.CreatedAt == "" {
		t.Error("新節點沒有 CreatedAt")
	}
	if r.DisabledAt == "" {
		t.Error("以停用狀態登錄的節點沒有 DisabledAt")
	}
}
