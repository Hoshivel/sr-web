package admin

import (
	"testing"
	"time"
)

func TestHashAndVerify(t *testing.T) {
	creds, err := hashPassword("root", "s3cret-pass")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if !creds.Configured() || creds.Algo != pbkdf2Algo {
		t.Fatalf("creds not well-formed: %+v", creds)
	}
	if !verifyPassword(creds, "root", "s3cret-pass") {
		t.Errorf("correct password should verify")
	}
	if verifyPassword(creds, "root", "wrong") {
		t.Errorf("wrong password must not verify")
	}
	if verifyPassword(creds, "attacker", "s3cret-pass") {
		t.Errorf("wrong username must not verify")
	}
}

func TestHashSaltIsRandom(t *testing.T) {
	a, _ := hashPassword("u", "password1")
	b, _ := hashPassword("u", "password1")
	if a.Salt == b.Salt || a.PasswordHash == b.PasswordHash {
		t.Errorf("each hash must use a fresh random salt")
	}
}

func TestSessionsLifecycle(t *testing.T) {
	s := newSessions(time.Hour)
	tok := s.create()
	if tok == "" {
		t.Fatal("empty token")
	}
	if !s.valid(tok) {
		t.Errorf("fresh token should be valid")
	}
	if s.valid("bogus") {
		t.Errorf("bogus token should be invalid")
	}
	s.destroy(tok)
	if s.valid(tok) {
		t.Errorf("destroyed token should be invalid")
	}
}

func TestSessionsExpiry(t *testing.T) {
	now := time.Unix(1000, 0)
	s := newSessions(time.Minute)
	s.now = func() time.Time { return now }
	tok := s.create()
	now = now.Add(2 * time.Minute) // 過期
	if s.valid(tok) {
		t.Errorf("expired token should be invalid")
	}
}

func TestConstEq(t *testing.T) {
	if !constEq("abc", "abc") {
		t.Errorf("equal strings")
	}
	if constEq("abc", "abd") || constEq("abc", "ab") {
		t.Errorf("unequal strings")
	}
}
