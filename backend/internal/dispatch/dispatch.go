// Package dispatch 是後端「動態分配」的核心：對一個特定用戶（依其地理座標）從所有
// 即時節點中挑選收斂的候選集合，並決定其建議 play 入點。
//
// 這實現需求「後端主導分流」：不再把所有節點全敞開回傳給前端自行測試，而是由後端
// 依健康 → 就近（地理距離）→ 負載排序，只回傳前 N 個（預設 3）候選＋建議入點 id。
// 前端仍拿到「一個列表」，但那是後端計算後的收斂結果。
package dispatch

import (
	"sort"

	"github.com/hoshivel/sr-web/backend/internal/geo"
	"github.com/hoshivel/sr-web/backend/internal/play"
)

// DefaultMaxCandidates 是未設定時回傳的候選節點上限。
const DefaultMaxCandidates = 3

// Node 是分流輸入：一個節點的即時檢視（play.Region）＋其地理座標（若已設定）。
// 座標為後端內部資訊，不會出現在回傳給前端的 play.Region 裡。
type Node struct {
	Region   play.Region
	Coord    geo.Coord
	HasCoord bool
}

// Select 為某用戶挑選收斂候選集合並回傳 play.Response（只含前 max 個節點）。
//
// 排序規則：
//  1. 健康節點優先；若無任何健康節點，退回全部（讓前端仍能顯示「壅塞」狀態）。
//  2. 若有用戶座標且候選中至少一個節點有座標 → 以地理距離「就近」為主排序
//     （有座標者在前、距離近者在前；無座標者殿後）。
//  3. 否則退回以後端量測延遲（次負載）排序。
//  4. 取前 max 個；recommendedId＝排序首位（後端建議的最終入點）。
func Select(nodes []Node, client geo.Coord, hasClient bool, max int, updatedAt string) play.Response {
	if max <= 0 {
		max = DefaultMaxCandidates
	}

	pool := make([]Node, 0, len(nodes))
	for _, n := range nodes {
		if n.Region.Healthy {
			pool = append(pool, n)
		}
	}
	if len(pool) == 0 { // 無健康節點：退回全部（降級顯示，前端會禁用進入）
		pool = append(pool, nodes...)
	}

	geoOK := hasClient && anyHasCoord(pool)
	if geoOK {
		sortByProximity(pool, client)
	} else {
		sortByLatency(pool)
	}

	if len(pool) > max {
		pool = pool[:max]
	}

	regions := make([]play.Region, len(pool))
	for i, n := range pool {
		regions[i] = n.Region
	}
	resp := play.Response{Regions: regions, UpdatedAt: updatedAt}
	if len(regions) > 0 {
		resp.RecommendedID = regions[0].ID
	}
	return resp
}

// anyHasCoord 回報候選中是否至少一個節點有座標。
func anyHasCoord(nodes []Node) bool {
	for _, n := range nodes {
		if n.HasCoord {
			return true
		}
	}
	return false
}

// sortByProximity 以「有座標優先 → 距離近優先 → 負載低 → 延遲低」穩定排序。
func sortByProximity(nodes []Node, client geo.Coord) {
	dist := make(map[string]float64, len(nodes))
	for _, n := range nodes {
		if n.HasCoord {
			dist[n.Region.ID] = geo.DistanceKm(client, n.Coord)
		}
	}
	sort.SliceStable(nodes, func(i, j int) bool {
		a, b := nodes[i], nodes[j]
		if a.HasCoord != b.HasCoord {
			return a.HasCoord // 有座標者在前
		}
		if a.HasCoord && b.HasCoord && dist[a.Region.ID] != dist[b.Region.ID] {
			return dist[a.Region.ID] < dist[b.Region.ID]
		}
		if a.Region.Load != b.Region.Load {
			return a.Region.Load < b.Region.Load
		}
		return a.Region.LatencyMS < b.Region.LatencyMS
	})
}

// sortByLatency 以「延遲低 → 負載低」穩定排序（無地理訊號時的後端量測依據）。
func sortByLatency(nodes []Node) {
	sort.SliceStable(nodes, func(i, j int) bool {
		a, b := nodes[i], nodes[j]
		if a.Region.LatencyMS != b.Region.LatencyMS {
			return a.Region.LatencyMS < b.Region.LatencyMS
		}
		return a.Region.Load < b.Region.Load
	})
}
