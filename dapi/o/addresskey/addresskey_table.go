package addresskey

import (
	"ams_system/dapi/o/model"
	"time"
)

var TableAddressKey = model.NewTable("addresskeys")

func (w *AddressKey) Create() error {
	w.CTime = time.Now().Unix()

	return TableAddressKey.Create(w)
}

func MarkDelete(id string) error {
	return TableAddressKey.MarkDelete(id)
}

func (w *AddressKey) UpdateById(newvalue *AddressKey) error {
	return TableAddressKey.UpdateByID(w.ID, newvalue)
}
