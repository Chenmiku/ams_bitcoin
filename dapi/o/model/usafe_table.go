package model

import (
	"db/mgo"
)

type UnsafeTable struct {
	*mgo.UnsafeTable
}

func NewUnsafeTable(name string) *mgo.UnsafeTable {
	var db = GetDB()
	return mgo.NewUnsafeTable(db, name)
}
