package admin

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/moehoshio/sr-web/backend/internal/config"
	"github.com/moehoshio/sr-web/backend/internal/router"
)

// harness 建立「store ← wired → router ← admin」的整組後臺，並回傳 httptest server、
// admin 實例與 store，供端到端驅動。
type harness struct {
	ts    *httptest.Server
	admin *Admin
	store *config.Store
	rt    *router.Router
}

func newHarness(t *testing.T, seed config.File) *harness {
	t.Helper()
	path := filepath.Join(t.TempDir(), "config.json")
	store := config.NewStore(seed, path)
	rt := router.New(store.Config())
	store.OnRegionsChange(rt.SetRegions)
	a := New(store, rt)
	ts := httptest.NewServer(a.Handler())
	t.Cleanup(ts.Close)
	return &harness{ts: ts, admin: a, store: store, rt: rt}
}

// client 回傳帶 cookie jar 的 HTTP client（保存 session cookie）。
func newClient(t *testing.T) *http.Client {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	return &http.Client{Jar: jar}
}

func do(t *testing.T, c *http.Client, method, url string, body any) (int, map[string]any) {
	t.Helper()
	var rdr *bytes.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		rdr = bytes.NewReader(raw)
	} else {
		rdr = bytes.NewReader(nil)
	}
	req, err := http.NewRequest(method, url, rdr)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var out map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&out)
	return resp.StatusCode, out
}

// setupToken 從 admin 的啟動 Notes 抽出 setup token。
func (h *harness) setupToken(t *testing.T) string {
	t.Helper()
	for _, n := range h.admin.Notes() {
		if i := strings.Index(n, "setup token = "); i >= 0 {
			return strings.TrimSpace(n[i+len("setup token = "):])
		}
	}
	t.Fatal("setup token not found in notes")
	return ""
}

func TestAdminSetupLoginFlow(t *testing.T) {
	h := newHarness(t, config.File{Regions: []config.Region{{ID: "hk1", URL: "https://hk1/"}}})
	c := newClient(t)
	api := h.ts.URL

	// 1) session：需 setup、未登入。
	code, s := do(t, c, "GET", api+"/admin/api/session", nil)
	if code != 200 || s["needsSetup"] != true || s["authenticated"] != false {
		t.Fatalf("session before setup = %d %+v", code, s)
	}

	// 2) 錯誤 token → 403。
	code, _ = do(t, c, "POST", api+"/admin/api/setup", map[string]any{"token": "wrong", "username": "root", "password": "longenough"})
	if code != 403 {
		t.Fatalf("bad token setup = %d, want 403", code)
	}

	// 3) 密碼太短 → 400。
	tok := h.setupToken(t)
	code, _ = do(t, c, "POST", api+"/admin/api/setup", map[string]any{"token": tok, "username": "root", "password": "short"})
	if code != 400 {
		t.Fatalf("short password setup = %d, want 400", code)
	}

	// 4) 正確 setup → 200 + cookie。
	code, _ = do(t, c, "POST", api+"/admin/api/setup", map[string]any{"token": tok, "username": "root", "password": "longenough"})
	if code != 200 {
		t.Fatalf("setup = %d, want 200", code)
	}
	if !h.store.Admin().Configured() {
		t.Errorf("store admin should be configured after setup")
	}

	// 5) session：已登入、無需 setup。
	code, s = do(t, c, "GET", api+"/admin/api/session", nil)
	if s["authenticated"] != true || s["needsSetup"] != false {
		t.Fatalf("session after setup = %+v", s)
	}

	// 6) 重複 setup → 409。
	code, _ = do(t, c, "POST", api+"/admin/api/setup", map[string]any{"token": tok, "username": "x", "password": "longenough"})
	if code != 409 {
		t.Errorf("repeat setup = %d, want 409", code)
	}

	// 7) 未帶 cookie 的 client 存取 state → 401。
	anon := newClient(t)
	code, _ = do(t, anon, "GET", api+"/admin/api/state", nil)
	if code != 401 {
		t.Errorf("unauthenticated state = %d, want 401", code)
	}

	// 8) 錯誤登入 → 401；正確登入 → 200。
	code, _ = do(t, anon, "POST", api+"/admin/api/login", map[string]any{"username": "root", "password": "nope"})
	if code != 401 {
		t.Errorf("bad login = %d, want 401", code)
	}
	code, _ = do(t, anon, "POST", api+"/admin/api/login", map[string]any{"username": "root", "password": "longenough"})
	if code != 200 {
		t.Errorf("good login = %d, want 200", code)
	}
}

func TestAdminDynamicManagement(t *testing.T) {
	h := newHarness(t, config.File{Regions: []config.Region{{ID: "hk1", URL: "https://hk1/", Country: "HK"}}})
	c := newClient(t)
	api := h.ts.URL
	tok := h.setupToken(t)
	do(t, c, "POST", api+"/admin/api/setup", map[string]any{"token": tok, "username": "root", "password": "longenough"})

	// 新增節點 → router 也應收到（OnRegionsChange → SetRegions）。
	code, _ := do(t, c, "POST", api+"/admin/api/regions", map[string]any{"id": "jp1", "host": "jp1", "url": "https://jp1/", "country": "JP"})
	if code != 200 {
		t.Fatalf("add region = %d, want 200", code)
	}
	if len(h.store.Regions()) != 2 {
		t.Errorf("store should have 2 regions")
	}
	foundInRouter := false
	for _, r := range h.rt.Snapshot().Regions {
		if r.ID == "jp1" {
			foundInRouter = true
		}
	}
	if !foundInRouter {
		t.Errorf("router did not pick up added region (wiring broken)")
	}

	// state 應列出兩節點。
	code, st := do(t, c, "GET", api+"/admin/api/state", nil)
	if code != 200 {
		t.Fatalf("state = %d", code)
	}
	if regs, ok := st["regions"].([]any); !ok || len(regs) != 2 {
		t.Errorf("state regions = %v", st["regions"])
	}

	// 停用 jp1 → 不在 router 探活清單。
	code, _ = do(t, c, "POST", api+"/admin/api/regions/jp1/disabled", map[string]any{"disabled": true})
	if code != 200 {
		t.Fatalf("disable = %d", code)
	}
	for _, r := range h.rt.Snapshot().Regions {
		if r.ID == "jp1" {
			t.Errorf("disabled region should not be in router snapshot")
		}
	}

	// 更新設定。
	code, _ = do(t, c, "PUT", api+"/admin/api/settings", map[string]any{"maxCandidates": 2, "probeIntervalSeconds": 15, "geo": map[string]any{"trustProxyHeaders": true}})
	if code != 200 {
		t.Fatalf("settings = %d", code)
	}
	if h.store.MaxCandidates() != 2 || !h.store.Geo().TrustProxyHeaders {
		t.Errorf("settings not applied: max=%d geo=%v", h.store.MaxCandidates(), h.store.Geo().TrustProxyHeaders)
	}

	// 刪除 hk1。
	code, _ = do(t, c, "DELETE", api+"/admin/api/regions/hk1", nil)
	if code != 200 {
		t.Fatalf("delete = %d", code)
	}
	if len(h.store.Regions()) != 1 {
		t.Errorf("after delete store should have 1 region")
	}

	// 變更密碼：錯誤 current → 401；正確 → 200。
	code, _ = do(t, c, "POST", api+"/admin/api/password", map[string]any{"currentPassword": "wrong", "newPassword": "brandnewpass"})
	if code != 401 {
		t.Errorf("bad current password = %d, want 401", code)
	}
	code, _ = do(t, c, "POST", api+"/admin/api/password", map[string]any{"currentPassword": "longenough", "newPassword": "brandnewpass"})
	if code != 200 {
		t.Errorf("change password = %d, want 200", code)
	}

	// 登出 → state 401。
	do(t, c, "POST", api+"/admin/api/logout", nil)
	code, _ = do(t, c, "GET", api+"/admin/api/state", nil)
	if code != 401 {
		t.Errorf("after logout state = %d, want 401", code)
	}
}

func TestAdminPageServed(t *testing.T) {
	h := newHarness(t, config.File{})
	resp, err := http.Get(h.ts.URL + "/admin")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("GET /admin = %d", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); !strings.Contains(ct, "text/html") {
		t.Errorf("content-type = %q", ct)
	}
	buf := new(bytes.Buffer)
	_, _ = buf.ReadFrom(resp.Body)
	if !strings.Contains(buf.String(), "分流後臺") {
		t.Errorf("admin page missing expected content")
	}
}

func TestAdminCrossOriginBlocked(t *testing.T) {
	h := newHarness(t, config.File{})
	c := newClient(t)
	api := h.ts.URL
	tok := h.setupToken(t)
	do(t, c, "POST", api+"/admin/api/setup", map[string]any{"token": tok, "username": "root", "password": "longenough"})

	// 帶偽造跨源 Origin 的變更請求應被擋（縱深防禦）。
	req, _ := http.NewRequest("POST", api+"/admin/api/regions", bytes.NewReader([]byte(`{"id":"x","url":"https://x/"}`)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "https://evil.example")
	resp, err := c.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 403 {
		t.Errorf("cross-origin mutation = %d, want 403", resp.StatusCode)
	}
}
