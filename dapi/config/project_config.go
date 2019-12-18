package config

import (
	"fmt"
	"ams_system/dapi/config/database"
	"ams_system/dapi/config/shared"
	"ams_system/dapi/config/station"
	"ams_system/dapi/o/system/business"
)

var logger = shared.ConfigLog

type ProjectConfig struct {
	Business business.BusinessConfig `json:"business"`
	Database database.DatabaseConfig `json:"database"`
	Station  station.StationConfig   `json:"station"`
	Dev      DevConfig               `json:"dev"`
}

func (p ProjectConfig) String() string {
	return fmt.Sprintf("config:[%s][%s][%s]", p.Database, p.Station, p.Business)
}

func (p *ProjectConfig) Check() {
	p.Station.Check()
	p.Database.Check()
	p.Business.Check()
}
