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
	"github.com/moehoshio/sr-web/backend/internal/dispatch"
	"github.com/moehoshio/sr-web/backend/internal/play"
)

// Router 持有節點設定與最新探活結果。最新結果以 []dispatch.Node（節點即時檢視＋
// 靜態地理座標）保存，每輪探活整批原子替換（RWMutex），讀者取到的舊值不會被後續
// 探活變動（-race 安全）。停用（Disabled）的節點不探活、不納入結果。
type Router struct {
	client   *http.Client
	interval time.Duration
	now      func() time.Time // 可注入，測試用
	reprobe  chan struct{}    // 節點清單變動時觸發立即重探（緩衝 1，合併多次訊號）

	mu        sync.RWMutex
	regions   []config.Region // 目前正在探活的（啟用）節點設定
	nodes     []dispatch.Node // 最新即時檢視（配對地理座標）
	updatedAt string
}

// New 建立 Router，並以「全部節點未探活（unhealthy）」種下初始結果，使 Run 尚未
// 完成第一輪前，回應也能反映已設定的節點清單（前端不會拿到空回應）。
func New(cfg config.Config) *Router {
	r := &Router{
		interval: cfg.ProbeInterval,
		now:      time.Now,
		client:   &http.Client{Timeout: cfg.ProbeTimeout},
		reprobe:  make(chan struct{}, 1),
	}
	r.regions = activeRegions(cfg.Regions)
	r.nodes = seedNodes(r.regions)
	r.updatedAt = r.timestamp()
	return r
}

// SetRegions 以新的節點設定即時替換探活清單（後臺動態管理用）。保留仍存在節點的
// 最近一次探活狀態、為新節點種下未探活狀態，並觸發一次立即重探刷新。
func (r *Router) SetRegions(regs []config.Region) {
	active := activeRegions(regs)
	r.mu.Lock()
	prev := make(map[string]dispatch.Node, len(r.nodes))
	for _, n := range r.nodes {
		prev[n.Region.ID] = n
	}
	nodes := make([]dispatch.Node, len(active))
	for i, rc := range active {
		coord, ok := rc.Coord()
		if old, exists := prev[rc.ID]; exists {
			// 保留上次探活的健康 / 延遲 / 負載，更新可能改動的 host/url/座標。
			old.Region.Host = rc.Host
			old.Region.URL = rc.URL
			old.Coord = coord
			old.HasCoord = ok
			nodes[i] = old
			continue
		}
		nodes[i] = dispatch.Node{
			Region:   play.Region{ID: rc.ID, Host: rc.Host, URL: rc.URL},
			Coord:    coord,
			HasCoord: ok,
		}
	}
	r.regions = active
	r.nodes = nodes
	r.updatedAt = r.timestamp()
	r.mu.Unlock()

	r.Reprobe()
}

// Reprobe 非阻塞觸發一次立即重探（緩衝 1；已有待處理訊號時略過）。供後臺「立即刷新」。
func (r *Router) Reprobe() {
	select {
	case r.reprobe <- struct{}{}:
	default:
	}
}

// activeRegions 過濾掉停用（Disabled）的節點。
func activeRegions(in []config.Region) []config.Region {
	out := make([]config.Region, 0, len(in))
	for _, rc := range in {
		if !rc.Disabled {
			out = append(out, rc)
		}
	}
	return out
}

// seedNodes 以未探活（unhealthy）狀態種出節點檢視（配對地理座標）。
func seedNodes(regions []config.Region) []dispatch.Node {
	nodes := make([]dispatch.Node, len(regions))
	for i, rc := range regions {
		coord, ok := rc.Coord()
		nodes[i] = dispatch.Node{
			Region:   play.Region{ID: rc.ID, Host: rc.Host, URL: rc.URL},
			Coord:    coord,
			HasCoord: ok,
		}
	}
	return nodes
}

// Snapshot 回傳「全部啟用節點」的即時快照（未收斂），含後端建議節點 id。供後臺與
// 內部使用；對外的收斂分流由 DispatchNodes ＋ dispatch.Select 完成。
func (r *Router) Snapshot() play.Response {
	nodes, updatedAt := r.DispatchNodes()
	regions := make([]play.Region, len(nodes))
	for i, n := range nodes {
		regions[i] = n.Region
	}
	return play.Response{
		Regions:       regions,
		UpdatedAt:     updatedAt,
		RecommendedID: play.Recommend(regions),
	}
}

// DispatchNodes 回傳最新的節點即時檢視（配對座標）與快照時間，供 dispatch.Select
// 為特定用戶收斂候選。回傳為副本，可安全並行呼叫。
func (r *Router) DispatchNodes() ([]dispatch.Node, string) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]dispatch.Node, len(r.nodes))
	copy(out, r.nodes)
	return out, r.updatedAt
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
		case <-r.reprobe:
			r.probeAll(ctx)
		}
	}
}

// probeAll 並行探活所有啟用節點，組出新的節點檢視並原子替換。
func (r *Router) probeAll(ctx context.Context) {
	r.mu.RLock()
	regions := r.regions
	r.mu.RUnlock()

	nodes := make([]dispatch.Node, len(regions))
	var wg sync.WaitGroup
	for i, rc := range regions {
		wg.Add(1)
		go func(i int, rc config.Region) {
			defer wg.Done()
			p := probeRegion(ctx, r.client, healthURL(rc))
			coord, ok := rc.Coord()
			// 各 goroutine 寫入互不重疊的索引，wg.Wait 建立 happens-before。
			nodes[i] = dispatch.Node{
				Region: play.Region{
					ID:        rc.ID,
					Host:      rc.Host,
					URL:       rc.URL,
					Healthy:   p.healthy,
					LatencyMS: p.latencyMS,
					Load:      p.load,
				},
				Coord:    coord,
				HasCoord: ok,
			}
		}(i, rc)
	}
	wg.Wait()

	r.mu.Lock()
	r.nodes = nodes
	r.updatedAt = r.timestamp()
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
