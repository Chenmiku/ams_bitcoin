package httpserver

import (
	"os"
	"os/signal"
	"syscall"
)

func (p *ProjectHttpServer) Wait() {
	<-p.ready
	p.run()
}

func (p *ProjectHttpServer) run() {
	go p.listen()
	if p.pc.Station.Server.HasHttps() {
		go p.listenTLS()
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGQUIT, syscall.SIGTERM, syscall.SIGINT)
	<-stop
	p.shutdown()

}
