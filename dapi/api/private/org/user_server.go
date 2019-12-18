package org

import (
	"ams_system/dapi/api/auth/session"
	"ams_system/dapi/o/org/user"
	"http/web"
	"net/http"
	"strconv"
	"strings"
)

type UserServer struct {
	web.JsonServer
	*http.ServeMux
}

// create server mux to handle user api
func NewUserServer() *UserServer {
	var s = &UserServer{
		ServeMux: http.NewServeMux(),
	}

	s.HandleFunc("/get_all", s.HandleAllUser)
	s.HandleFunc("/create", s.HandleCreate)
	s.HandleFunc("/get", s.HandleGetByID)
	s.HandleFunc("/update", s.HandleUpdateByID)
	s.HandleFunc("/mark_delete", s.HandleMarkDelete)
	s.HandleFunc("/change_password", s.ChangePassword)
	return s
}

func StrToInt(s string) int {
	i, _ := strconv.ParseInt(s, 10, 64)
	return int(i)
}

func (s *UserServer) Session(w http.ResponseWriter, r *http.Request) *session.Session {

	ses, err := session.FromContext(r.Context())

	if err != nil {
		s.SendError(w, err)
	}

	return ses
}

// get all user api 
func (s *UserServer) HandleAllUser(w http.ResponseWriter, r *http.Request) {
	sortBy := r.URL.Query().Get("sort_by")
	sortOrder := r.URL.Query().Get("sort_order")

	pageSize := StrToInt(r.URL.Query().Get("page_size"))
	pageNumber := StrToInt(r.URL.Query().Get("page_number"))

	var res = []user.User{}
	count, err := user.GetAll(pageSize, pageNumber, sortBy, sortOrder, &res)

	if err != nil {
		s.SendError(w, err)
	} else {
		s.SendDataSuccess(w, map[string]interface{}{
			"users": res,
			"count": count,
		})
	}
}

// create user api 
func (s *UserServer) HandleCreate(w http.ResponseWriter, r *http.Request) {
	var u = &user.User{}
	s.MustDecodeBody(r, u)
	u.Email = strings.ToLower(u.Email)
	err := u.Create()
	if err != nil {
		s.ErrorMessage(w, err.Error())
	} else {
		s.SendDataSuccess(w, u)
	}
}

func (s *UserServer) mustGetUser(r *http.Request) (*user.User, error) {
	var id = r.URL.Query().Get("id")
	var u, err = user.GetByID(id)
	if err != nil {
		return u, err
	} else {
		return u, nil
	}
}

// update user api 
func (s *UserServer) HandleUpdateByID(w http.ResponseWriter, r *http.Request) {
	var newUser = &user.User{}
	s.MustDecodeBody(r, newUser)
	newUser.Email = strings.ToLower(newUser.Email)
	u, err := s.mustGetUser(r)
	if err != nil {
		s.ErrorMessage(w, "user_not_found")
		return
	}
	err = u.UpdateById(newUser)
	if err != nil {
		s.ErrorMessage(w, err.Error())
	} else {
		result, err := user.GetByID(u.ID)
		if err != nil {
			s.ErrorMessage(w, "user_not_found")
			return
		}
		s.SendDataSuccess(w, result)
	}
}

// Get user by id api 
func (s *UserServer) HandleGetByID(w http.ResponseWriter, r *http.Request) {
	u, err := s.mustGetUser(r)
	if err != nil {
		s.ErrorMessage(w, "user_not_found")
		return
	}
	s.SendDataSuccess(w, u)
}

// delete user api 
func (s *UserServer) HandleMarkDelete(w http.ResponseWriter, r *http.Request) {
	u, err := s.mustGetUser(r)
	if err != nil {
		s.ErrorMessage(w, "user_not_found")
		return
	}
	err = user.MarkDelete(u.ID)
	if err != nil {
		s.ErrorMessage(w, err.Error())
	} else {
		s.Success(w)
	}
}

// Change pass api 
func (s *UserServer) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var change = &user.ChangePassword{}

	s.MustDecodeBody(r, change)

	u, err := user.GetByID(s.Session(w, r).UserID)
	if err != nil {
		s.ErrorMessage(w, "user_not_found")
		return
	}

	if err = u.ComparePassword(change.OldPassword); err != nil {
		s.ErrorMessage(w, "password_not_campare")
		return
	}

	err = u.UpdatePass(change.NewPassword)
	if err != nil {
		s.ErrorMessage(w, err.Error())
	} else {
		s.Success(w)
	}
}
