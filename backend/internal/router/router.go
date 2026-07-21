// Package router 是 sr-web 後端的核心：對設定的遊戲節點做背景探活，維護一份即時
// 快照（play.Response），供 HTTP 層回傳給前端 Play 啟動器。
//
// 職責對應 README 第 3 點：探活（health probe）、分流 / 負載均衡（以健康 / 延遲 /
// 負載挑選建議節點）、動態即時提供可用遊戲 URL。
package router

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/moehoshio/sr-web/backend/internal/config"
	"github.com/moehoshio/sr-web/backend/internal/play"
)

// Router 持有節點設定與最新探活快照。快照為不可變值：每輪探活以全新的
// play.Response 原子替換，讀者取到的舊值不會被後續探活變動（-race 安全）。
type Router struct {
	regions  []config.Region
	client   *http.Client
	interval time.Duration
	now      func() time.Time // 可注入，測試用

	mu   sync.RWMutex
	snap play.Response
}

// New 建立 Router，並以「全部節點未探活（unhealthy）」種下初始快照，使 Run 尚未
// 完成第一輪前，/api/play.json 也能回傳已設定的節點清單（前端不會拿到空回應）。
func New(cfg config.Config) *Router {
	r := &Router{
		regions:  cfg.Regions,
		interval: cfg.ProbeInterval,
		now:      time.Now,
		client:   &http.Client{Timeout: cfg.ProbeTimeout},
	}
	init := make([]play.Region, len(cfg.Regions))
	for i, rc := range cfg.Regions {
		init[i] = play.Region{ID: rc.ID, Host: rc.Host, URL: rc.URL}
	}
	r.snap = play.Response{Regions: init, UpdatedAt: r.timestamp()}
	return r
}

// Snapshot 回傳最新的探活快照，可安全並行呼叫。
func (r *Router) Snapshot() play.Response {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.snap
}

// Run 週期性探活所有節點直到 ctx 取消；一啟動即先探一輪，讓首個快照反映真實狀態。
func (r *Router) Run(ctx context.Context) {
	r.probeAll(ctx)
	t := time.NewTicker(r.interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			r.probeAll(ctx)
		}
	}
}

// probeAll 並行探活所有節點，組出新的快照並原子替換。
func (r *Router) probeAll(ctx context.Context) {
	regions := make([]play.Region, len(r.regions))
	var wg sync.WaitGroup
	for i, rc := range r.regions {
		wg.Add(1)
		go func(i int, rc config.Region) {
			defer wg.Done()
			p := probeRegion(ctx, r.client, healthURL(rc))
			// 各 goroutine 寫入互不重疊的索引，wg.Wait 建立 happens-before。
			regions[i] = play.Region{
				ID:        rc.ID,
				Host:      rc.Host,
				URL:       rc.URL,
				Healthy:   p.healthy,
				LatencyMS: p.latencyMS,
				Load:      p.load,
			}
		}(i, rc)
	}
	wg.Wait()

	snap := play.Response{
		Regions:       regions,
		UpdatedAt:     r.timestamp(),
		RecommendedID: play.Recommend(regions),
	}
	r.mu.Lock()
	r.snap = snap
	r.mu.Unlock()
}

// timestamp 產生 RFC3339 的 UTC 時間字串。
func (r *Router) timestamp() string {
	return r.now().UTC().Format(time.RFC3339)
}

// healthURL 決定節點的探活 URL：優先用設定的 HealthURL，否則推導
// https://<host>/healthz。
func healthURL(rc config.Region) string {
	if rc.HealthURL != "" {
		return rc.HealthURL
	}
	return "https://" + rc.Host + "/healthz"
}
