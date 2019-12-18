package config

import (
	"flag"
	"fmt"

	"os"

	"github.com/BurntSushi/toml"
)

var defaultConfigFile = "dapi.toml"

func ReadConfig() *ProjectConfig {
	var configFile string
	flag.StringVar(&configFile, "conf", defaultConfigFile, "Config File")
	ver := flag.Bool("version", false, "Current version")
	flag.Parse()

	if *ver {
		fmt.Print(CurrentVersion)
		os.Exit(0)
	}

	var projectConfig = &ProjectConfig{}
	if _, err := toml.DecodeFile(configFile, projectConfig); err != nil {
		logger.Fatalf("Read config %v", err)
	}
	projectConfig.Check()
	logger.Infof(0, "Config %s", projectConfig)
	return projectConfig
}
