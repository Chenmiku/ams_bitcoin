package initialize

import (
	"context"
	"db/mgo"
	"ams_api/dapi/config"
	"ams_api/dapi/httpserver"
	"util/runtime"
)

func initialize(ctx context.Context) {
	mgo.Start(ctx)
}

func Start(ctx context.Context, p *config.ProjectConfig) {
	runtime.MaxProc()
	server = httpserver.NewProjectHttpServer(p)
	initialize(ctx)
}

func Wait() {
	defer beforeExit()
	server.Wait()
}
