package mlog

import (
	"github.com/golang/glog"
)

func Flush() {
	glog.Flush()
}
