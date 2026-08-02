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
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/hoshivel/sr-web/backend/internal/geo"
	"github.com/hoshivel/sr-web/backend/internal/logging"
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
	Debug                bool      `json:"debug"`
	Log                  LogConfig `json:"log"`
	Geo                  GeoConfig `json:"geo"`
	Control              Control   `json:"control"`
	Regions              []Region  `json:"regions"`
}

// LogConfig 是磁碟上的日誌設定。
//
// 鍵**語意與預設值和其餘四個 Hoshivel 服務完全一致**（見 hoshi-api-spec 的
// docs/conventions.md §11）；只有大小寫跟著本倉庫 config.json 既有的 camelCase
// 走，因為這個檔裡其他鍵（probeIntervalSeconds、allowedOrigins…）都是 camelCase，
// 夾一段 snake_case 進來會被下一個人當成筆誤「修掉」。
type LogConfig struct {
	// Level 是最低寫出層級：debug / info / warn / error。
	Level string `json:"level,omitempty"`
	// Format 是 text（預設）或 json。
	Format string `json:"format,omitempty"`
	// File 是日誌檔位置；留空＝只寫 stderr。本服務通常跑在 systemd 或容器下，
	// 那裡已經在收 stderr，容器內再寫一份會隨容器一起消失。
	File string `json:"file,omitempty"`
	// Stderr 決定設了 File 之後是否保留終端機那一份。預設保留：開一個日誌檔
	// 不該默默把某人正在看的輸出拿走。
	Stderr *bool `json:"stderr,omitempty"`
	// MaxSizeMB 超過即輪替；0 代表只按 UTC 日界輪替。
	MaxSizeMB int `json:"maxSizeMB,omitempty"`
	// RetainDays 是輪替檔保留天數；0 代表永久保留。
	RetainDays int `json:"retainDays,omitempty"`
	// MaxFiles 是輪替檔份數上限；0 代表不設上限。
	MaxFiles int `json:"maxFiles,omitempty"`
	// Source 讓每筆紀錄帶上 file:line；debug 模式自動開啟。
	Source bool `json:"source,omitempty"`
}

// Options 轉成 logging 套件要的形狀。
func (l LogConfig) Options(debug bool) logging.Options {
	o := logging.Defaults()
	if l.Level != "" {
		o.Level = l.Level
	}
	if l.Format != "" {
		o.Format = l.Format
	}
	o.File = l.File
	if l.Stderr != nil {
		o.Stderr = *l.Stderr
	}
	if l.MaxSizeMB != 0 {
		o.MaxSizeMB = l.MaxSizeMB
	}
	if l.RetainDays != 0 {
		o.RetainDays = l.RetainDays
	}
	if l.MaxFiles != 0 {
		o.MaxFiles = l.MaxFiles
	}
	o.Source = l.Source
	o.Debug = debug
	if debug {
		// debug 是維運會去按的那一個開關，所以它自己帶著層級，
		// 不必再記得同時改 log.level。
		o.Level = logging.LevelDebug
	}
	return o
}

// Control 是 hoshi-admin 統一管理平臺的控制平面設定（見該倉庫
// docs/control-plane.md）。它監聽在**獨立於公開埠的位址**，預設只綁 loopback：
// 這個介面能重新配置分流節點，不該與玩家流量共用入口。
//
// Secret 是與管理平臺共享的簽章密鑰（明文），存放於 config.json——本服務刻意
// 不讀環境變數——因此**設定檔權限必須是 0600**，新產生的設定檔已以此權限寫出。
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

	// Debug 是 debug 模式：全部層級 ＋ file:line ＋ 逐筆請求與探活紀錄。
	Debug bool
	// Log 是日誌設定（位置、保留、層級）。
	Log LogConfig

	// Path 是實際使用的設定檔；Notes 是載入期訊息（產生檔案/解析）供啟動日誌。
	Path  string
	Notes []string
}

// LogOptions 把設定轉成 logging 套件要的選項。
func (c Config) LogOptions() logging.Options { return c.Log.Options(c.Debug) }

// LogAttrs 是生效設定的屬性形式，供 debug 模式在啟動時印出一次——
// 「這個行程實際跑在什麼設定上」是多數調查的第一個問題。
// 共享密鑰不在其中：最保險的不記錄方式是根本不交給 logger。
func (c Config) LogAttrs() []any {
	return []any{
		"config", c.Path,
		"listen", c.ListenAddr,
		"allowed_origins", strings.Join(c.AllowedOrigins, ","),
		"probe_interval", c.ProbeInterval.String(),
		"probe_timeout", c.ProbeTimeout.String(),
		"max_candidates", c.MaxCandidates,
		"regions", len(c.Regions),
		"geo.trust_proxy_headers", c.Geo.TrustProxyHeaders,
		"debug", c.Debug,
		"log.level", c.Log.Level,
		"log.format", c.Log.Format,
		"log.file", c.Log.File,
		"log.stderr", c.LogOptions().Stderr,
		"log.max_size_mb", c.Log.MaxSizeMB,
		"log.retain_days", c.Log.RetainDays,
		"log.max_files", c.Log.MaxFiles,
		"log.source", c.Log.Source,
	}
}

// Validate 檢查日誌設定；不合法就在啟動時擋下來，而不是默默用預設值跑。
func (l LogConfig) Validate() error {
	if err := l.Options(false).Validate(); err != nil {
		return fmt.Errorf("log: %w", err)
	}
	return nil
}

// 預設常數（設定檔缺項或非正值時採用）。
const (
	defaultPort            = 8090
	defaultProbeIntervalS  = 10
	defaultProbeTimeoutS   = 3
	defaultMaxCandidates   = 3
	defaultConfigCandidate = "config.json"

	// 日誌預設值。輪替與保留只有在設了 log.file 之後才有作用，但仍在此給出
	// 預設，好讓「開始寫檔」是一個鍵而不是五個。
	defaultLogLevel     = logging.LevelInfo
	defaultLogRetainDay = 14
	defaultLogMaxSizeMB = 32
	defaultLogMaxFiles  = 14
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
		Log: LogConfig{
			Level:      defaultLogLevel,
			Format:     logging.FormatText,
			MaxSizeMB:  defaultLogMaxSizeMB,
			RetainDays: defaultLogRetainDay,
			MaxFiles:   defaultLogMaxFiles,
		},
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
		flagConfig   = fs.String("config", "", "設定檔路徑（.json）；預設取工作目錄的 config.json")
		flagIP       = fs.String("ip", "", "監聽 IP（空＝所有介面）")
		flagPort     = fs.Int("port", 0, "監聽埠")
		flagDebug    = fs.Bool("debug", false, "debug 模式：全部層級 ＋ file:line ＋ 逐筆請求與探活紀錄")
		flagLevel    = fs.String("log.level", "", "最低寫出層級：debug / info（預設）/ warn / error")
		flagFormat   = fs.String("log.format", "", "日誌格式：text（預設）或 json")
		flagFile     = fs.String("log.file", "", "同時把日誌寫到這個檔；留空代表只寫 stderr")
		flagStderr   = fs.Bool("log.stderr", true, "設了 log.file 之後仍保留 stderr 那一份")
		flagMaxSize  = fs.Int("log.max_size_mb", 0, "日誌檔超過此 MB 數即輪替；0 代表只按日輪替（預設 32）")
		flagRetain   = fs.Int("log.retain_days", 0, "輪替檔保留天數；0 代表永久保留（預設 14）")
		flagMaxFiles = fs.Int("log.max_files", 0, "輪替檔份數上限；0 代表不設上限（預設 14）")
		flagSource   = fs.Bool("log.source", false, "每筆紀錄附上 file:line（預設只在 debug 模式開啟）")
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
	// 只套用命令列上真的出現過的旗標：未給的 bool 是 false，無條件寫回去等於
	// 讓命令列默默關掉沒人提過的設定。
	if set["debug"] {
		file.Debug = *flagDebug
	}
	if set["log.level"] {
		file.Log.Level = *flagLevel
	}
	if set["log.format"] {
		file.Log.Format = *flagFormat
	}
	if set["log.file"] {
		file.Log.File = *flagFile
	}
	if set["log.stderr"] {
		file.Log.Stderr = flagStderr
	}
	if set["log.max_size_mb"] {
		file.Log.MaxSizeMB = *flagMaxSize
	}
	if set["log.retain_days"] {
		file.Log.RetainDays = *flagRetain
	}
	if set["log.max_files"] {
		file.Log.MaxFiles = *flagMaxFiles
	}
	if set["log.source"] {
		file.Log.Source = *flagSource
	}
	if err := file.Log.Validate(); err != nil {
		return File{}, "", "", nil, err
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
	logCfg := file.Log
	if logCfg.Level == "" {
		logCfg.Level = defaultLogLevel
	}
	if logCfg.Format == "" {
		logCfg.Format = logging.FormatText
	}
	return Config{
		ListenAddr:     listenAddr,
		AllowedOrigins: file.AllowedOrigins,
		Debug:          file.Debug,
		Log:            logCfg,
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
	out = append(out, '\n')
	dir := filepath.Dir(path)
	tmp, err := os.CreateTemp(dir, "."+filepath.Base(path)+".tmp-*")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	cleanup := func() {
		_ = tmp.Close()
		_ = os.Remove(tmpPath)
	}
	defer cleanup()
	if err := tmp.Chmod(0o600); err != nil {
		return err
	}
	if _, err := tmp.Write(out); err != nil {
		return err
	}
	if err := tmp.Sync(); err != nil {
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return err
	}
	// The file itself is durable above. On Unix, syncing its directory also
	// makes the rename durable across a sudden power loss.
	if runtime.GOOS != "windows" {
		if d, err := os.Open(dir); err == nil {
			_ = d.Sync()
			_ = d.Close()
		}
	}
	return nil
}
