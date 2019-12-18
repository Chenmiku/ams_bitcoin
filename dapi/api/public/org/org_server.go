package org

import (
	"http/web"
	"net/http"
)

type OrgServer struct {
	web.JsonServer
	*http.ServeMux
}

func NewOrgServer() *OrgServer {
	var s = &OrgServer{
		ServeMux: http.NewServeMux(),
	}
	s.Handle("/user/", http.StripPrefix("/user", newPublicUserAPI()))

	return s
}
