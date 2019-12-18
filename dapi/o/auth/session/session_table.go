package session

import (
	"ams_system/dapi/o/model"
)

var TableSession = model.NewTable("session")

func (b *Session) Create() error {
	return TableSession.Create(b)
}

func MarkDelete(id string) error {
	return TableSession.MarkDelete(id)
}

func (v *Session) Update(newValue *Session) error {
	return TableSession.UnsafeUpdateByID(v.ID, newValue)
}
