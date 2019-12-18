package api

import (
	"encoding/json"
	"http/web"
	"ams_system/dapi/api/auth"
	"ams_system/dapi/api/private"
	"ams_system/dapi/api/public"
	"ams_system/dapi/config"

	"net/http"
)

type ApiServer struct {
	*http.ServeMux
	web.JsonServer
}

func NewApiServer(p *config.ProjectConfig) *ApiServer {

	var s = &ApiServer{
		ServeMux: http.NewServeMux(),
	}

	s.Handle("/auth/", http.StripPrefix("/auth", auth.NewAuthServer()))
	s.Handle("/private/", http.StripPrefix("/private", private.NewPrivateServer()))
	s.Handle("/public/", http.StripPrefix("/public", public.NewPublicServer(p)))
	s.HandleFunc("/config", func(w http.ResponseWriter, r *http.Request) {
		businessConfig, _ := json.Marshal(p.Business)
		w.Write(businessConfig)
	})
	return s
}

func (s *ApiServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer s.Recover(w)
	header := w.Header()
	header.Add("Access-Control-Allow-Origin", "*")
	header.Add(
		"Access-Control-Allow-Methods",
		"OPTIONS, HEAD, GET, POST, PUT, DELETE",
	)
	header.Add(
		"Access-Control-Allow-Headers",
		"Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization",
	)
	header.Add(
		"Access-Control-Allow-Credentials",
		"true",
	)
	header.Add(
		"Access-Control-Max-Age",
		"2520000", // 30 days
	)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	s.ServeMux.ServeHTTP(w, r)
}
