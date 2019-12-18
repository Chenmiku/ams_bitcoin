package address

import (
	"ams_system/dapi/x/mlog"
	"db/mgo"
)

var objectAddressLog = mlog.NewTagLog("object_address")

//Address
type Address struct {
	mgo.BaseModel          `bson:",inline"`
	Addr                   string `bson:"addr,omitempty" json:"addr"`
	TotalRevceived         int    `bson:"total_revceived,omitempty" json:"total_revceived"`
	TotalSent              int    `bson:"total_sent,omitempty" json:"total_sent"`
	Balance                int    `bson:"balance,omitempty" json:"balance"`
	UnconfirmedBalance     *int    `bson:"unconfirmed_balance,omitempty" json:"unconfirmed_balance"`
	FinalBalance           int    `bson:"final_balance,omitempty" json:"final_balance"`
	CoinType               string `bson:"coin_type,omitempty" json:"coin_type"`
	ConfirmedTransaction   int    `bson:"confirmed_transaction,omitempty" json:"confirmed_transaction"`
	UnconfirmedTransaction *int    `bson:"unconfirmed_transaction,omitempty" json:"unconfirmed_transaction"`
	FinalTransaction       int    `bson:"final_transaction,omitempty" json:"final_transaction"`
	UserID                 int    `bson:"user_id,omitempty" json:"user_id"`
	CTime                  int64  `bson:"ctime,omitempty" json:"ctime"` // Create Time
}

func NewCleanAddress() interface{} {
	return &Address{}
}
