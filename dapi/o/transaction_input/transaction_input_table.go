package transaction_input

import (
	"ams_system/dapi/o/model"
	"time"
)

var TableTransactionInput = model.NewTable("transaction_inputs")

func (w *TransactionInput) Create() error {
	w.CTime = time.Now().Unix()

	return TableTransactionInput.Create(w)
}

func MarkDelete(id string) error {
	return TableTransactionInput.MarkDelete(id)
}

func (w *TransactionInput) UpdateById(newvalue *TransactionInput) error {
	return TableTransactionInput.UpdateByID(w.ID, newvalue)
}
