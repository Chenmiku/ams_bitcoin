package user

import (
	"errors"
	"math/rand"
	"ams_system/dapi/o/model"
	"time"
)

var TableUser = model.NewTable("users")

func (b *User) Create() error {
	if err := b.validate(); err != nil {
		return errors.New("validate_user_failed")
	}
	if err := b.ensureUniqueEmail(); err != nil {
		return errors.New("email_already_exists")
	}

	//pass := randSeq(6)
	b.Password = "123456"

	var p = password(b.Password)
	// replace
	if err := p.HashTo(&b.Password); err != nil {
		return errors.New("hash_password_failed")
	}

	b.CTime = time.Now().Unix()

	return TableUser.Create(b)
}

func MarkDelete(id string) error {
	return TableUser.MarkDelete(id)
}

func (v *User) UpdateById(newvalue *User) error {
	newvalue.validate()
	if newvalue.Email != v.Email {
		if err := newvalue.ensureUniqueEmail(); err != nil {
			return errors.New("email_already_exists")
		}
	}

	return TableUser.UnsafeUpdateByID(v.ID, newvalue)
}

func (v *User) UpdatePass(newValue string) error {
	var update = map[string]interface{}{
		"password": newValue,
	}

	if len(newValue) > 0 {
		var p = password(newValue)
		if err := p.HashTo(&newValue); err != nil {
			return errors.New("generate_hash_password_failed")
		}
		update["password"] = newValue
	}
	return TableUser.UnsafeUpdateByID(v.ID, update)
}

var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

func randSeq(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
