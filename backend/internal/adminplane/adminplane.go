// Package adminplane 讓 sr-web 分流後端接受 hoshi-admin 統一管理平臺的調度。
//
// 它把既有的 config.Store 與 router 投影成 Hoshi Control Plane Contract v1
// 的形狀：分流參數成為設定分區、節點清單成為可增刪改的資源、重新探活成為動作。
// 平臺依這份描述即時算繪後臺，本服務因此不需要為了「被統一管理」而多寫任何介面。
//
// 這不取代既有的 /admin 網頁後臺——那仍是本服務可獨立運作的證明；控制平面是
// 另一條給機器走的路。
package adminplane

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/hoshivel/hoshi-api-spec/hoshi-client-go/controlplane"
	"github.com/hoshivel/sr-web/backend/internal/config"
	"github.com/hoshivel/sr-web/backend/internal/logging"
	"github.com/hoshivel/sr-web/backend/internal/play"
)

// Router 是本套件用到的 router 能力（介面化以便測試替身）。
type Router interface {
	Snapshot() play.Response
	Reprobe()
}

// Adapter 把契約映射到 config.Store 與 router。
type Adapter struct {
	store   *config.Store
	router  Router
	version string
	log     *logging.Logger
}

// log 為 nil 時丟棄輸出，測試因此不必為此多做設定。
func New(store *config.Store, rt Router, version string, log *logging.Logger) *Adapter {
	if log == nil {
		log = logging.Discard()
	}
	return &Adapter{store: store, router: rt, version: version, log: log}
}

// 診斷設定是**執行期**的：套用後立刻改變這個行程寫出什麼，而且刻意不持久化。
// 一個可以從後臺被永久留在 debug 模式的服務——在按下開關的人早就不看了之後——
// 就是一個會安靜地把磁碟寫滿的服務。重啟即回到 config.json。
const (
	KeyLogLevel = "diagnostics.log_level"
	KeyDebug    = "diagnostics.debug"
)

// Handler 建立已簽章驗證的控制平面處理器，供掛在控制監聽器上。
func (a *Adapter) Handler() (http.Handler, error) {
	ctrl := a.store.Control()
	keyID := ctrl.KeyID
	if keyID == "" {
		keyID = "hoshi-admin"
	}
	agent, err := controlplane.NewAgent(
		map[string]string{keyID: ctrl.Secret},
		controlplane.Handlers{
			Descriptor:    a.Descriptor,
			Health:        a.Health,
			ConfigGet:     a.ConfigGet,
			ConfigPut:     a.ConfigPut,
			ResourceList:  a.ResourceList,
			ResourceApply: a.ResourceApply,
			Action:        a.Action,
		})
	if err != nil {
		return nil, err
	}
	// 本服務沒有稽核資料表；退而求其次寫進伺服器日誌，讓「平臺改了什麼」
	// 即使管理平臺不可用也還查得到。
	agent.OnAudit = func(_ context.Context, actor, action, detail string) {
		a.log.Info("control plane applied a change",
			"actor", actor, "action", action, "detail", detail)
	}
	// 另一半：被拒絕的呼叫。線路上的回應刻意是無差別的 401（區分五種失敗會讓
	// 攻擊者能列舉出哪些金鑰 id 有效），所以少了這裡，共享密鑰打錯就是一個
	// 兩側都無跡可尋的故障。rej.KeyID 是呼叫者宣稱的、沒有任何東西驗證過，
	// 只當線索記，不當身分記。
	agent.OnReject = func(_ context.Context, rej controlplane.Rejection) {
		// suppressed 是「這一分鐘還有 31 次」與「就這一次」的差別，
		// 也就是「設定錯了」與「有人在逐一嘗試」的差別。
		a.log.Warn("control plane rejected a request",
			"reason", rej.Reason, "explain", rej.Explain,
			"key_id", rej.KeyID, "method", rej.Method, "path", rej.Path,
			"remote_addr", rej.RemoteAddr, "skew", rej.Skew.String(),
			"suppressed", rej.Suppressed)
	}
	mux := http.NewServeMux()
	mux.Handle(controlplane.BasePath+"/", agent.Handler())
	return mux, nil
}

// 設定鍵（以分區命名空間化，契約要求）。
const (
	KeyProbeInterval     = "dispatch.probe_interval_seconds"
	KeyProbeTimeout      = "dispatch.probe_timeout_seconds"
	KeyMaxCandidates     = "dispatch.max_candidates"
	KeyAllowedOrigins    = "web.allowed_origins"
	KeyTrustProxyHeaders = "geo.trust_proxy_headers"
	KeyLatHeader         = "geo.lat_header"
	KeyLonHeader         = "geo.lon_header"
	KeyCountryHeader     = "geo.country_header"
)

// --- descriptor -----------------------------------------------------------

func (a *Adapter) Descriptor(context.Context) (controlplane.Descriptor, error) {
	one, sixty := 1.0, 3600.0
	return controlplane.Descriptor{
		Service: "sr-web",
		Name:    "SR 官網分流",
		Version: a.version,
		Summary: "Shattered Realms 官網的節點探活、就近分流與負載均衡後端。",
		Sections: []controlplane.Section{
			{
				ID: "dispatch", Title: "分流",
				Help: "變更即時生效並持久化到 config.json，不需重啟。",
				Fields: []controlplane.Field{
					{Key: KeyProbeInterval, Label: "探活週期（秒）", Type: controlplane.TypeInt,
						Min: &one, Max: &sixty, Help: "背景對每個節點做一次健康探測的間隔。"},
					{Key: KeyProbeTimeout, Label: "探活逾時（秒）", Type: controlplane.TypeInt,
						Min: &one, Max: &sixty, Help: "單次探測的等待上限；超過即視為該節點不健康。"},
					{Key: KeyMaxCandidates, Label: "候選節點上限", Type: controlplane.TypeInt,
						Min: &one, Help: "每位玩家最多看到幾個候選入點。刻意收斂，不把全部節點敞開給前端。"},
				},
			},
			{
				ID: "web", Title: "網站",
				Fields: []controlplane.Field{
					{Key: KeyAllowedOrigins, Label: "允許的瀏覽器來源", Type: controlplane.TypeCSV,
						Help: "每行一個 origin（如 https://sr.hoshivel.com）。留空＝放行任意來源，僅適合本機開發。"},
				},
			},
			{
				ID: "diagnostics", Title: "診斷與日誌",
				Help: "這一區是**執行期**設定：套用後立刻生效，但不寫回 config.json，" +
					"服務重啟即回到檔案的值。用來在追查問題時暫時打開 debug，查完不必記得關。",
				Fields: []controlplane.Field{
					{Key: KeyLogLevel, Label: "日誌層級", Type: controlplane.TypeEnum,
						Options: []controlplane.Option{
							{Value: "debug", Label: "debug（全部）"},
							{Value: "info", Label: "info（預設）"},
							{Value: "warn", Label: "warn（僅警告以上）"},
							{Value: "error", Label: "error（僅錯誤）"},
						},
						Help: "低於此層級的訊息不會寫出。"},
					{Key: KeyDebug, Label: "Debug 模式", Type: controlplane.TypeBool,
						Help: "打開等同把層級調到 debug，並逐筆記錄請求與每一次節點探活。" +
							"關閉時回到 config.json 指定的層級，而不是回到 info。"},
				},
			},
			{
				ID: "geo", Title: "地理分流",
				Help: "依用戶地理位置就近排序節點。",
				Fields: []controlplane.Field{
					{Key: KeyTrustProxyHeaders, Label: "採信反向代理的地理標頭", Type: controlplane.TypeBool,
						Help: "只有在可信的反向代理／CDN 之後才可開啟：否則任何人都能偽造自己的位置。"},
					{Key: KeyLatHeader, Label: "緯度標頭", Type: controlplane.TypeString, Placeholder: "CF-IPLatitude"},
					{Key: KeyLonHeader, Label: "經度標頭", Type: controlplane.TypeString, Placeholder: "CF-IPLongitude"},
					{Key: KeyCountryHeader, Label: "國別標頭", Type: controlplane.TypeString, Placeholder: "CF-IPCountry"},
				},
			},
		},
		Resources: []controlplane.Resource{
			{
				ID: "regions", Title: "遊戲節點",
				Help:       "前端「開始遊戲」會被導向這些節點之一。停用的節點不探活、也不會出現在任何回應中。",
				Searchable: true,
				Ops:        []string{controlplane.OpCreate, controlplane.OpUpdate, controlplane.OpDelete},
				Columns: []controlplane.Column{
					{Key: "id", Label: "代號"},
					{Key: "host", Label: "主機"},
					{Key: "url", Label: "入點 URL", Type: controlplane.TypeURL},
					{Key: "country", Label: "國別"},
					{Key: "healthy", Label: "探活"},
					{Key: "latency_ms", Label: "延遲(ms)"},
					{Key: "disabled", Label: "停用"},
					{Key: "created_at", Label: "登錄時間"},
				},
				Fields: []controlplane.Field{
					{Key: "id", Label: "節點代號", Type: controlplane.TypeString, Required: true,
						Help: "如 hk1。建立後不可變更。"},
					{Key: "host", Label: "主機名", Type: controlplane.TypeString, Required: true,
						Help: "如 play.sr.hoshivel.com。未填探活端點時，預設探 https://<主機名>/healthz。"},
					{Key: "url", Label: "入點 URL", Type: controlplane.TypeURL, Required: true,
						Help: "前端實際嵌入／導向的遊戲位址。"},
					{Key: "health_url", Label: "探活端點", Type: controlplane.TypeURL,
						Help: "留空則由主機名推導。需要 http 或自訂路徑時才填。"},
					{Key: "lat", Label: "緯度", Type: controlplane.TypeFloat,
						Help: "十進位度。與經度皆留空時退用國別質心。"},
					{Key: "lon", Label: "經度", Type: controlplane.TypeFloat},
					{Key: "country", Label: "國別碼", Type: controlplane.TypeString,
						Help: "ISO-3166-1 alpha-2，如 HK。未給精確座標時以國家質心近似。"},
					{Key: "disabled", Label: "停用此節點", Type: controlplane.TypeBool},
				},
			},
		},
		Actions: []controlplane.Action{
			{
				ID: "reprobe", Title: "立即重新探活",
				Help: "不等下一個週期，馬上對所有啟用中的節點重測一次。",
			},
		},
	}, nil
}

// --- health ---------------------------------------------------------------

func (a *Adapter) Health(context.Context) (controlplane.Health, error) {
	snap := a.router.Snapshot()
	out := controlplane.Health{Status: controlplane.StatusOK}

	healthy, totalLatency := 0, 0
	for _, r := range snap.Regions {
		status := controlplane.StatusDown
		detail := "探活失敗或逾時"
		if r.Healthy {
			status, detail = controlplane.StatusOK, fmt.Sprintf("%d ms", r.LatencyMS)
			healthy++
			totalLatency += r.LatencyMS
		}
		out.Checks = append(out.Checks, controlplane.Check{
			ID: r.ID, Label: r.Host, Status: status, Detail: detail,
		})
	}

	switch {
	case len(snap.Regions) == 0:
		// 沒有任何啟用中的節點＝玩家按下「開始遊戲」時無處可去。
		out.Status = controlplane.StatusDown
		out.Message = "沒有任何啟用中的節點，前端將無法取得入點。"
	case healthy == 0:
		out.Status = controlplane.StatusDown
		out.Message = "所有節點探活失敗，前端將無法取得可用入點。"
	case healthy < len(snap.Regions):
		out.Status = controlplane.StatusDegraded
		out.Message = fmt.Sprintf("%d 個節點中有 %d 個無法連線。", len(snap.Regions), len(snap.Regions)-healthy)
	}

	avg := "—"
	if healthy > 0 {
		avg = fmt.Sprintf("%d ms", totalLatency/healthy)
	}
	recommended := snap.RecommendedID
	if recommended == "" {
		recommended = "—"
	}
	out.Metrics = []controlplane.Metric{
		{ID: "regions", Label: "節點", Value: fmt.Sprintf("%d", len(snap.Regions))},
		{ID: "healthy", Label: "健康", Value: fmt.Sprintf("%d", healthy)},
		{ID: "latency", Label: "平均延遲", Value: avg},
		{ID: "recommended", Label: "建議入點", Value: recommended},
	}
	return out, nil
}

// --- configuration --------------------------------------------------------

func (a *Adapter) ConfigGet(context.Context) (controlplane.ConfigDoc, error) {
	set := a.store.Settings()
	return controlplane.ConfigDoc{
		Revision: revisionOf(set),
		Values: map[string]any{
			KeyProbeInterval:     set.ProbeIntervalSeconds,
			KeyProbeTimeout:      set.ProbeTimeoutSeconds,
			KeyMaxCandidates:     set.MaxCandidates,
			KeyAllowedOrigins:    set.AllowedOrigins,
			KeyTrustProxyHeaders: set.Geo.TrustProxyHeaders,
			KeyLatHeader:         set.Geo.LatHeader,
			KeyLonHeader:         set.Geo.LonHeader,
			KeyCountryHeader:     set.Geo.CountryHeader,
			// 執行期的實況，不是檔案裡寫的：這一區存在的意義就是回答
			// 「這個服務現在是不是在 debug 模式」，而控制平面改過之後兩者會不同。
			KeyLogLevel: logging.LevelName(a.log.Level()),
			KeyDebug:    a.log.Debugging(),
		},
	}, nil
}

func (a *Adapter) ConfigPut(ctx context.Context, patch controlplane.ConfigPatch) (controlplane.ConfigResult, error) {
	// 先讀出目前值再逐鍵覆寫：UpdateSettings 是整份覆蓋，直接送 patch 會把
	// 未出現在 patch 裡的欄位（例如 geo.countryCoords 覆寫表）清空。
	set := a.store.Settings()
	if patch.Revision != "" && patch.Revision != revisionOf(set) {
		return controlplane.ConfigResult{}, controlplane.ErrConflict
	}

	applied := make([]string, 0, len(patch.Values))
	// 診斷鍵在迴圈之外先處理，而且層級先於 debug：range 走 map 的順序是隨機的，
	// 而同一份 patch 同時帶兩個鍵時，「關掉 debug、改到 warn」必須落在送來的那個
	// 層級上，不是回到 debug 之前的那一個。
	diagnostics, err := a.applyDiagnostics(patch.Values)
	if err != nil {
		return controlplane.ConfigResult{}, err
	}
	applied = append(applied, diagnostics...)

	for key, raw := range patch.Values {
		switch key {
		case KeyLogLevel, KeyDebug:
			continue // 已於上方套用
		case KeyProbeInterval:
			n, err := intValue(key, raw, 1, 3600)
			if err != nil {
				return controlplane.ConfigResult{}, err
			}
			set.ProbeIntervalSeconds = n
		case KeyProbeTimeout:
			n, err := intValue(key, raw, 1, 3600)
			if err != nil {
				return controlplane.ConfigResult{}, err
			}
			set.ProbeTimeoutSeconds = n
		case KeyMaxCandidates:
			n, err := intValue(key, raw, 1, 100)
			if err != nil {
				return controlplane.ConfigResult{}, err
			}
			set.MaxCandidates = n
		case KeyAllowedOrigins:
			origins := strList(raw)
			for _, origin := range origins {
				if u, err := url.Parse(origin); err != nil || !u.IsAbs() || u.Host == "" ||
					u.Path != "" || u.RawQuery != "" {
					return controlplane.ConfigResult{}, controlplane.Invalid(key,
						fmt.Sprintf("%q 不是合法的 origin（應為 https://host 形式，不含路徑）", origin))
				}
			}
			set.AllowedOrigins = origins
		case KeyTrustProxyHeaders:
			b, ok := raw.(bool)
			if !ok {
				return controlplane.ConfigResult{}, controlplane.Invalid(key, "必須是布林值")
			}
			set.Geo.TrustProxyHeaders = b
		case KeyLatHeader:
			set.Geo.LatHeader = strings.TrimSpace(str(raw))
		case KeyLonHeader:
			set.Geo.LonHeader = strings.TrimSpace(str(raw))
		case KeyCountryHeader:
			set.Geo.CountryHeader = strings.TrimSpace(str(raw))
		default:
			return controlplane.ConfigResult{}, controlplane.Invalid(key, "未知的設定鍵")
		}
		applied = append(applied, key)
	}
	if err := a.store.UpdateSettings(set); err != nil {
		return controlplane.ConfigResult{}, err
	}
	doc, err := a.ConfigGet(ctx)
	if err != nil {
		return controlplane.ConfigResult{}, err
	}
	return controlplane.ConfigResult{
		Revision: doc.Revision, Values: doc.Values, Applied: applied,
		Message: "已套用並寫入 config.json",
	}, nil
}

// applyDiagnostics 把執行期的日誌鍵從 patch 裡挑出來套到 live logger 上，
// 並回報它消化掉了哪些鍵，好讓呼叫端把它們算進 Applied。
func (a *Adapter) applyDiagnostics(values map[string]any) ([]string, error) {
	var applied []string
	if raw, ok := values[KeyLogLevel]; ok {
		// 型別是檢查而不是硬轉：ParseLevel 把「沒有值」當成 info，
		// 那對「設定檔沒寫這個鍵」是對的，對這裡是錯的——後臺送來一個數字
		// 或空字串會變成默默把層級重設掉，而不是被告知它不合法。
		name, isText := raw.(string)
		if !isText || strings.TrimSpace(name) == "" {
			return nil, controlplane.Invalid(KeyLogLevel, "必須是 debug、info、warn 或 error 其中之一")
		}
		level, err := logging.ParseLevel(name)
		if err != nil {
			return nil, controlplane.Invalid(KeyLogLevel, err.Error())
		}
		a.log.SetLevel(level)
		applied = append(applied, KeyLogLevel)
	}
	if raw, ok := values[KeyDebug]; ok {
		on, isBool := raw.(bool)
		if !isBool {
			return nil, controlplane.Invalid(KeyDebug, "必須是 true 或 false")
		}
		a.log.SetDebug(on)
		applied = append(applied, KeyDebug)
	}
	if len(applied) > 0 {
		// 值得自己一行，而且是 warn：把音量開大是一個有代價的維運動作，
		// 而「日誌怎麼突然多了十倍」的答案就是這一行。
		a.log.Warn("logging changed from the control plane",
			"level", logging.LevelName(a.log.Level()), "debug", a.log.Debugging(),
			"note", "runtime only; a restart returns to config.json")
	}
	return applied, nil
}

// revisionOf 以設定內容的指紋作為樂觀併發標記：兩位維運同一秒內存檔仍會得到
// 不同的 revision，第二次存檔會被正確擋下而不是默默覆蓋。
func revisionOf(set config.Settings) string {
	raw, err := json.Marshal(set)
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])[:16]
}

// --- resources ------------------------------------------------------------

func (a *Adapter) ResourceList(_ context.Context, resource string, q controlplane.Query) (controlplane.ResourcePage, error) {
	if resource != "regions" {
		return controlplane.ResourcePage{}, controlplane.ErrNotFound
	}
	// 靜態設定來自 Store，即時探活結果來自 router：兩者合併，維運才能在同一張
	// 表上看到「設定成什麼」與「現在通不通」。
	live := map[string]play.Region{}
	for _, r := range a.router.Snapshot().Regions {
		live[r.ID] = r
	}
	regions := a.store.Regions()
	sort.Slice(regions, func(i, j int) bool { return regions[i].ID < regions[j].ID })

	rows := make([]controlplane.Row, 0, len(regions))
	for _, r := range regions {
		if q.Q != "" && !matches(q.Q, r.ID, r.Host, r.Country) {
			continue
		}
		values := map[string]any{
			"id": r.ID, "host": r.Host, "url": r.URL, "health_url": r.HealthURL,
			"lat": r.Lat, "lon": r.Lon, "country": r.Country, "disabled": r.Disabled,
			"healthy": "—", "latency_ms": "—",
		}
		// 本欄位之前登錄的節點顯示空白，不猜一個日期。
		values["created_at"] = dateLabel(r.CreatedAt)
		if snap, ok := live[r.ID]; ok {
			values["healthy"] = boolLabel(snap.Healthy)
			values["latency_ms"] = snap.LatencyMS
		} else if r.Disabled {
			values["healthy"] = "已停用"
			if at := dateLabel(r.DisabledAt); at != "" {
				values["healthy"] = "已停用（" + at + " 起）"
			}
		}
		rows = append(rows, controlplane.Row{ID: r.ID, Values: values})
	}
	return controlplane.ResourcePage{Rows: rows, Total: len(rows)}, nil
}

func (a *Adapter) ResourceApply(_ context.Context, resource string, op controlplane.ResourceOp) (controlplane.ResourceResult, error) {
	if resource != "regions" {
		return controlplane.ResourceResult{}, controlplane.ErrNotFound
	}
	if op.Op == controlplane.OpDelete {
		if op.ID == "" {
			return controlplane.ResourceResult{}, controlplane.Invalid("id", "缺少節點代號")
		}
		if err := a.store.DeleteRegion(op.ID); err != nil {
			return controlplane.ResourceResult{}, controlplane.Invalid("id", err.Error())
		}
		return controlplane.ResourceResult{OK: true, Message: "已移除節點"}, nil
	}

	region := config.Region{
		ID:        strings.TrimSpace(str(op.Values["id"])),
		Host:      strings.TrimSpace(str(op.Values["host"])),
		URL:       strings.TrimSpace(str(op.Values["url"])),
		HealthURL: strings.TrimSpace(str(op.Values["health_url"])),
		Lat:       floatOf(op.Values["lat"]),
		Lon:       floatOf(op.Values["lon"]),
		Country:   strings.ToUpper(strings.TrimSpace(str(op.Values["country"]))),
		Disabled:  boolOf(op.Values["disabled"]),
	}
	if op.Op == controlplane.OpUpdate {
		// 路徑上的 id 為準：body 指向另一個節點時，改的會是錯的那一個。
		region.ID = op.ID
	}
	if err := validateRegion(region); err != nil {
		return controlplane.ResourceResult{}, err
	}
	if op.Op == controlplane.OpCreate {
		for _, existing := range a.store.Regions() {
			if strings.EqualFold(existing.ID, region.ID) {
				return controlplane.ResourceResult{}, controlplane.Invalid("id", "此節點代號已存在")
			}
		}
	}
	// UpsertRegion 之後 Store 會通知 router 換清單並重探，因此新節點的探活結果
	// 會在下一次列表就出現，不必等下一個週期。
	if err := a.store.UpsertRegion(region); err != nil {
		return controlplane.ResourceResult{}, controlplane.Invalid("id", err.Error())
	}
	return controlplane.ResourceResult{
		OK:      true,
		Row:     &controlplane.Row{ID: region.ID, Values: map[string]any{"id": region.ID, "host": region.Host}},
		Message: "已儲存節點，並立即重新探活",
	}, nil
}

func validateRegion(r config.Region) error {
	if r.ID == "" || strings.ContainsAny(r.ID, " \t/?#") {
		return controlplane.Invalid("id", "節點代號不可空白或含空白與 / ? #")
	}
	if r.Host == "" {
		return controlplane.Invalid("host", "主機名不可空白")
	}
	if u, err := url.Parse(r.URL); err != nil || !u.IsAbs() || u.Host == "" {
		return controlplane.Invalid("url", "入點 URL 必須是絕對 URL")
	}
	if r.HealthURL != "" {
		if u, err := url.Parse(r.HealthURL); err != nil || !u.IsAbs() || u.Host == "" {
			return controlplane.Invalid("health_url", "探活端點必須是絕對 URL")
		}
	}
	if r.Lat < -90 || r.Lat > 90 {
		return controlplane.Invalid("lat", "緯度需介於 -90 至 90")
	}
	if r.Lon < -180 || r.Lon > 180 {
		return controlplane.Invalid("lon", "經度需介於 -180 至 180")
	}
	if r.Country != "" && len(r.Country) != 2 {
		return controlplane.Invalid("country", "國別碼需為兩碼（ISO-3166-1 alpha-2）")
	}
	return nil
}

// --- actions --------------------------------------------------------------

func (a *Adapter) Action(_ context.Context, action string, _ controlplane.ActionRequest) (controlplane.ActionResult, error) {
	if action != "reprobe" {
		return controlplane.ActionResult{}, controlplane.ErrNotFound
	}
	a.router.Reprobe()
	snap := a.router.Snapshot()
	healthy := 0
	for _, r := range snap.Regions {
		if r.Healthy {
			healthy++
		}
	}
	return controlplane.ActionResult{
		OK:      true,
		Message: fmt.Sprintf("已重新探活：%d / %d 個節點健康", healthy, len(snap.Regions)),
		Data: map[string]any{
			"regions": len(snap.Regions), "healthy": healthy,
			"recommended": snap.RecommendedID, "updatedAt": snap.UpdatedAt,
		},
	}, nil
}

// --- helpers --------------------------------------------------------------

func str(v any) string {
	s, _ := v.(string)
	return s
}

func boolOf(v any) bool {
	b, _ := v.(bool)
	return b
}

// floatOf accepts the JSON number the console sends and the string a
// hand-written call might.
func floatOf(v any) float64 {
	switch value := v.(type) {
	case float64:
		return value
	case int:
		return float64(value)
	case string:
		var f float64
		if _, err := fmt.Sscanf(strings.TrimSpace(value), "%g", &f); err == nil {
			return f
		}
	}
	return 0
}

func intValue(key string, v any, min, max int) (int, error) {
	var n int
	switch value := v.(type) {
	case float64:
		// JSON 沒有整數型別；非整數的值是輸入錯誤，不該悄悄截斷。
		if value != float64(int(value)) {
			return 0, controlplane.Invalid(key, "必須是整數")
		}
		n = int(value)
	case int:
		n = value
	default:
		return 0, controlplane.Invalid(key, "必須是整數")
	}
	if n < min || n > max {
		return 0, controlplane.Invalid(key, fmt.Sprintf("需介於 %d 至 %d", min, max))
	}
	return n, nil
}

// strList 接受契約 csv 型別的字串陣列，也接受逗號／換行分隔的字串。
func strList(v any) []string {
	switch value := v.(type) {
	case []any:
		out := make([]string, 0, len(value))
		for _, item := range value {
			if s := strings.TrimSpace(str(item)); s != "" {
				out = append(out, s)
			}
		}
		return out
	case []string:
		return value
	case string:
		var out []string
		for _, item := range strings.FieldsFunc(value, func(r rune) bool {
			return r == ',' || r == '\n' || r == '\r'
		}) {
			if item = strings.TrimSpace(item); item != "" {
				out = append(out, item)
			}
		}
		return out
	}
	return nil
}

func matches(query string, fields ...string) bool {
	query = strings.ToLower(query)
	for _, f := range fields {
		if strings.Contains(strings.ToLower(f), query) {
			return true
		}
	}
	return false
}

func boolLabel(v bool) string {
	if v {
		return "健康"
	}
	return "不可用"
}

// dateLabel 把 RFC3339 時點縮成日期給後臺列表用。空字串代表「當時沒記」——
// 本欄位之前登錄的節點就是這種情形，顯示空白比顯示一個猜出來的日期誠實。
func dateLabel(stamp string) string {
	if stamp == "" {
		return ""
	}
	at, err := time.Parse(time.RFC3339, stamp)
	if err != nil {
		return ""
	}
	return at.UTC().Format("2006-01-02")
}
