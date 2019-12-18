package transaction_input

import (
	"ams_system/dapi/x/mlog"
	"db/mgo"
)

var objectTransactionInputLog = mlog.NewTagLog("object_transaction_input")

//TransactionInput
type TransactionInput struct {
	mgo.BaseModel `bson:",inline"`
	PreviousHash  string   `bson:"previous_hash,omitempty" json:"previous_hash"`
	TransactionID string   `bson:"transaction_id,omitempty" json:"transaction_id"`
	OutputIndex   int      `bson:"output_index,omitempty" json:"output_index"`
	OutputValue   int      `bson:"output_value,omitempty" json:"output_value"`
	ScriptType    string   `bson:"script_type,omitempty" json:"script_type"`
	Script        string   `bson:"script,omitempty" json:"script"`
	Addresses     []string `bson:"addresses,omitempty" json:"addresses"`
	CTime         int64    `bson:"ctime,omitempty" json:"ctime"` // Create Time
}

func NewCleanTransactionInput() interface{} {
	return &TransactionInput{}
}
