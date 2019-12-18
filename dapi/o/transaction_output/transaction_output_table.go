package transaction_output

import (
	"ams_system/dapi/o/model"
	"time"
)

var TableTransactionOutput = model.NewTable("transaction_outputs")

func (w *TransactionOutput) Create() error {
	w.CTime = time.Now().Unix()

	return TableTransactionOutput.Create(w)
}

func MarkDelete(id string) error {
	return TableTransactionOutput.MarkDelete(id)
}

func (w *TransactionOutput) UpdateById(newvalue *TransactionOutput) error {
	return TableTransactionOutput.UpdateByID(w.ID, newvalue)
}
