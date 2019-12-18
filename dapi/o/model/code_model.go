package model

import (
	"db/mgo"
)

type BaseModel struct {
	mgo.BaseModel `bson:",inline"`
	UserID        string `bson:"user_id" json:"user_id"`
}
