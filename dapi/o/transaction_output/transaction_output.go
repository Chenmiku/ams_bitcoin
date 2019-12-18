package transaction_output

import (
	"ams_system/dapi/x/mlog"
	"db/mgo"
)

var objectTransactionLog = mlog.NewTagLog("object_transaction_output")

//TransactionOutput
type TransactionOutput struct {
	mgo.BaseModel `bson:",inline"`
	TransactionID string   `bson:"transaction_id,omitempty" json:"transaction_id"`
	Value         int      `bson:"value,omitempty" json:"value"`
	ScriptType    string   `bson:"script_type,omitempty" json:"script_type"`
	Script        string   `bson:"script,omitempty" json:"script"`
	Addresses     []string `bson:"addresses,omitempty" json:"addresses"`
	CTime         int64    `bson:"ctime,omitempty" json:"ctime"` // Create Time
}

func NewCleanTransactionOutput() interface{} {
	return &TransactionOutput{}
}
