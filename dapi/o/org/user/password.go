package user

import (
	"http/web"
	"os"

	"golang.org/x/crypto/bcrypt"
)

type password string

// check valid password
func (p password) isValid() error {
	if len(p) < 6 {
		return web.BadRequest("password_must_be_at_least_6_character")
	}
	return nil
}

// hash password
func (p password) Hash() (string, error) {
	if len(os.Getenv("nohash")) > 0 {
		return string(p), nil
	}
	var s, err = bcrypt.GenerateFromPassword([]byte(p), 10)
	if err != nil {
		objectUserLog.Error(err)
		return "", web.InternalServerError("generate_hash_password_failed")
	}
	return string(s), nil
}

// compare password
func (p password) Compare(hash string) error {
	var err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(p))
	if err != nil {
		if err == bcrypt.ErrMismatchedHashAndPassword {
			return web.InternalServerError("do_not_match_password")
		}
		objectUserLog.Error(err)
		return web.InternalServerError("compare_hash_password_failed")
	}
	return nil
}

// HashTo check and hash the password
func (p password) HashTo(s *string) error {
	if err := p.isValid(); err != nil {
		return err
	}
	if hash, err := p.Hash(); err != nil {
		return err
	} else {
		*s = hash
		return nil
	}
}

// compare
func (u *User) ComparePassword(p string) error {
	return password(p).Compare(u.Password)
}
