// Command router 是 sr-web 分流後端的進入點。
//
// 它對設定的遊戲節點做背景探活，並在 GET /api/play.json 回傳即時、與前端契約
// （src/lib/play.ts）同形狀的節點快照——讓前端 Play 啟動器無痛從 mock 靜態檔
// 切換到真實後端。設定來源為設定檔（config.json）與 CLI flags。
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/moehoshio/sr-web/backend/internal/admin"
	"github.com/moehoshio/sr-web/backend/internal/config"
	"github.com/moehoshio/sr-web/backend/internal/router"
	"github.com/moehoshio/sr-web/backend/internal/server"
)

func main() {
	store, err := config.LoadStore(os.Args[1:])
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	cfg := store.Config()
	for _, n := range store.Notes() {
		log.Print(n)
	}

	// 訊號取消貫穿探活迴圈與 HTTP 伺服器的優雅關閉。
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	rt := router.New(cfg)
	// 後臺動態增刪改節點時，即時替換探活清單並重探。
	store.OnRegionsChange(rt.SetRegions)
	go rt.Run(ctx)

	// 後臺（可視化配置 / 登入 / 動態管理）。未設定帳密時，首個請求進 setup 引導；
	// setup token 印於下方日誌。
	adminH := admin.New(store, rt)
	for _, n := range adminH.Notes() {
		log.Print(n)
	}

	srv := server.New(store, rt)
	httpSrv := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           srv.Handler(adminH.Handler()),
		ReadHeaderTimeout: 5 * time.Second,
	}

	// 收到訊號時優雅關閉。
	go func() {
		<-ctx.Done()
		shutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = httpSrv.Shutdown(shutCtx)
	}()

	log.Printf("sr-web 分流後端監聽於 %s（%d 個節點，每 %s 探活一次）", cfg.ListenAddr, len(cfg.Regions), cfg.ProbeInterval)
	if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server: %v", err)
	}
}
