package org

import (
	"ams_system/dapi/o/org/user"
	"http/web"
	"net/http"
	"strconv"
	"strings"
)

type userAPI struct {
	web.JsonServer
	*http.ServeMux
}

// create new server mux to handle api
func newPublicUserAPI() *userAPI {
	u := new(userAPI)
	u.ServeMux = http.NewServeMux()
	u.HandleFunc("/create", u.handleCreate)
	return u
}

// create user api without token
func (uapi *userAPI) handleCreate(w http.ResponseWriter, r *http.Request) {
	var u = &user.User{}
	uapi.MustDecodeBody(r, u)
	u.Email = strings.ToLower(u.Email)
	err := u.Create()
	if err != nil {
		uapi.ErrorMessage(w, err.Error())
	} else {
		uapi.SendDataSuccess(w, u)
	}
}

func StrToInt(s string) int {
	i, _ := strconv.ParseInt(s, 10, 64)
	return int(i)
}
