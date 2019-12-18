package address

import (
	"ams_system/dapi/o/model"
	"time"
)

var TableAddress = model.NewTable("addresses")

func (w *Address) Create() error {
	w.CTime = time.Now().Unix()

	return TableAddress.Create(w)
}

func MarkDelete(id string) error {
	return TableAddress.MarkDelete(id)
}

func (w *Address) UpdateById(newvalue *Address) error {
	return TableAddress.UpdateByID(w.ID, newvalue)
}
