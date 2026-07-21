package dispatch

import (
	"testing"

	"github.com/moehoshio/sr-web/backend/internal/geo"
	"github.com/moehoshio/sr-web/backend/internal/play"
)

// node 是測試輔助：造一個健康、可選帶座標的節點。
func node(id string, latency int, load float64, healthy bool, coord *geo.Coord) Node {
	n := Node{Region: play.Region{ID: id, Host: id + ".svc", URL: "https://" + id + "/", Healthy: healthy, LatencyMS: latency, Load: load}}
	if coord != nil {
		n.Coord = *coord
		n.HasCoord = true
	}
	return n
}

func ids(resp play.Response) []string {
	out := make([]string, len(resp.Regions))
	for i, r := range resp.Regions {
		out[i] = r.ID
	}
	return out
}

func TestSelectCapsAndRecommendsByLatency(t *testing.T) {
	nodes := []Node{
		node("a", 90, 0.1, true, nil),
		node("b", 30, 0.5, true, nil),
		node("c", 60, 0.2, true, nil),
		node("d", 120, 0.9, true, nil),
	}
	resp := Select(nodes, geo.Coord{}, false, 2, "t0")
	if got := ids(resp); len(got) != 2 || got[0] != "b" || got[1] != "c" {
		t.Fatalf("cap/latency order = %v, want [b c]", got)
	}
	if resp.RecommendedID != "b" {
		t.Errorf("recommendedId = %q, want b", resp.RecommendedID)
	}
	if resp.UpdatedAt != "t0" {
		t.Errorf("updatedAt not carried")
	}
}

func TestSelectProximity(t *testing.T) {
	hk := geo.Coord{Lat: 22.32, Lon: 114.17}
	sg := geo.Coord{Lat: 1.35, Lon: 103.82}
	tokyo := geo.Coord{Lat: 35.68, Lon: 139.69}
	nodes := []Node{
		node("tokyo", 10, 0.1, true, &tokyo), // 後端量測延遲最低，但地理較遠
		node("sg", 40, 0.1, true, &sg),
		node("hk", 50, 0.1, true, &hk),
	}
	// 用戶在香港：即使 hk 節點延遲最高，就近應排第一。
	resp := Select(nodes, hk, true, 3, "t")
	if got := ids(resp); got[0] != "hk" {
		t.Fatalf("proximity order = %v, want hk first", got)
	}
	if resp.RecommendedID != "hk" {
		t.Errorf("recommendedId = %q, want hk", resp.RecommendedID)
	}
}

func TestSelectNoNodeCoordFallsBackToLatency(t *testing.T) {
	client := geo.Coord{Lat: 22.32, Lon: 114.17}
	nodes := []Node{
		node("slow", 90, 0.1, true, nil),
		node("fast", 20, 0.1, true, nil),
	}
	// 有用戶座標但節點皆無座標 → 退回延遲排序。
	resp := Select(nodes, client, true, 3, "t")
	if got := ids(resp); got[0] != "fast" {
		t.Errorf("want latency fallback fast-first, got %v", got)
	}
}

func TestSelectCoordlessNodesSinkBelowCoorded(t *testing.T) {
	client := geo.Coord{Lat: 22.32, Lon: 114.17}
	far := geo.Coord{Lat: 51.5, Lon: -0.12} // 很遠但有座標
	nodes := []Node{
		node("nocoord", 5, 0.0, true, nil), // 延遲最低但無座標
		node("far", 80, 0.5, true, &far),
	}
	resp := Select(nodes, client, true, 3, "t")
	if got := ids(resp); got[0] != "far" {
		t.Errorf("coorded node should rank above coordless when geo active, got %v", got)
	}
}

func TestSelectFiltersUnhealthy(t *testing.T) {
	nodes := []Node{
		node("bad", 10, 0.1, false, nil),
		node("good", 50, 0.1, true, nil),
	}
	resp := Select(nodes, geo.Coord{}, false, 3, "t")
	if got := ids(resp); len(got) != 1 || got[0] != "good" {
		t.Errorf("unhealthy should be filtered, got %v", got)
	}
}

func TestSelectAllUnhealthyFallback(t *testing.T) {
	nodes := []Node{
		node("a", 10, 0.1, false, nil),
		node("b", 20, 0.1, false, nil),
	}
	resp := Select(nodes, geo.Coord{}, false, 3, "t")
	if len(resp.Regions) != 2 {
		t.Errorf("all-unhealthy should still return capped list for display, got %d", len(resp.Regions))
	}
	if resp.RecommendedID == "" {
		t.Errorf("recommendedId should still be set on degraded fallback")
	}
}

func TestSelectEmpty(t *testing.T) {
	resp := Select(nil, geo.Coord{}, false, 3, "t")
	if len(resp.Regions) != 0 {
		t.Errorf("empty input want empty regions")
	}
	if resp.RecommendedID != "" {
		t.Errorf("empty input want no recommendedId")
	}
}

func TestSelectDefaultsMaxWhenNonPositive(t *testing.T) {
	nodes := []Node{
		node("a", 10, 0, true, nil), node("b", 20, 0, true, nil),
		node("c", 30, 0, true, nil), node("d", 40, 0, true, nil),
	}
	resp := Select(nodes, geo.Coord{}, false, 0, "t") // 0 → 預設 3
	if len(resp.Regions) != DefaultMaxCandidates {
		t.Errorf("max=0 should default to %d, got %d", DefaultMaxCandidates, len(resp.Regions))
	}
}
