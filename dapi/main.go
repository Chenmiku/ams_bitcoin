package main

import (
	"context"
	"ams_api/dapi/config"
	"ams_api/dapi/initialize"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	initialize.Start(ctx, config.ReadConfig())
	initialize.Wait()
}
