// Command router 是 sr-web 分流後端的進入點。
//
// 它對設定的遊戲節點做背景探活，並在 GET /api/play.json 回傳即時、與前端契約
// （src/lib/play.ts）同形狀的節點快照——讓前端 Play 啟動器無痛從 mock 靜態檔
// 切換到真實後端。設定來源為設定檔（config.json）與 CLI flags。
package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"syscall"
	"time"

	"github.com/hoshivel/sr-web/backend/internal/adminplane"
	"github.com/hoshivel/sr-web/backend/internal/config"
	"github.com/hoshivel/sr-web/backend/internal/logging"
	"github.com/hoshivel/sr-web/backend/internal/router"
	"github.com/hoshivel/sr-web/backend/internal/server"
)

// version 會寫進控制平面的服務描述，讓維運在管理平臺上看得出跑的是哪個版本。
// 建置時以 -ldflags "-X main.version=$(git describe --tags --always)" 覆寫。
var version = "dev"

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "sr-web:", err)
		os.Exit(1)
	}
}

func run() error {
	store, err := config.LoadStore(os.Args[1:])
	if err != nil {
		return fmt.Errorf("config: %w", err)
	}
	cfg := store.Config()

	// Setup 而非 New：它把這個 logger 裝成 slog 的預設值，並接管標準庫的 log，
	// 所以漏網的 log.Printf 與 http.Server 自己的錯誤輸出會落在同一個檔、
	// 同一種格式裡。
	log, err := logging.Setup(cfg.LogOptions())
	if err != nil {
		return err
	}
	defer func() { _ = log.Close() }()

	log.Info("starting sr-web dispatch backend",
		"version", version, "pid", os.Getpid(), "config", cfg.Path,
		"logging", log.Describe())
	for _, n := range cfg.Notes {
		log.Info(n)
	}
	// 完整的生效設定，只在有人在看的時候印一次。「它跑的不是我寫的那份設定」
	// 幾乎都是讀到別的檔、或被 flag 蓋掉。
	log.Debug("configuration in effect", cfg.LogAttrs()...)

	// 訊號取消貫穿探活迴圈與 HTTP 伺服器的優雅關閉。NotifySignals 而非
	// signal.NotifyContext：是哪個訊號送來的，等於關機原因的一半，
	// 而 NotifyContext 會把它丟掉。
	ctx, stop := logging.NotifySignals(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	rt := router.New(cfg, log)
	// 後臺動態增刪改節點時，即時替換探活清單並重探。
	store.OnRegionsChange(rt.SetRegions)
	go rt.Run(ctx)

	srv := server.New(store, rt, log)
	httpSrv := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	// 控制平面：hoshi-admin 統一管理平臺的機器介面（見該倉庫 docs/control-plane.md）。
	// 它監聽在獨立位址——這個介面能重新配置分流節點，不與玩家流量共用入口——
	// 且未設定共享密鑰時完全不啟用。
	var controlSrv *http.Server
	if ctrl := store.Control(); ctrl.Enabled() {
		handler, err := adminplane.New(store, rt, version, log).Handler()
		if err != nil {
			return fmt.Errorf("control plane: %w", err)
		}
		controlSrv = &http.Server{
			Addr:              ctrl.Addr,
			Handler:           handler,
			ReadHeaderTimeout: 5 * time.Second,
		}
		go func() {
			log.Info("control plane listening", "addr", ctrl.Addr, "key_id", ctrl.KeyID)
			if err := controlSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
				log.Error("control plane listener failed", "addr", ctrl.Addr, "error", err)
			}
		}()
	} else {
		log.Warn("the control plane is off: config.json has no control.addr / control.secret, " +
			"so this service will not appear in hoshi-admin")
	}

	errc := make(chan error, 1)
	go func() {
		log.Info("dispatch backend listening",
			"addr", cfg.ListenAddr, "regions", len(cfg.Regions),
			"probe_interval", cfg.ProbeInterval.String())
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errc <- err
		}
	}()

	// 為什麼要關機，在拆任何東西之前就先記下來——那時答案還在。
	// listener 掛掉帶著它的錯誤，訊號帶著它的名字。
	var listenerErr error
	var down *logging.Shutdown
	select {
	case listenerErr = <-errc:
		down = log.BeginShutdown("listener failed", "addr", cfg.ListenAddr, "error", listenerErr)
	case <-ctx.Done():
		down = log.BeginShutdown("signal", "signal", ctx.SignalName())
	}

	shutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if controlSrv != nil {
		down.Step("control listener", controlSrv.Shutdown(shutCtx), "addr", controlSrv.Addr)
	}
	err = httpSrv.Shutdown(shutCtx)
	down.Step("dispatch listener", err, "addr", cfg.ListenAddr)
	down.Done()

	// listener 的錯誤才是該回傳的那個：它是行程停下來的原因，
	// 而關機時的錯誤只是說這次收尾不乾淨。
	if listenerErr != nil {
		return listenerErr
	}
	return err
}
