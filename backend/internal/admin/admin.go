// Package admin 提供 sr-web 分流後端的網頁後臺：可視化配置、登入保護、與節點 /
// 設定的動態管理。所有變更經 config.Store 持久化並即時套用（router 重探）。
//
// 路由（皆掛在 /admin 之下，同源、不經 CORS）：
//
//	GET    /admin                     後臺單頁（setup / 登入 / 儀表板由前端依 session 切換）
//	GET    /admin/api/session         查詢是否需 setup / 是否已登入（免授權）
//	POST   /admin/api/setup           首次以 setup token 建立管理員帳密
//	POST   /admin/api/login           登入（設 session cookie）
//	POST   /admin/api/logout          登出
//	GET    /admin/api/state           即時節點狀態＋設定（需授權）
//	POST   /admin/api/regions         新增 / 更新節點（需授權）
//	DELETE /admin/api/regions/{id}    刪除節點（需授權）
//	POST   /admin/api/regions/{id}/disabled  停用 / 啟用節點（需授權）
//	PUT    /admin/api/settings        更新可調設定（需授權）
//	POST   /admin/api/password        變更管理員密碼（需授權）
//	POST   /admin/api/reprobe         立即重探（需授權）
package admin

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/moehoshio/sr-web/backend/internal/config"
	"github.com/moehoshio/sr-web/backend/internal/router"
)

//go:embed ui.html
var uiHTML []byte

const (
	cookieName  = "sr_admin"
	sessionTTL  = 12 * time.Hour
	minPassword = 8
)

// Admin 是後臺處理器。
type Admin struct {
	store    *config.Store
	rt       *router.Router
	sessions *sessions
	notes    []string

	// setupToken 於「後臺尚未設定帳密」時產生（僅存記憶體、印於啟動日誌），用來授權
	// 首次建立管理員；設定完成後即失效。
	setupToken string
}

// New 建立後臺處理器。若後臺尚未設定帳密，產生一次性 setup token 並記錄於 Notes。
func New(store *config.Store, rt *router.Router) *Admin {
	a := &Admin{store: store, rt: rt, sessions: newSessions(sessionTTL)}
	if store.Admin().Configured() {
		a.notes = append(a.notes, "後臺：已設定管理員，/admin 可登入。")
	} else {
		a.setupToken = randToken(16)
		a.notes = append(a.notes,
			"後臺：尚未設定管理員。請開啟 /admin，並以此 setup token 建立帳密：",
			"  setup token = "+a.setupToken)
	}
	return a
}

// Notes 回傳供啟動日誌輸出的訊息（含 setup token）。
func (a *Admin) Notes() []string { return append([]string(nil), a.notes...) }

// Handler 回傳後臺的 HTTP handler（Go 1.22 method-aware ServeMux）。
func (a *Admin) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /admin", a.handlePage)
	mux.HandleFunc("GET /admin/", a.handlePage)

	mux.HandleFunc("GET /admin/api/session", a.handleSession)
	mux.HandleFunc("POST /admin/api/setup", a.handleSetup)
	mux.HandleFunc("POST /admin/api/login", a.handleLogin)
	mux.HandleFunc("POST /admin/api/logout", a.handleLogout)

	mux.HandleFunc("GET /admin/api/state", a.auth(a.handleState))
	mux.HandleFunc("POST /admin/api/regions", a.auth(a.handleUpsertRegion))
	mux.HandleFunc("DELETE /admin/api/regions/{id}", a.auth(a.handleDeleteRegion))
	mux.HandleFunc("POST /admin/api/regions/{id}/disabled", a.auth(a.handleDisableRegion))
	mux.HandleFunc("PUT /admin/api/settings", a.auth(a.handleUpdateSettings))
	mux.HandleFunc("POST /admin/api/password", a.auth(a.handleChangePassword))
	mux.HandleFunc("POST /admin/api/reprobe", a.auth(a.handleReprobe))
	return mux
}

// --- 頁面 / session ---

func (a *Admin) handlePage(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	// 後臺頁不外送任何第三方資源；禁止被 iframe 嵌入。
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Referrer-Policy", "no-referrer")
	_, _ = w.Write(uiHTML)
}

func (a *Admin) handleSession(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"needsSetup":    !a.store.Admin().Configured(),
		"authenticated": a.authenticated(r),
	})
}

type setupReq struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	Password string `json:"password"`
}

func (a *Admin) handleSetup(w http.ResponseWriter, r *http.Request) {
	if !sameOrigin(r) {
		writeErr(w, http.StatusForbidden, "cross-origin blocked")
		return
	}
	if a.store.Admin().Configured() {
		writeErr(w, http.StatusConflict, "後臺已設定，無法重複 setup")
		return
	}
	var in setupReq
	if !readJSON(w, r, &in) {
		return
	}
	if a.setupToken == "" || !constEq(in.Token, a.setupToken) {
		writeErr(w, http.StatusForbidden, "setup token 不正確")
		return
	}
	if err := validateCreds(in.Username, in.Password); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	creds, err := hashPassword(strings.TrimSpace(in.Username), in.Password)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "雜湊失敗")
		return
	}
	if err := a.store.SetAdmin(creds); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.setupToken = "" // 一次性，設定完成即失效
	a.issueSession(w, r)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type loginReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (a *Admin) handleLogin(w http.ResponseWriter, r *http.Request) {
	if !sameOrigin(r) {
		writeErr(w, http.StatusForbidden, "cross-origin blocked")
		return
	}
	var in loginReq
	if !readJSON(w, r, &in) {
		return
	}
	if !verifyPassword(a.store.Admin(), strings.TrimSpace(in.Username), in.Password) {
		writeErr(w, http.StatusUnauthorized, "帳號或密碼錯誤")
		return
	}
	a.issueSession(w, r)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *Admin) handleLogout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(cookieName); err == nil {
		a.sessions.destroy(c.Value)
	}
	clearCookie(w, r)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// --- 狀態 / 動態管理 ---

// stateRegion 是後臺列出的節點：靜態設定＋即時探活狀態合併。
type stateRegion struct {
	ID        string  `json:"id"`
	Host      string  `json:"host"`
	URL       string  `json:"url"`
	HealthURL string  `json:"healthUrl"`
	Country   string  `json:"country"`
	Lat       float64 `json:"lat"`
	Lon       float64 `json:"lon"`
	Disabled  bool    `json:"disabled"`
	HasCoord  bool    `json:"hasCoord"`
	Healthy   bool    `json:"healthy"`
	LatencyMS int     `json:"latencyMs"`
	Load      float64 `json:"load"`
}

func (a *Admin) handleState(w http.ResponseWriter, _ *http.Request) {
	snap := a.rt.Snapshot()
	live := make(map[string]struct {
		healthy bool
		latency int
		load    float64
	}, len(snap.Regions))
	for _, r := range snap.Regions {
		live[r.ID] = struct {
			healthy bool
			latency int
			load    float64
		}{r.Healthy, r.LatencyMS, r.Load}
	}

	regions := a.store.Regions()
	out := make([]stateRegion, len(regions))
	for i, rc := range regions {
		coord, hasCoord := rc.Coord()
		sr := stateRegion{
			ID: rc.ID, Host: rc.Host, URL: rc.URL, HealthURL: rc.HealthURL,
			Country: rc.Country, Lat: rc.Lat, Lon: rc.Lon, Disabled: rc.Disabled,
			HasCoord: hasCoord,
		}
		if hasCoord && rc.Lat == 0 && rc.Lon == 0 {
			// 座標由國別碼推導：回填以利前端顯示。
			sr.Lat, sr.Lon = coord.Lat, coord.Lon
		}
		if l, ok := live[rc.ID]; ok {
			sr.Healthy, sr.LatencyMS, sr.Load = l.healthy, l.latency, l.load
		}
		out[i] = sr
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"regions":       out,
		"settings":      a.store.Settings(),
		"adminUsername": a.store.Admin().Username,
		"recommendedId": snap.RecommendedID,
		"updatedAt":     snap.UpdatedAt,
	})
}

func (a *Admin) handleUpsertRegion(w http.ResponseWriter, r *http.Request) {
	var in config.Region
	if !readJSON(w, r, &in) {
		return
	}
	in.ID = strings.TrimSpace(in.ID)
	if err := a.store.UpsertRegion(in); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *Admin) handleDeleteRegion(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := a.store.DeleteRegion(id); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type disableReq struct {
	Disabled bool `json:"disabled"`
}

func (a *Admin) handleDisableRegion(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var in disableReq
	if !readJSON(w, r, &in) {
		return
	}
	if err := a.store.SetRegionDisabled(id, in.Disabled); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *Admin) handleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var in config.Settings
	if !readJSON(w, r, &in) {
		return
	}
	if err := a.store.UpdateSettings(in); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type passwordReq struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (a *Admin) handleChangePassword(w http.ResponseWriter, r *http.Request) {
	var in passwordReq
	if !readJSON(w, r, &in) {
		return
	}
	cur := a.store.Admin()
	if !verifyPassword(cur, cur.Username, in.CurrentPassword) {
		writeErr(w, http.StatusUnauthorized, "目前密碼錯誤")
		return
	}
	if len(in.NewPassword) < minPassword {
		writeErr(w, http.StatusBadRequest, "新密碼至少 8 字元")
		return
	}
	creds, err := hashPassword(cur.Username, in.NewPassword)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "雜湊失敗")
		return
	}
	if err := a.store.SetAdmin(creds); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *Admin) handleReprobe(w http.ResponseWriter, _ *http.Request) {
	a.rt.Reprobe()
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// --- 授權 / 工具 ---

// auth 包裹需登入的 handler：驗 session，並對變更請求做同源檢查（縱深防禦，
// 搭配 SameSite=Strict cookie）。
func (a *Admin) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !a.authenticated(r) {
			writeErr(w, http.StatusUnauthorized, "未授權")
			return
		}
		if r.Method != http.MethodGet && !sameOrigin(r) {
			writeErr(w, http.StatusForbidden, "cross-origin blocked")
			return
		}
		next(w, r)
	}
}

func (a *Admin) authenticated(r *http.Request) bool {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return false
	}
	return a.sessions.valid(c.Value)
}

func (a *Admin) issueSession(w http.ResponseWriter, r *http.Request) {
	tok := a.sessions.create()
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    tok,
		Path:     "/admin",
		HttpOnly: true,
		Secure:   isHTTPS(r),
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(sessionTTL / time.Second),
	})
}

func clearCookie(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/admin",
		HttpOnly: true,
		Secure:   isHTTPS(r),
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
	})
}

// isHTTPS 判斷請求是否經 TLS（含 TLS-終止反代的 X-Forwarded-Proto）。
func isHTTPS(r *http.Request) bool {
	return r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

// sameOrigin 回報變更請求是否為同源：Origin（或退回 Referer）之 host 與請求 Host
// 相符。無 Origin/Referer 的非瀏覽器客戶端（如 curl）放行——SameSite=Strict cookie
// 已阻擋跨站瀏覽器攜帶憑證。
func sameOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		if ref := r.Header.Get("Referer"); ref != "" {
			origin = ref
		} else {
			return true
		}
	}
	host := hostOf(origin)
	return host != "" && strings.EqualFold(host, r.Host)
}

// hostOf 從一個 URL 字串取 host[:port]（不引入 net/url 的完整解析亦可，但用它更穩）。
func hostOf(raw string) string {
	// 去 scheme
	if i := strings.Index(raw, "://"); i >= 0 {
		raw = raw[i+3:]
	}
	// 去 path
	if i := strings.IndexByte(raw, '/'); i >= 0 {
		raw = raw[:i]
	}
	return raw
}

// validateCreds 檢查建立帳密的基本規則。
func validateCreds(username, password string) error {
	if strings.TrimSpace(username) == "" {
		return fmt.Errorf("使用者名稱不可為空")
	}
	if len(password) < minPassword {
		return fmt.Errorf("密碼至少 %d 字元", minPassword)
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// readJSON 解析請求 JSON body（限制大小）；失敗時已寫出 400 並回 false。
func readJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	defer func() { _ = r.Body.Close() }()
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		writeErr(w, http.StatusBadRequest, "無效的 JSON："+err.Error())
		return false
	}
	return true
}
