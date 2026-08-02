// Package server 把 HTTP 路由接到分流 router：/healthz 存活探針、
// GET /api/play.json（＋ /api/play 別名）回傳即時節點快照、CORS 收斂到設定的來源。
package server

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/hoshivel/sr-web/backend/internal/config"
	"github.com/hoshivel/sr-web/backend/internal/dispatch"
	"github.com/hoshivel/sr-web/backend/internal/geo"
	"github.com/hoshivel/sr-web/backend/internal/logging"
	"github.com/hoshivel/sr-web/backend/internal/router"
)

// Server 持有即時設定 Store 與分流 router。設定（CORS 來源 / 地理 / 候選上限）皆
// 於每次請求時向 Store 讀取，故後臺動態調整即時生效。
type Server struct {
	store *config.Store
	rt    *router.Router
	log   *logging.Logger
}

// New 建立 Server。log 為 nil 時丟棄輸出，測試因此不必為了建一個 Server 而先
// 決定日誌要往哪去。
func New(store *config.Store, rt *router.Router, log *logging.Logger) *Server {
	if log == nil {
		log = logging.Discard()
	}
	return &Server{store: store, rt: rt, log: log}
}

// Handler 回傳已註冊所有路由的根 HTTP handler。
//
// 本服務不自帶後臺：管理一律經 hoshi-admin 的控制平面（見 internal/adminplane），
// 由平臺以 Hoshi ID 認證操作者並簽章呼叫。早期版本曾在 /admin 掛一套本地帳密後臺，
// 那是平臺化之前的遺留——它是唯一一條繞過平臺身分權威的入口，已移除。
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.handleHealth)

	// Play 分流 API（CORS 包裹供跨源前端呼叫）。同一 handler 同時服務
	// /api/play.json（前端現行 fetch 目標）與 /api/play 別名。
	api := http.NewServeMux()
	api.HandleFunc("/api/play.json", s.handlePlay)
	api.HandleFunc("/api/play", s.handlePlay)
	mux.Handle("/api/", s.cors(api))

	return s.withObservability(mux)
}

// handleHealth 是後端自身的存活探針（純文字 ok；與遊戲後端一致）。
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

// handlePlay 回傳為此用戶收斂後的候選節點（play.Response）。後端依用戶地理座標
// （反代 / CDN geo 標頭）就近排序，只回傳前 MaxCandidates 個候選＋建議入點 id——
// 不再全敞開所有節點。這是即時、依請求而異的分流決策，故設 no-store 避免被快取。
func (s *Server) handlePlay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	nodes, updatedAt := s.rt.DispatchNodes()
	client, ok := geo.Resolve(r.Header, s.store.Geo())
	resp := dispatch.Select(nodes, client, ok, s.store.MaxCandidates(), updatedAt)

	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, resp)
}

// cors 包裹 Play API。未設定 allowlist 時放行任意來源（dev）；設定後只有清單內的
// 來源會收到 CORS 標頭，跨源瀏覽器被擋（prod 收斂）。對齊遊戲後端 cors 慣例。
func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowed := s.store.AllowedOrigins()
		if len(allowed) == 0 {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else if origin != "" && originAllowed(allowed, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// originAllowed 回報一個瀏覽器來源是否在 allowlist 內（含 scheme 的精確比對，
// 忽略尾端斜線與大小寫）。
func originAllowed(allowlist []string, origin string) bool {
	for _, o := range allowlist {
		if strings.EqualFold(strings.TrimRight(o, "/"), strings.TrimRight(origin, "/")) {
			return true
		}
	}
	return false
}

// writeJSON 以指定狀態碼輸出 JSON。
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeErr 輸出 JSON 錯誤信封。
func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
