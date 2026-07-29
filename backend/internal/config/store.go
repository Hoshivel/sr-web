package config

import (
	"fmt"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/moehoshio/sr-web/backend/internal/geo"
)

// trimID 去除節點 id 前後空白。
func trimID(id string) string { return strings.TrimSpace(id) }

// Store 是「即時、可變、持久化」的設定中樞，供後臺動態管理。它包住磁碟 File，所有
// 讀取回傳副本、所有變更在鎖內套用 → 驗證 → 持久化 → 原子替換，並在節點清單變動時
// 通知訂閱者（router 重探）。零第三方相依、-race 安全。
type Store struct {
	mu         sync.RWMutex
	file       File
	path       string
	listenAddr string
	notes      []string

	onRegionsChange func([]Region)
}

// LoadStore 解析 flags＋設定檔（缺檔則產生預設）並回傳即時 Store。
func LoadStore(args []string) (*Store, error) {
	file, listenAddr, path, notes, err := resolve(args)
	if err != nil {
		return nil, err
	}
	return &Store{file: file, path: path, listenAddr: listenAddr, notes: notes}, nil
}

// NewStore 由記憶體中的 File 直接建立 Store（不經 CLI / flags）。path 為變更持久化的
// 目標檔（可留空供唯讀使用）。主要供測試與內嵌情境。
func NewStore(file File, path string) *Store {
	return &Store{
		file:       file,
		path:       path,
		listenAddr: net.JoinHostPort(file.Listen.IP, strconv.Itoa(file.Listen.Port)),
	}
}

// Config 回傳當前設定推導出的執行期 Config（副本）。
func (s *Store) Config() Config {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return deriveConfig(s.file.clone(), s.listenAddr, s.path, s.notes)
}

// Path 回傳設定檔路徑。
func (s *Store) Path() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.path
}

// Regions 回傳節點清單副本（含停用者，供後臺列出）。
func (s *Store) Regions() []Region {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneRegions(s.file.Regions)
}

// AllowedOrigins 回傳 CORS 允許來源副本（server per-request 讀）。
func (s *Store) AllowedOrigins() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]string(nil), s.file.AllowedOrigins...)
}

// Geo 回傳地理設定（已補預設；每次呼叫為新副本）。
func (s *Store) Geo() geo.Settings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.file.Geo.Settings()
}

// MaxCandidates 回傳候選上限（補預設）。
func (s *Store) MaxCandidates() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.file.MaxCandidates <= 0 {
		return defaultMaxCandidates
	}
	return s.file.MaxCandidates
}

// Admin 回傳後臺憑證（副本）。
func (s *Store) Admin() Admin {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.file.Admin
}

// Settings 是後臺可調的執行期設定投影（不含 regions / admin）。
type Settings struct {
	AllowedOrigins       []string  `json:"allowedOrigins"`
	ProbeIntervalSeconds int       `json:"probeIntervalSeconds"`
	ProbeTimeoutSeconds  int       `json:"probeTimeoutSeconds"`
	MaxCandidates        int       `json:"maxCandidates"`
	Geo                  GeoConfig `json:"geo"`
}

// Control 回傳控制平面設定（副本）。
func (s *Store) Control() Control {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.file.Control
}

// Settings 回傳當前可調設定的投影（副本）。
func (s *Store) Settings() Settings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return Settings{
		AllowedOrigins:       append([]string(nil), s.file.AllowedOrigins...),
		ProbeIntervalSeconds: s.file.ProbeIntervalSeconds,
		ProbeTimeoutSeconds:  s.file.ProbeTimeoutSeconds,
		MaxCandidates:        s.file.MaxCandidates,
		Geo:                  s.file.Geo,
	}
}

// OnRegionsChange 註冊節點清單變動時的回呼（router 用來即時重探）。變動事件在鎖外
// 觸發，回呼不應回頭呼叫 Store 的變更方法（避免自我遞迴）。
func (s *Store) OnRegionsChange(fn func([]Region)) {
	s.mu.Lock()
	s.onRegionsChange = fn
	s.mu.Unlock()
}

// update 在鎖內對 File 副本套用 mutate → 驗證 → 持久化 → 替換，並於節點清單變動時
// （鎖外）通知訂閱者。任何一步失敗則不改變現狀。
func (s *Store) update(mutate func(*File) error) error {
	s.mu.Lock()
	draft := s.file.clone()
	if err := mutate(&draft); err != nil {
		s.mu.Unlock()
		return err
	}
	if err := validateFile(draft); err != nil {
		s.mu.Unlock()
		return err
	}
	if err := writeConfig(s.path, draft); err != nil {
		s.mu.Unlock()
		return fmt.Errorf("persist config: %w", err)
	}
	changed := regionsChanged(s.file.Regions, draft.Regions)
	s.file = draft
	cb := s.onRegionsChange
	newRegions := cloneRegions(draft.Regions)
	s.mu.Unlock()

	if changed && cb != nil {
		cb(newRegions)
	}
	return nil
}

// UpsertRegion 新增或更新一個節點（以 id 比對）。
func (s *Store) UpsertRegion(r Region) error {
	r.ID = trimID(r.ID)
	if r.ID == "" {
		return fmt.Errorf("region id 不可為空")
	}
	return s.update(func(f *File) error {
		for i := range f.Regions {
			if f.Regions[i].ID == r.ID {
				// 更新既有節點：登錄時點屬於「當初加進來的那一刻」，
				// 不隨編輯而變；呼叫端送來的值一律忽略，否則一次後臺編輯
				// 就能把它改成今天。停用時點同理由 stampDisabled 決定。
				r.CreatedAt = f.Regions[i].CreatedAt
				r.DisabledAt = f.Regions[i].DisabledAt
				stampDisabled(&r, f.Regions[i].Disabled)
				f.Regions[i] = r
				return nil
			}
		}
		r.CreatedAt = nowStamp()
		r.DisabledAt = ""
		stampDisabled(&r, false) // 從「不存在」進來，等同原本未停用
		f.Regions = append(f.Regions, r)
		return nil
	})
}

// nowStamp 是時點欄位統一的格式（與 play.Response.UpdatedAt 同為 RFC3339）。
func nowStamp() string { return time.Now().UTC().Format(time.RFC3339) }

// stampDisabled 依「停用狀態是否剛剛轉為 true」維護 DisabledAt：轉入時蓋章、
// 轉出時清空、狀態未變則保留原值。與 Disabled 同處寫入，兩個欄位才不會各說各話
// （停用中的節點做無關編輯不該把日期改成今天）。
func stampDisabled(r *Region, wasDisabled bool) {
	switch {
	case !r.Disabled:
		r.DisabledAt = ""
	case !wasDisabled || r.DisabledAt == "":
		r.DisabledAt = nowStamp()
	}
}

// DeleteRegion 移除一個節點。
func (s *Store) DeleteRegion(id string) error {
	id = trimID(id)
	return s.update(func(f *File) error {
		out := f.Regions[:0:0]
		found := false
		for _, r := range f.Regions {
			if r.ID == id {
				found = true
				continue
			}
			out = append(out, r)
		}
		if !found {
			return fmt.Errorf("region %q 不存在", id)
		}
		f.Regions = out
		return nil
	})
}

// SetRegionDisabled 停用 / 啟用一個節點（不刪除設定）。
func (s *Store) SetRegionDisabled(id string, disabled bool) error {
	id = trimID(id)
	return s.update(func(f *File) error {
		for i := range f.Regions {
			if f.Regions[i].ID == id {
				was := f.Regions[i].Disabled
				f.Regions[i].Disabled = disabled
				stampDisabled(&f.Regions[i], was)
				return nil
			}
		}
		return fmt.Errorf("region %q 不存在", id)
	})
}

// UpdateSettings 覆寫可調設定（不動 regions / admin）。
func (s *Store) UpdateSettings(in Settings) error {
	return s.update(func(f *File) error {
		f.AllowedOrigins = append([]string(nil), in.AllowedOrigins...)
		f.ProbeIntervalSeconds = in.ProbeIntervalSeconds
		f.ProbeTimeoutSeconds = in.ProbeTimeoutSeconds
		f.MaxCandidates = in.MaxCandidates
		f.Geo = in.Geo
		return nil
	})
}

// SetAdmin 覆寫後臺憑證（PBKDF2 雜湊已於呼叫端算好）。
func (s *Store) SetAdmin(a Admin) error {
	return s.update(func(f *File) error {
		f.Admin = a
		return nil
	})
}

// Notes 回傳載入期訊息（供啟動日誌）。
func (s *Store) Notes() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]string(nil), s.notes...)
}

// --- 輔助 ---

// clone 深拷貝 File（切片 / map 皆獨立），避免變更方法污染現狀。
func (f File) clone() File {
	out := f
	out.AllowedOrigins = append([]string(nil), f.AllowedOrigins...)
	out.Regions = cloneRegions(f.Regions)
	if f.Geo.CountryCoords != nil {
		cc := make(map[string][2]float64, len(f.Geo.CountryCoords))
		for k, v := range f.Geo.CountryCoords {
			cc[k] = v
		}
		out.Geo.CountryCoords = cc
	}
	return out
}

func cloneRegions(in []Region) []Region {
	if in == nil {
		return nil
	}
	return append([]Region(nil), in...)
}

// regionsChanged 回報兩份節點清單是否在「影響探活 / 分流」的欄位上有差異。
func regionsChanged(a, b []Region) bool {
	if len(a) != len(b) {
		return true
	}
	for i := range a {
		if a[i] != b[i] {
			return true
		}
	}
	return false
}

// validateFile 檢查設定的完整性：節點 id 非空且唯一、url 非空。
func validateFile(f File) error {
	seen := make(map[string]bool, len(f.Regions))
	for _, r := range f.Regions {
		id := trimID(r.ID)
		if id == "" {
			return fmt.Errorf("region id 不可為空")
		}
		if seen[id] {
			return fmt.Errorf("region id 重複：%q", id)
		}
		seen[id] = true
		if r.URL == "" {
			return fmt.Errorf("region %q 的 url 不可為空", id)
		}
	}
	return nil
}
