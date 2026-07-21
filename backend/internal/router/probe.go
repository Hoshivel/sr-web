package router

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"
)

// maxHealthBody 是讀取健康端點回應的上限（healthz 應極小；防呆用）。
const maxHealthBody = 1 << 16

// probeResult 是單次探活的結果。
type probeResult struct {
	healthy   bool
	latencyMS int
	load      float64
}

// healthPayload 是節點健康端點可選回傳的 JSON。遊戲後端目前只回純文字 "ok"（無
// 負載訊號）；未來的富健康端點可附上 load 或 players/capacity，本 router 便會自動
// 反映到 play.Region.load，無需改動線上契約或前端。
type healthPayload struct {
	Status   string   `json:"status"`
	Load     *float64 `json:"load"`
	Players  *int     `json:"players"`
	Capacity *int     `json:"capacity"`
}

// probeRegion 對一個健康端點做一次探活：量測 RTT（至取得回應標頭）、以 HTTP 200
// 判定 healthy、並嘗試從 body 解析負載。任何錯誤/逾時＝不健康。
func probeRegion(ctx context.Context, client *http.Client, url string) probeResult {
	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return probeResult{}
	}
	resp, err := client.Do(req)
	elapsed := int(time.Since(start).Milliseconds())
	if err != nil {
		return probeResult{healthy: false, latencyMS: elapsed}
	}
	defer func() { _ = resp.Body.Close() }()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, maxHealthBody))
	if resp.StatusCode != http.StatusOK {
		return probeResult{healthy: false, latencyMS: elapsed}
	}
	res := probeResult{healthy: true, latencyMS: elapsed}
	if load, ok := parseLoad(body); ok {
		res.load = load
	}
	return res
}

// parseLoad 嘗試從健康端點的 body 解析 0..1 的負載。純文字 "ok" 等非 JSON body
// 會回 (0,false)＝無負載訊號。
func parseLoad(body []byte) (float64, bool) {
	var p healthPayload
	if err := json.Unmarshal(body, &p); err != nil {
		return 0, false
	}
	if p.Load != nil {
		return clamp01(*p.Load), true
	}
	if p.Players != nil && p.Capacity != nil && *p.Capacity > 0 {
		return clamp01(float64(*p.Players) / float64(*p.Capacity)), true
	}
	return 0, false
}

// clamp01 夾限到 [0,1]。
func clamp01(v float64) float64 {
	switch {
	case v < 0:
		return 0
	case v > 1:
		return 1
	default:
		return v
	}
}
