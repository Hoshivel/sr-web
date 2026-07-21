// Package geo 提供分流所需的最小地理工具（零第三方相依）：座標、球面距離、
// 由 ISO 國別碼近似的國家質心表，以及從反向代理 / CDN 的 geo 標頭解析用戶座標。
//
// 設計取捨：本後端刻意不內嵌 GeoIP 資料庫（會引入大型相依與資料維護）。生產部署
// 於 CDN / 反向代理之後（見 README「部署整合」），由該層注入用戶地理標頭
// （Cloudflare 預設 CF-IPLatitude / CF-IPLongitude / CF-IPCountry）。後端只在
// 「信任代理」時採信這些標頭；否則不做地理判斷、退回以後端量測延遲排序。
package geo

import (
	"math"
	"net/http"
	"strconv"
	"strings"
)

// Coord 是一個地理座標（十進位度）。
type Coord struct {
	Lat float64
	Lon float64
}

// Settings 是地理解析的執行期設定（來自 config，可由後臺調整）。
type Settings struct {
	// TrustProxyHeaders 為 true 時才採信下列標頭（僅在部署於會覆寫 / 剝除
	// 用戶端偽造值的可信反代 / CDN 之後才可開啟）。預設 false＝不做地理判斷。
	TrustProxyHeaders bool
	// LatHeader / LonHeader 是攜帶用戶緯度 / 經度的標頭名（預設 Cloudflare）。
	LatHeader string
	LonHeader string
	// CountryHeader 是攜帶 ISO-3166-1 alpha-2 國別碼的標頭名（座標缺失時的近似來源）。
	CountryHeader string
	// CountryCoords 是額外 / 覆寫的國家質心（鍵為大寫國別碼）；查無座標標頭時
	// 先查此表、再查內建 countryCentroids。
	CountryCoords map[string]Coord
}

// DefaultSettings 回傳採用 Cloudflare 標頭名的預設（TrustProxyHeaders 仍為 false）。
func DefaultSettings() Settings {
	return Settings{
		LatHeader:     "CF-IPLatitude",
		LonHeader:     "CF-IPLongitude",
		CountryHeader: "CF-IPCountry",
	}
}

// Normalize 補齊留空的標頭名為預設值（供載入設定後使用）。
func (s Settings) Normalize() Settings {
	d := DefaultSettings()
	if s.LatHeader == "" {
		s.LatHeader = d.LatHeader
	}
	if s.LonHeader == "" {
		s.LonHeader = d.LonHeader
	}
	if s.CountryHeader == "" {
		s.CountryHeader = d.CountryHeader
	}
	return s
}

// Resolve 從 HTTP 標頭解析用戶座標。僅在 TrustProxyHeaders 時採信；優先用精確的
// 緯經度標頭，其次以國別碼近似為國家質心。無法解析時回 (Coord{}, false)。
func Resolve(h http.Header, s Settings) (Coord, bool) {
	if !s.TrustProxyHeaders {
		return Coord{}, false
	}
	s = s.Normalize()

	latStr := strings.TrimSpace(h.Get(s.LatHeader))
	lonStr := strings.TrimSpace(h.Get(s.LonHeader))
	if latStr != "" && lonStr != "" {
		lat, errLat := strconv.ParseFloat(latStr, 64)
		lon, errLon := strconv.ParseFloat(lonStr, 64)
		if errLat == nil && errLon == nil && validLat(lat) && validLon(lon) {
			return Coord{Lat: lat, Lon: lon}, true
		}
	}

	country := strings.ToUpper(strings.TrimSpace(h.Get(s.CountryHeader)))
	if country != "" {
		if c, ok := s.CountryCoords[country]; ok {
			return c, true
		}
		if c, ok := countryCentroids[country]; ok {
			return c, true
		}
	}
	return Coord{}, false
}

// CountryCoord 查一個國別碼的內建質心座標（大小寫不敏感）。
func CountryCoord(code string) (Coord, bool) {
	c, ok := countryCentroids[strings.ToUpper(strings.TrimSpace(code))]
	return c, ok
}

// DistanceKm 以 haversine 公式回傳兩座標的大圓距離（公里）。
func DistanceKm(a, b Coord) float64 {
	const earthRadiusKm = 6371.0
	lat1, lon1 := a.Lat*math.Pi/180, a.Lon*math.Pi/180
	lat2, lon2 := b.Lat*math.Pi/180, b.Lon*math.Pi/180
	dLat, dLon := lat2-lat1, lon2-lon1
	s := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1)*math.Cos(lat2)*math.Sin(dLon/2)*math.Sin(dLon/2)
	return 2 * earthRadiusKm * math.Asin(math.Min(1, math.Sqrt(s)))
}

func validLat(v float64) bool { return v >= -90 && v <= 90 }
func validLon(v float64) bool { return v >= -180 && v <= 180 }

// countryCentroids 是常見國家的近似質心（度）。用於只有國別碼、無精確座標時的
// 「就近」粗略排序；不追求精確，足以在洲際 / 區域尺度上分辨遠近。可由
// Settings.CountryCoords 擴充或覆寫。
var countryCentroids = map[string]Coord{
	// 東亞 / 東南亞（節點主要服務區）
	"HK": {22.32, 114.17}, "MO": {22.20, 113.54}, "TW": {23.70, 120.96},
	"JP": {36.20, 138.25}, "KR": {36.50, 127.85}, "CN": {35.86, 104.20},
	"SG": {1.35, 103.82}, "MY": {4.21, 101.98}, "TH": {15.87, 100.99},
	"VN": {14.06, 108.28}, "PH": {12.88, 121.77}, "ID": {-0.79, 113.92},
	"MM": {21.91, 95.96}, "KH": {12.57, 104.99}, "LA": {19.86, 102.50},
	// 南亞 / 中東
	"IN": {22.35, 78.67}, "PK": {30.38, 69.35}, "BD": {23.68, 90.36},
	"AE": {23.42, 53.85}, "SA": {23.89, 45.08}, "IL": {31.05, 34.85},
	"TR": {38.96, 35.24}, "IR": {32.43, 53.69},
	// 大洋洲
	"AU": {-25.27, 133.78}, "NZ": {-41.50, 172.83},
	// 歐洲
	"GB": {55.38, -3.44}, "IE": {53.41, -8.24}, "FR": {46.23, 2.21},
	"DE": {51.17, 10.45}, "NL": {52.13, 5.29}, "ES": {40.46, -3.75},
	"IT": {41.87, 12.57}, "SE": {60.13, 18.64}, "PL": {51.92, 19.15},
	"RU": {61.52, 105.32}, "CH": {46.82, 8.23}, "NO": {60.47, 8.47},
	"FI": {61.92, 25.75},
	// 非洲
	"ZA": {-30.56, 22.94}, "EG": {26.82, 30.80}, "NG": {9.08, 8.68},
	"KE": {-0.02, 37.91}, "MA": {31.79, -7.09},
	// 北美
	"US": {39.83, -98.58}, "CA": {56.13, -106.35}, "MX": {23.63, -102.55},
	// 南美
	"BR": {-14.24, -51.93}, "AR": {-38.42, -63.62}, "CL": {-35.68, -71.54},
	"CO": {4.57, -74.30}, "PE": {-9.19, -75.02},
}
