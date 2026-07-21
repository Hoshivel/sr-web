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
	"time"
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
}

// File 對應磁碟上的 config.json。
type File struct {
	Listen               Listen   `json:"listen"`
	AllowedOrigins       []string `json:"allowedOrigins"`
	ProbeIntervalSeconds int      `json:"probeIntervalSeconds"`
	ProbeTimeoutSeconds  int      `json:"probeTimeoutSeconds"`
	Regions              []Region `json:"regions"`
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
		Regions: []Region{
			{ID: "hk1", Host: "hk1.svc.oha.li", URL: "https://hk1.svc.oha.li/"},
			{ID: "jp1", Host: "jp1.svc.oha.li", URL: "https://jp1.svc.oha.li/"},
			{ID: "sg1", Host: "sg1.svc.oha.li", URL: "https://sg1.svc.oha.li/"},
		},
	}
}

// Load 由 CLI args 與設定檔解析出執行期設定（優先序 CLI > 檔 > 預設）。副作用：
// 設定檔不存在時會以預設值產生一份。
func Load(args []string) (Config, error) {
	fs := flag.NewFlagSet("sr-web-router", flag.ContinueOnError)
	var (
		flagConfig = fs.String("config", "", "設定檔路徑（.json）；預設取工作目錄的 config.json")
		flagIP     = fs.String("ip", "", "監聽 IP（空＝所有介面）")
		flagPort   = fs.Int("port", 0, "監聽埠")
	)
	if err := fs.Parse(args); err != nil {
		return Config{}, err
	}
	set := map[string]bool{}
	fs.Visit(func(f *flag.Flag) { set[f.Name] = true })

	file := defaultFile()
	path, notes, err := loadFile(*flagConfig, &file)
	if err != nil {
		return Config{}, err
	}

	ip, port := file.Listen.IP, file.Listen.Port
	if set["ip"] {
		ip = *flagIP
	}
	if set["port"] {
		port = *flagPort
	}

	interval := time.Duration(file.ProbeIntervalSeconds) * time.Second
	if interval <= 0 {
		interval = defaultProbeIntervalS * time.Second
	}
	timeout := time.Duration(file.ProbeTimeoutSeconds) * time.Second
	if timeout <= 0 {
		timeout = defaultProbeTimeoutS * time.Second
	}

	return Config{
		ListenAddr:     net.JoinHostPort(ip, strconv.Itoa(port)),
		AllowedOrigins: file.AllowedOrigins,
		ProbeInterval:  interval,
		ProbeTimeout:   timeout,
		Regions:        file.Regions,
		Path:           path,
		Notes:          notes,
	}, nil
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

// writeConfig 以縮排 JSON 寫出設定檔。
func writeConfig(path string, f File) error {
	out, err := json.MarshalIndent(f, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(out, '\n'), 0o644)
}
