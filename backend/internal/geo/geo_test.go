package geo

import (
	"math"
	"net/http"
	"testing"
)

func TestDistanceKm(t *testing.T) {
	london := Coord{51.5074, -0.1278}
	paris := Coord{48.8566, 2.3522}
	// 倫敦↔巴黎 ≈ 343 km（容忍 ±15 km）。
	if d := DistanceKm(london, paris); math.Abs(d-343) > 15 {
		t.Errorf("London→Paris = %.1f km, want ≈343", d)
	}
	// 同點 = 0。
	if d := DistanceKm(london, london); d > 0.001 {
		t.Errorf("same point = %.4f, want 0", d)
	}
	// 對稱。
	if math.Abs(DistanceKm(london, paris)-DistanceKm(paris, london)) > 0.001 {
		t.Errorf("distance not symmetric")
	}
	// 香港離新加坡比離東京近（區域排序的核心性質）。
	hk, sg, tokyo := Coord{22.32, 114.17}, Coord{1.35, 103.82}, Coord{35.68, 139.69}
	if DistanceKm(hk, sg) >= DistanceKm(hk, tokyo) {
		t.Errorf("expected HK closer to SG than to Tokyo")
	}
}

func TestResolveTrustOff(t *testing.T) {
	h := http.Header{}
	h.Set("CF-IPLatitude", "22.3")
	h.Set("CF-IPLongitude", "114.1")
	if _, ok := Resolve(h, Settings{TrustProxyHeaders: false}); ok {
		t.Errorf("trust off should never resolve a coord")
	}
}

func TestResolveLatLon(t *testing.T) {
	h := http.Header{}
	h.Set("CF-IPLatitude", "22.32")
	h.Set("CF-IPLongitude", "114.17")
	c, ok := Resolve(h, Settings{TrustProxyHeaders: true})
	if !ok {
		t.Fatalf("expected resolve from lat/lon headers")
	}
	if math.Abs(c.Lat-22.32) > 1e-6 || math.Abs(c.Lon-114.17) > 1e-6 {
		t.Errorf("coord = %+v, want {22.32,114.17}", c)
	}
}

func TestResolveCountryFallback(t *testing.T) {
	h := http.Header{}
	h.Set("CF-IPCountry", "jp") // 大小寫不敏感
	c, ok := Resolve(h, Settings{TrustProxyHeaders: true})
	if !ok {
		t.Fatalf("expected resolve from country header")
	}
	want := countryCentroids["JP"]
	if c != want {
		t.Errorf("JP centroid = %+v, want %+v", c, want)
	}
}

func TestResolveInvalidLatLonThenCountry(t *testing.T) {
	h := http.Header{}
	h.Set("CF-IPLatitude", "not-a-number")
	h.Set("CF-IPLongitude", "999") // 超出範圍
	h.Set("CF-IPCountry", "SG")
	c, ok := Resolve(h, Settings{TrustProxyHeaders: true})
	if !ok {
		t.Fatalf("expected fallback to country when lat/lon invalid")
	}
	if c != countryCentroids["SG"] {
		t.Errorf("want SG centroid, got %+v", c)
	}
}

func TestResolveCustomCountryCoords(t *testing.T) {
	h := http.Header{}
	h.Set("CF-IPCountry", "XX")
	custom := Coord{10, 20}
	c, ok := Resolve(h, Settings{TrustProxyHeaders: true, CountryCoords: map[string]Coord{"XX": custom}})
	if !ok || c != custom {
		t.Errorf("custom country coord = %+v ok=%v, want %+v true", c, ok, custom)
	}
}

func TestResolveNothing(t *testing.T) {
	if _, ok := Resolve(http.Header{}, Settings{TrustProxyHeaders: true}); ok {
		t.Errorf("no headers should not resolve")
	}
}

func TestNormalizeFillsDefaults(t *testing.T) {
	s := Settings{}.Normalize()
	if s.LatHeader != "CF-IPLatitude" || s.LonHeader != "CF-IPLongitude" || s.CountryHeader != "CF-IPCountry" {
		t.Errorf("defaults not filled: %+v", s)
	}
}

func TestCountryCoord(t *testing.T) {
	if _, ok := CountryCoord("hk"); !ok {
		t.Errorf("HK should be known")
	}
	if _, ok := CountryCoord("ZZ"); ok {
		t.Errorf("ZZ should be unknown")
	}
}
