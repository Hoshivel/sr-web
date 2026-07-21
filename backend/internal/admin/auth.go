package admin

import (
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"sync"
	"time"

	"github.com/moehoshio/sr-web/backend/internal/config"
)

// 密碼雜湊參數（PBKDF2-SHA256，stdlib，零第三方相依）。
const (
	pbkdf2Algo   = "pbkdf2-sha256"
	pbkdf2Iters  = 100_000
	pbkdf2KeyLen = 32
	saltLen      = 16
	tokenLen     = 32
)

// hashPassword 以隨機鹽產生密碼的 PBKDF2 雜湊，回傳可持久化的 Admin 憑證。
func hashPassword(username, password string) (config.Admin, error) {
	salt := make([]byte, saltLen)
	if _, err := rand.Read(salt); err != nil {
		return config.Admin{}, err
	}
	key, err := pbkdf2.Key(sha256.New, password, salt, pbkdf2Iters, pbkdf2KeyLen)
	if err != nil {
		return config.Admin{}, err
	}
	return config.Admin{
		Username:     username,
		PasswordHash: base64.StdEncoding.EncodeToString(key),
		Salt:         base64.StdEncoding.EncodeToString(salt),
		Iterations:   pbkdf2Iters,
		Algo:         pbkdf2Algo,
	}, nil
}

// verifyPassword 以常數時間比對密碼是否符合儲存的 Admin 憑證。
func verifyPassword(a config.Admin, username, password string) bool {
	if !a.Configured() || a.Algo != pbkdf2Algo {
		return false
	}
	salt, err := base64.StdEncoding.DecodeString(a.Salt)
	if err != nil {
		return false
	}
	want, err := base64.StdEncoding.DecodeString(a.PasswordHash)
	if err != nil {
		return false
	}
	iters := a.Iterations
	if iters <= 0 {
		iters = pbkdf2Iters
	}
	got, err := pbkdf2.Key(sha256.New, password, salt, iters, len(want))
	if err != nil {
		return false
	}
	userOK := subtle.ConstantTimeCompare([]byte(a.Username), []byte(username)) == 1
	passOK := subtle.ConstantTimeCompare(got, want) == 1
	return userOK && passOK
}

// constEq 以常數時間比較兩字串是否相等（token 授權用）。
func constEq(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

// randToken 產生 URL-safe 的隨機權杖（n 位元組熵）。
func randToken(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand 失敗極罕見；回退為時間戳（僅避免空字串，實務上不會走到）。
		return base64.RawURLEncoding.EncodeToString([]byte(time.Now().String()))
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// sessions 是記憶體內的 session 存放（token → 到期時間），支援滑動續期與過期清理。
// 進程重啟即失效（可接受：後臺重登入即可）。
type sessions struct {
	mu  sync.Mutex
	m   map[string]time.Time
	ttl time.Duration
	now func() time.Time
}

func newSessions(ttl time.Duration) *sessions {
	return &sessions{m: make(map[string]time.Time), ttl: ttl, now: time.Now}
}

// create 產生新 session 並回傳其 token。
func (s *sessions) create() string {
	tok := randToken(tokenLen)
	s.mu.Lock()
	s.m[tok] = s.now().Add(s.ttl)
	s.gcLocked()
	s.mu.Unlock()
	return tok
}

// valid 回報 token 是否有效；有效則滑動續期。
func (s *sessions) valid(tok string) bool {
	if tok == "" {
		return false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	exp, ok := s.m[tok]
	if !ok {
		return false
	}
	if s.now().After(exp) {
		delete(s.m, tok)
		return false
	}
	s.m[tok] = s.now().Add(s.ttl) // 滑動續期
	return true
}

// destroy 使一個 token 失效。
func (s *sessions) destroy(tok string) {
	s.mu.Lock()
	delete(s.m, tok)
	s.mu.Unlock()
}

// gcLocked 清掉已過期的 session（呼叫端須持鎖）。
func (s *sessions) gcLocked() {
	now := s.now()
	for tok, exp := range s.m {
		if now.After(exp) {
			delete(s.m, tok)
		}
	}
}
