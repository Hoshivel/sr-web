// Package server 把 HTTP 路由接到分流 router：/healthz 存活探針、
// GET /api/play.json（＋ /api/play 別名）回傳即時節點快照、CORS 收斂到設定的來源。
package server

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/moehoshio/sr-web/backend/internal/config"
	"github.com/moehoshio/sr-web/backend/internal/router"
)

// Server 持有設定與分流 router。
type Server struct {
	cfg config.Config
	rt  *router.Router
}

// New 建立 Server。
func New(cfg config.Config, rt *router.Router) *Server {
	return &Server{cfg: cfg, rt: rt}
}

// Handler 回傳已註冊所有路由的根 HTTP handler。
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.handleHealth)

	// Play 分流 API（CORS 包裹供跨源前端呼叫）。同一 handler 同時服務
	// /api/play.json（前端現行 fetch 目標）與 /api/play 別名。
	api := http.NewServeMux()
	api.HandleFunc("/api/play.json", s.handlePlay)
	api.HandleFunc("/api/play", s.handlePlay)
	mux.Handle("/api/", s.cors(api))

	return mux
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

// handlePlay 回傳即時的節點快照（play.Response）。這是即時分流資料，設 no-store
// 避免中介 / 瀏覽器快取住路由決策。
func (s *Server) handlePlay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, s.rt.Snapshot())
}

// cors 包裹 Play API。未設定 allowlist 時放行任意來源（dev）；設定後只有清單內的
// 來源會收到 CORS 標頭，跨源瀏覽器被擋（prod 收斂）。對齊遊戲後端 cors 慣例。
func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if len(s.cfg.AllowedOrigins) == 0 {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else if origin != "" && s.originAllowed(origin) {
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

// originAllowed 回報一個瀏覽器來源是否在設定的 allowlist 內（含 scheme 的精確比對，
// 忽略尾端斜線與大小寫）。
func (s *Server) originAllowed(origin string) bool {
	for _, o := range s.cfg.AllowedOrigins {
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
