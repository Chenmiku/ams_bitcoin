package initialize

import (
	"github.com/golang/glog"
	"util/runtime"
)

func beforeExit() {
	runtime.Recover()
	glog.Flush()
}
