package model

import (
	"db/mgo"
	"ams_system/dapi/config/cons"
)

func NewTable(name string) *mgo.Table {
	var db = GetDB()
	return mgo.NewTable(db, name)
}

func GetDB() *mgo.Database {
	return mgo.GetDB(cons.DB_ID)
}
