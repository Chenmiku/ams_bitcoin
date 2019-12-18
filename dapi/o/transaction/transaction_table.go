package transaction

import (
	"ams_system/dapi/o/model"
	"time"
)

var TableTransaction = model.NewTable("transactions")

func (w *Transaction) Create() error {
	w.CTime = time.Now().Unix()

	return TableTransaction.Create(w)
}

func MarkDelete(id string) error {
	return TableTransaction.MarkDelete(id)
}

func (w *Transaction) UpdateById(newvalue *Transaction) error {
	return TableTransaction.UpdateByID(w.ID, newvalue)
}
