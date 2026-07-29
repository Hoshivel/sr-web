// Package config 解析 sr-web 分流後端（router）的執行期設定。
//
// 設定層級由低到高：預設值 → 設定檔（JSON）→ CLI flags。
// 設定檔以 --config 指定，否則取工作目錄的 config.json。找不到檔案時會以預設值
// 產生一份，讓維運者有一份「已文件化」的起點。只讀設定檔與 CLI flags——刻意
// 不讀環境變數（對齊 ShatteredRealms 遊戲後端的設定慣例）。
package config

import (
	"encoding/json"
	"flag"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/moehoshio/sr-web/backend/internal/geo"
)

// Region 是一個遊戲節點的靜態設定（探活/嵌入目標；即時的 healthy/latency/load 由
// router 探測後填入 play.Region，不在此檔）。
type Region struct {
	// ID 是節點代號（如 hk1），對應前端契約 PlayRegion.id。
	ID string `json:"id"`
	// Host 是顯示用主機名（如 hk1.svc.oha.li），對應 PlayRegion.host。
	Host string `json:"host"`
	// URL 是前端 iframe 嵌入目標（真實部署＝遊戲主機 URL；本機展示可指同源
	// 展示頁如 /play/session/）。router 原樣回傳，不驗證其 scheme。
	URL string `json:"url"`
	// HealthURL 是探活端點；留空則預設 https://<host>/healthz（遊戲後端已提供
	// 純文字 ok 的 /healthz）。需要 http 或自訂路徑時於此覆寫。
	HealthURL string `json:"healthUrl"`
	// Lat / Lon 是節點的地理座標（十進位度），供後端「就近」分流。留空（0,0）
	// 時退用 Country 近似，皆無則此節點不參與地理排序（僅依延遲）。
	Lat float64 `json:"lat,omitempty"`
	Lon float64 `json:"lon,omitempty"`
	// Country 是節點所在 ISO-3166-1 alpha-2 國別碼；未給精確座標時以國家質心近似。
	Country string `json:"country,omitempty"`
	// Disabled 為 true 時此節點停用：不探活、不出現在任何回應（後臺可切換）。
	Disabled bool `json:"disabled,omitempty"`
	// CreatedAt 是此節點被登錄進設定的時點（RFC3339）。探活結果每輪都覆寫，
	// 設定檔也沒有其他時間欄位，所以「這個節點是什麼時候加進來的」不記就永遠取不回來。
	// 本欄位之前寫入的節點為空字串——當時沒記，不代表沒有登錄時間。
	CreatedAt string `json:"createdAt,omitempty"`
	// DisabledAt 是最後一次被停用的時點；啟用中為空。Disabled 只答「是不是」，
	// 答不出「停用多久了」。
	DisabledAt string `json:"disabledAt,omitempty"`
}

// Coord 回傳節點的地理座標與是否可用：優先精確 Lat/Lon，其次 Country 質心近似。
func (r Region) Coord() (geo.Coord, bool) {
	if r.Lat != 0 || r.Lon != 0 {
		return geo.Coord{Lat: r.Lat, Lon: r.Lon}, true
	}
	if r.Country != "" {
		if c, ok := geo.CountryCoord(r.Country); ok {
			return c, true
		}
	}
	return geo.Coord{}, false
}

// GeoConfig 是地理分流的設定（可由後臺調整），對應磁碟 JSON。
type GeoConfig struct {
	// TrustProxyHeaders 為 true 才採信下列 geo 標頭（僅在可信反代 / CDN 之後開啟）。
	TrustProxyHeaders bool `json:"trustProxyHeaders"`
	// LatHeader / LonHeader / CountryHeader 為攜帶用戶地理資訊的標頭名（預設 Cloudflare）。
	LatHeader     string `json:"latHeader,omitempty"`
	LonHeader     string `json:"lonHeader,omitempty"`
	CountryHeader string `json:"countryHeader,omitempty"`
	// CountryCoords 是額外 / 覆寫的國家質心（鍵＝國別碼，值＝[緯度,經度]）。
	CountryCoords map[string][2]float64 `json:"countryCoords,omitempty"`
}

// Settings 轉為 geo 套件消費的設定（含標頭名補預設）。
func (g GeoConfig) Settings() geo.Settings {
	s := geo.Settings{
		TrustProxyHeaders: g.TrustProxyHeaders,
		LatHeader:         g.LatHeader,
		LonHeader:         g.LonHeader,
		CountryHeader:     g.CountryHeader,
	}
	if len(g.CountryCoords) > 0 {
		s.CountryCoords = make(map[string]geo.Coord, len(g.CountryCoords))
		for k, v := range g.CountryCoords {
			s.CountryCoords[strings.ToUpper(k)] = geo.Coord{Lat: v[0], Lon: v[1]}
		}
	}
	return s.Normalize()
}

// File 對應磁碟上的 config.json。
type File struct {
	Listen               Listen    `json:"listen"`
	AllowedOrigins       []string  `json:"allowedOrigins"`
	ProbeIntervalSeconds int       `json:"probeIntervalSeconds"`
	ProbeTimeoutSeconds  int       `json:"probeTimeoutSeconds"`
	MaxCandidates        int       `json:"maxCandidates"`
	Geo                  GeoConfig `json:"geo"`
	Admin                Admin     `json:"admin"`
	Control              Control   `json:"control"`
	Regions              []Region  `json:"regions"`
}

// Control 是 hoshi-admin 統一管理平臺的控制平面設定（見該倉庫
// docs/control-plane.md）。它監聽在**獨立於公開埠的位址**，預設只綁 loopback：
// 這個介面能重新配置分流節點，不該與玩家流量共用入口。
//
// Secret 是與管理平臺共享的簽章密鑰（明文）。它與既有的後臺憑證一樣存放於
// config.json——本服務刻意不讀環境變數——因此**設定檔權限必須是 0600**，
// 新產生的設定檔已以此權限寫出。
type Control struct {
	// Addr 是 host:port；留空則不啟用控制平面。
	Addr string `json:"addr,omitempty"`
	// KeyID 是允許的簽章金鑰 id（對應管理平臺登錄的「簽章金鑰 id」）。
	KeyID string `json:"keyId,omitempty"`
	// Secret 是共享簽章密鑰，至少 32 字元；留空則不啟用控制平面。
	Secret string `json:"secret,omitempty"`
}

// Enabled 回報是否應提供控制平面。沒有密鑰就沒有辦法驗證呼叫者，故預設關閉。
func (c Control) Enabled() bool { return c.Addr != "" && c.Secret != "" }

// Admin 是後臺登入憑證（持久化於 config.json）。PasswordHash 為空＝後臺尚未設定，
// 進入 setup 引導流程建立帳密（見 internal/admin）。密碼以 PBKDF2 雜湊，永不明文儲存。
type Admin struct {
	Username     string `json:"username,omitempty"`
	PasswordHash string `json:"passwordHash,omitempty"` // base64(PBKDF2 派生金鑰)
	Salt         string `json:"salt,omitempty"`         // base64(隨機鹽)
	Iterations   int    `json:"iterations,omitempty"`
	Algo         string `json:"algo,omitempty"` // 例："pbkdf2-sha256"
}

// Configured 回報後臺是否已設定帳密。
func (a Admin) Configured() bool {
	return a.Username != "" && a.PasswordHash != "" && a.Salt != ""
}

// Listen 是一個監聽端點；IP 留空＝綁定所有介面。
type Listen struct {
	IP   string `json:"ip"`
	Port int    `json:"port"`
}

// Config 是伺服器實際消費的、已解析完成的設定。
type Config struct {
	// ListenAddr 是 host:port 監聽位址。
	ListenAddr string
	// AllowedOrigins 收斂 CORS 允許的瀏覽器來源；空＝放行任意來源（dev）。
	AllowedOrigins []string
	// ProbeInterval 是背景探活週期；ProbeTimeout 是單次探活逾時。
	ProbeInterval time.Duration
	ProbeTimeout  time.Duration
	// MaxCandidates 是每次分流回傳給前端的候選節點上限（收斂，不全敞開）。
	MaxCandidates int
	// Geo 是地理分流設定（已補預設標頭名）。
	Geo geo.Settings
	// Regions 是要探活/分流的遊戲節點清單。
	Regions []Region

	// Path 是實際使用的設定檔；Notes 是載入期訊息（產生檔案/解析）供啟動日誌。
	Path  string
	Notes []string
}

// 預設常數（設定檔缺項或非正值時採用）。
const (
	defaultPort            = 8090
	defaultProbeIntervalS  = 10
	defaultProbeTimeoutS   = 3
	defaultMaxCandidates   = 3
	defaultConfigCandidate = "config.json"
)

// defaultFile 是首次執行時寫出的設定內容。regions 預設為三個正式節點，探活端點
// 由 host 推導；維運者依實際主機調整。
func defaultFile() File {
	return File{
		Listen:               Listen{IP: "", Port: defaultPort},
		AllowedOrigins:       []string{},
		ProbeIntervalSeconds: defaultProbeIntervalS,
		ProbeTimeoutSeconds:  defaultProbeTimeoutS,
		MaxCandidates:        defaultMaxCandidates,
		Geo:                  GeoConfig{TrustProxyHeaders: false},
		Regions: []Region{
			{ID: "hk1", Host: "hk1.svc.oha.li", URL: "https://hk1.svc.oha.li/", Lat: 22.32, Lon: 114.17, Country: "HK"},
			{ID: "jp1", Host: "jp1.svc.oha.li", URL: "https://jp1.svc.oha.li/", Lat: 35.68, Lon: 139.69, Country: "JP"},
			{ID: "sg1", Host: "sg1.svc.oha.li", URL: "https://sg1.svc.oha.li/", Lat: 1.35, Lon: 103.82, Country: "SG"},
		},
	}
}

// Load 由 CLI args 與設定檔解析出執行期設定（優先序 CLI > 檔 > 預設）。副作用：
// 設定檔不存在時會以預設值產生一份。保留供不需即時修改的呼叫方 / 測試使用；需要
// 動態管理（後臺）者用 LoadStore。
func Load(args []string) (Config, error) {
	file, listenAddr, path, notes, err := resolve(args)
	if err != nil {
		return Config{}, err
	}
	return deriveConfig(file, listenAddr, path, notes), nil
}

// resolve 解析 flags 與設定檔（缺檔則產生預設），套用 flag 對 listen 的覆寫，回傳
// 有效的 File、監聽位址與載入訊息。File 保留檔內原值（listen 不受 flag 汙染，供
// 後續持久化）。
func resolve(args []string) (file File, listenAddr, path string, notes []string, err error) {
	fs := flag.NewFlagSet("sr-web-router", flag.ContinueOnError)
	var (
		flagConfig = fs.String("config", "", "設定檔路徑（.json）；預設取工作目錄的 config.json")
		flagIP     = fs.String("ip", "", "監聽 IP（空＝所有介面）")
		flagPort   = fs.Int("port", 0, "監聽埠")
	)
	if perr := fs.Parse(args); perr != nil {
		return File{}, "", "", nil, perr
	}
	set := map[string]bool{}
	fs.Visit(func(f *flag.Flag) { set[f.Name] = true })

	file = defaultFile()
	path, notes, err = loadFile(*flagConfig, &file)
	if err != nil {
		return File{}, "", "", nil, err
	}

	ip, port := file.Listen.IP, file.Listen.Port
	if set["ip"] {
		ip = *flagIP
	}
	if set["port"] {
		port = *flagPort
	}
	return file, net.JoinHostPort(ip, strconv.Itoa(port)), path, notes, nil
}

// deriveConfig 由 File 純函式地推導執行期 Config（補預設、轉型別）。
func deriveConfig(file File, listenAddr, path string, notes []string) Config {
	interval := time.Duration(file.ProbeIntervalSeconds) * time.Second
	if interval <= 0 {
		interval = defaultProbeIntervalS * time.Second
	}
	timeout := time.Duration(file.ProbeTimeoutSeconds) * time.Second
	if timeout <= 0 {
		timeout = defaultProbeTimeoutS * time.Second
	}
	maxCandidates := file.MaxCandidates
	if maxCandidates <= 0 {
		maxCandidates = defaultMaxCandidates
	}
	return Config{
		ListenAddr:     listenAddr,
		AllowedOrigins: file.AllowedOrigins,
		ProbeInterval:  interval,
		ProbeTimeout:   timeout,
		MaxCandidates:  maxCandidates,
		Geo:            file.Geo.Settings(),
		Regions:        file.Regions,
		Path:           path,
		Notes:          notes,
	}
}

// loadFile 尋找/讀取設定檔（不存在則以預設值產生），並把檔中的值疊到 *file 上。
func loadFile(explicit string, file *File) (path string, notes []string, err error) {
	path = explicit
	if path == "" {
		path = defaultConfigCandidate
	}
	raw, readErr := os.ReadFile(path)
	if readErr != nil {
		if !os.IsNotExist(readErr) {
			return path, nil, fmt.Errorf("read %s: %w", path, readErr)
		}
		// 檔案不存在：以預設值執行，並產生一份供下次使用。
		if werr := writeConfig(path, *file); werr != nil {
			notes = append(notes, fmt.Sprintf("config: 無法產生 %s：%v（以預設值執行）", path, werr))
		} else {
			notes = append(notes, fmt.Sprintf("config: 已以預設值產生 %s", path))
		}
		return path, notes, nil
	}
	if err := json.Unmarshal(raw, file); err != nil {
		return path, nil, fmt.Errorf("parse %s: %w", path, err)
	}
	notes = append(notes, "config: 已載入 "+path)
	return path, notes, nil
}

// writeConfig 以縮排 JSON 寫出設定檔。權限為 0600：本檔含後臺憑證雜湊與
// 控制平面的共享簽章密鑰，不應對同機其他使用者可讀。
func writeConfig(path string, f File) error {
	out, err := json.MarshalIndent(f, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(out, '\n'), 0o600)
}
