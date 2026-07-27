// This file is copied from hoshi-admin's internal/controlplane/sign.go.
// The contract is defined there; change it there first and synchronise every
// managed service's copy (hoshi-admin docs/control-plane.md §6). Keeping the
// three files stdlib-only is what makes copying cheaper than a shared module.

package controlplane

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Control-plane requests are authenticated by HMAC-SHA256 over a canonical
// request string. The shared secret never travels on the wire — unlike a bearer
// token it cannot be replayed off a proxy log — and the timestamp plus nonce
// bind each signature to one request within a short window. That keeps the
// scheme safe on a private network even when the hop is plain HTTP, while TLS
// stays the recommendation for anything crossing a host boundary.

const (
	HeaderKey       = "X-Hoshi-Key"
	HeaderTimestamp = "X-Hoshi-Timestamp"
	HeaderNonce     = "X-Hoshi-Nonce"
	HeaderSignature = "X-Hoshi-Signature"
)

// MaxSkew is how far a request's timestamp may sit from the verifier's clock.
// Signatures outside the window are rejected, which bounds how long a captured
// request stays replayable to the nonce cache's retention.
const MaxSkew = 5 * time.Minute

// MinSecretLen is the shortest shared secret accepted. Short secrets are
// brute-forceable offline once an attacker holds one signed request.
const MinSecretLen = 32

var (
	ErrUnsigned  = errors.New("controlplane: request is not signed")
	ErrBadKey    = errors.New("controlplane: unknown signing key")
	ErrSkew      = errors.New("controlplane: timestamp outside the accepted window")
	ErrReplay    = errors.New("controlplane: nonce already used")
	ErrSignature = errors.New("controlplane: signature mismatch")
)

// canonical builds the string that gets signed. Every element is length-safe
// because the separator (newline) cannot occur in any component: the timestamp
// is digits, the nonce and body digest are hex, the method is a token, and the
// path is URL-escaped.
func canonical(ts, nonce, method, path string, body []byte) string {
	sum := sha256.Sum256(body)
	return strings.Join([]string{
		strconv.Itoa(Version),
		ts,
		nonce,
		strings.ToUpper(method),
		path,
		hex.EncodeToString(sum[:]),
	}, "\n")
}

func computeSignature(secret, ts, nonce, method, path string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(canonical(ts, nonce, method, path, body)))
	return hex.EncodeToString(mac.Sum(nil))
}

// Sign stamps the signing headers onto an outbound request. body must be the
// exact bytes the request will carry.
func Sign(h http.Header, keyID, secret, method, path string, body []byte, now time.Time) error {
	if keyID == "" || len(secret) < MinSecretLen {
		return fmt.Errorf("controlplane: signing key must have an id and a secret of at least %d characters", MinSecretLen)
	}
	nonce, err := randomNonce()
	if err != nil {
		return err
	}
	ts := strconv.FormatInt(now.Unix(), 10)
	h.Set(HeaderKey, keyID)
	h.Set(HeaderTimestamp, ts)
	h.Set(HeaderNonce, nonce)
	h.Set(HeaderSignature, computeSignature(secret, ts, nonce, method, path, body))
	return nil
}

func randomNonce() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("controlplane: nonce: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

// Verifier authenticates inbound control-plane requests against the shared
// secrets a service was configured with. The zero value is not usable; build
// one with NewVerifier.
type Verifier struct {
	keys map[string]string // key id → secret

	mu     sync.Mutex
	seen   map[string]time.Time // nonce → arrival, pruned past MaxSkew
	swept  time.Time
	nowFn  func() time.Time
	maxLen int
}

// NewVerifier builds a verifier over the given key id → secret map. Secrets
// shorter than MinSecretLen are rejected outright rather than quietly accepted,
// so a placeholder left in a config file fails loudly at startup.
func NewVerifier(keys map[string]string) (*Verifier, error) {
	if len(keys) == 0 {
		return nil, errors.New("controlplane: at least one signing key is required")
	}
	copied := make(map[string]string, len(keys))
	for id, secret := range keys {
		if id == "" {
			return nil, errors.New("controlplane: signing key id must not be empty")
		}
		if len(secret) < MinSecretLen {
			return nil, fmt.Errorf("controlplane: secret for key %q must be at least %d characters", id, MinSecretLen)
		}
		copied[id] = secret
	}
	return &Verifier{keys: copied, seen: make(map[string]time.Time), nowFn: time.Now}, nil
}

// Verify authenticates r. body must be the fully-read request body — the caller
// reads it once and hands the same bytes to the handler, because the signature
// covers the exact bytes received.
//
// It returns the key id that signed the request, which the caller may record in
// its audit trail to attribute the change to a particular platform.
func (v *Verifier) Verify(r *http.Request, body []byte) (string, error) {
	keyID := r.Header.Get(HeaderKey)
	ts := r.Header.Get(HeaderTimestamp)
	nonce := r.Header.Get(HeaderNonce)
	sig := r.Header.Get(HeaderSignature)
	if keyID == "" || ts == "" || nonce == "" || sig == "" {
		return "", ErrUnsigned
	}
	secret, ok := v.keys[keyID]
	if !ok {
		return "", ErrBadKey
	}
	seconds, err := strconv.ParseInt(ts, 10, 64)
	if err != nil {
		return "", ErrSkew
	}
	now := v.nowFn()
	if delta := now.Sub(time.Unix(seconds, 0)); delta > MaxSkew || delta < -MaxSkew {
		return "", ErrSkew
	}
	// Compare before spending a nonce slot, so an attacker cannot fill the cache
	// with unsigned garbage.
	want := computeSignature(secret, ts, nonce, r.Method, r.URL.EscapedPath(), body)
	if subtle.ConstantTimeCompare([]byte(want), []byte(sig)) != 1 {
		return "", ErrSignature
	}
	if !v.claimNonce(keyID+":"+nonce, now) {
		return "", ErrReplay
	}
	return keyID, nil
}

// claimNonce records a nonce and reports whether it was previously unseen.
// Entries older than the skew window can never be re-presented (Verify rejects
// them on timestamp first), so they are swept.
func (v *Verifier) claimNonce(nonce string, now time.Time) bool {
	v.mu.Lock()
	defer v.mu.Unlock()
	if now.Sub(v.swept) > MaxSkew {
		for k, at := range v.seen {
			if now.Sub(at) > MaxSkew {
				delete(v.seen, k)
			}
		}
		v.swept = now
	}
	if _, dup := v.seen[nonce]; dup {
		return false
	}
	v.seen[nonce] = now
	return true
}
