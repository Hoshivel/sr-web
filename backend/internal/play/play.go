// Package play 定義 Play 分流的線上契約型別與挑選邏輯。
//
// 型別與前端 src/lib/play.ts 完全同形狀（JSON 欄位名逐一對齊），讓真實 Go 後端
// 能無痛替換 mock 的 /api/play.json——前端不需改動。額外的 recommendedId 為
// additive 欄位（omitempty），現行前端會忽略，供後端表達分流決策 / 未來客戶端採用。
package play

// Region 是單一遊戲節點的即時檢視（探活結果已填入）。
// JSON 欄位對齊前端 PlayRegion：id/host/url/healthy/latencyMs/load。
type Region struct {
	// ID 是節點代號（如 hk1）。
	ID string `json:"id"`
	// Host 是顯示用主機名。
	Host string `json:"host"`
	// URL 是前端 iframe 嵌入目標（遊戲主機 URL 或同源展示頁）。
	URL string `json:"url"`
	// Healthy 是探活結果：false＝壅塞 / 不可用。
	Healthy bool `json:"healthy"`
	// LatencyMS 是探活量得的往返延遲（毫秒）。
	LatencyMS int `json:"latencyMs"`
	// Load 是節點負載 0..1；節點未回報負載訊號時為 0（未知）。
	Load float64 `json:"load"`
}

// Response 是 /api/play.json 的回應。regions/updatedAt 對齊前端 PlayResponse；
// recommendedId 為後端分流建議（additive、前端可忽略）。
type Response struct {
	Regions []Region `json:"regions"`
	// UpdatedAt 是快照產生時間（RFC3339）；真實後端為即時探活時間。
	UpdatedAt string `json:"updatedAt"`
	// RecommendedID 是後端建議節點的 id（負載均衡決策）；無可用節點時省略。
	RecommendedID string `json:"recommendedId,omitempty"`
}

// Recommend 挑選建議節點的 id：健康優先，其次延遲最低，再其次負載最低。
// 無任何節點時回傳空字串。與前端 recommendRegion（健康、延遲最低）一致，並多一層
// 負載的 tie-break。
func Recommend(regions []Region) string {
	best := -1
	for i := range regions {
		if best == -1 || better(regions[i], regions[best]) {
			best = i
		}
	}
	if best == -1 {
		return ""
	}
	return regions[best].ID
}

// better 回報 a 是否為比 b 更好的建議節點。
func better(a, b Region) bool {
	if a.Healthy != b.Healthy {
		return a.Healthy // 健康節點勝過不健康
	}
	if a.LatencyMS != b.LatencyMS {
		return a.LatencyMS < b.LatencyMS // 延遲低者勝
	}
	return a.Load < b.Load // 最後看負載
}
