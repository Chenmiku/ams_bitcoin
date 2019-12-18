package main

import (
	"context"
	"ams_system/dapi/config"
	"ams_system/dapi/initialize"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	initialize.Start(ctx, config.ReadConfig())
	initialize.Wait()
}
