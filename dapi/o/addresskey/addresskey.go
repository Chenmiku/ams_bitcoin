package addresskey

import (
	"ams_system/dapi/x/mlog"
	"db/mgo"
)

var objectAddressKeyLog = mlog.NewTagLog("object_addresskey")

//AddressKey
type AddressKey struct {
	mgo.BaseModel          `bson:",inline"`
	Addr                   string `bson:"addr,omitempty" json:"addr"`
	PublicKey              string `bson:"public_key,omitempty" json:"public_key"`
	PrivateKey             string `bson:"private_key,omitempty" json:"private_key"`
	Wif                    string `bson:"wif,omitempty" json:"wif"`
	CTime                  int64  `bson:"ctime,omitempty" json:"ctime"` // Create Time
}

func NewCleanAddressKey() interface{} {
	return &AddressKey{}
}
