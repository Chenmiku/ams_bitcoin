package private

import (
	"ams_system/dapi/api/auth/session"
	"http/web"
	"net/http"
)

type PrivateServer struct {
	web.JsonServer
	*http.ServeMux
}

func NewPrivateServer() *PrivateServer {
	var s = &PrivateServer{
		ServeMux: http.NewServeMux(),
	}

	s.Handle("/org/", http.StripPrefix("/org", newOrgServer()))
	return s
}

func (s *PrivateServer) mustBeAdmin(r *http.Request) {
	var u = session.MustGet(r)
	if !u.Role.IsAdmin() {
		panic(web.Unauthorized("unauthorize_access_to_admin"))
	}
}

func (s *PrivateServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer s.Recover(w)
	//header := w.Header()
	// header.Add("Access-Control-Allow-Origin", "*")
	// header.Add(
	// 	"Access-Control-Allow-Methods",
	// 	"OPTIONS, HEAD, GET, POST, PUT, DELETE",
	// )
	// header.Add(
	// 	"Access-Control-Allow-Headers",
	// 	"Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization",
	// )
	// header.Add(
	// 	"Access-Control-Allow-Credentials",
	// 	"true",
	// )
	// header.Add(
	// 	"Access-Control-Max-Age",
	// 	"2520000", // 30 days
	// )
	// if r.Method == "OPTIONS" {
	// 	w.WriteHeader(http.StatusOK)
	// 	return
	// }

	newContext, err := session.NewContext(r.Context(), session.MustGet(r))

	if err != nil {
		panic(web.InternalServerError("session_context_error"))
	}

	newRequest := r.WithContext(newContext)

	s.ServeMux.ServeHTTP(w, newRequest)
}
