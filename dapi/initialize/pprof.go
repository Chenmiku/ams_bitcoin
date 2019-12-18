package initialize

import (
	"ams_system/dapi/config"
	"os"
	"runtime/pprof"
)

func pprofOn(c config.DevConfig) {
	if c.CPUProfile != "" {
		profile := c.CPUProfile
		f, err := os.Create(profile)
		if err != nil {
			logger.Errorf("open cpu profile %s failed %s", profile, err.Error())
		} else {
			logger.Infof(0, "write cpu profile to %s", profile)
		}
		pprof.StartCPUProfile(f)
	}
}

func pprofOff() {
	pprof.StopCPUProfile()
}
