package station

import (
	"fmt"
	"net/url"
)

const (
	syncModeMaster     = "master"
	syncModeSlave      = "slave"
	syncModeStandalone = "standalone"
)

type SyncConfig struct {
	Mode   string
	Master string
	Token  string

	master *url.URL
}

func (q SyncConfig) String() string {
	return fmt.Sprintf("sync:master=%v;token=%v", q.Master, q.Token)
}

func (s *SyncConfig) Check() {
	if s.IsSlave() {
		if len(s.Master) < 1 {
			logger.Fatalf("Running in slave mode without master [%s}", s.Master)
		}
		var err error
		s.master, err = url.Parse(s.Master)
		if err != nil {
			logger.Fatalf("Parse master url %s failed %s", s.Master, err)
		}
		logger.Infof(0, "Running as a slave to %s", s.Master)
	} else if s.IsMaster() {
		logger.Infof(0, "Running as a master")
	} else {
		logger.Infof(0, "Running as a standalone station")
	}
}

func (s *SyncConfig) IsMaster() bool {
	return s.Mode != syncModeSlave
}

func (s *SyncConfig) IsSlave() bool {
	return s.Mode == syncModeSlave
}

func (s *SyncConfig) GetMaster() *url.URL {
	var v = *s.master
	return &v
}
