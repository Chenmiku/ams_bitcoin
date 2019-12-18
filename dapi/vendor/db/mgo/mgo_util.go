package mgo

import (
	"ams_system/dapi/x/mlog"
)

var mongoDBLog = mlog.NewTagLog("MongoDB")

type M map[string]interface{}
