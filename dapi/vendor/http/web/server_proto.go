package web

import (
	"encoding/json"
	"github.com/golang/glog"
	"net/http"
	"runtime/debug"
)

type JsonServer struct{}

func (s *JsonServer) MustMethodPost(r *http.Request) {
	if r.Method != http.MethodPost {
		panic(BadRequest("method_not_allowed"))
	}
}

func (s *JsonServer) SendError(w http.ResponseWriter, err error) {
	if err != nil {
		w.Header().Add("Content-Type", "application/json")
		if werr, ok := err.(IWebError); ok {
			w.WriteHeader(werr.StatusCode())
		} else {
			glog.Error(err, string(debug.Stack()))
			err = ErrServerError
			w.WriteHeader(http.StatusInternalServerError)
		}
		
		s.sendJson(w, map[string]interface{}{
			"success": false,
			"message": err.Error(),
		})
	}
}

func (s *JsonServer) ErrorMessage(w http.ResponseWriter, message string) {
	w.Header().Add("Content-Type", "application/json")
	s.sendJson(w, map[string]interface{}{
		"success": false,
		"message": message,
	})
}

func (s *JsonServer) SendCustomError(w http.ResponseWriter, err error) {
	if err != nil {
		w.Header().Add("Content-Type", "application/json")
		s.sendJson(w, map[string]interface{}{
			"success": true,
			"error":  err.Error(),
		})
	}
}

func (s *JsonServer) SendErrorData(w http.ResponseWriter, data interface{}) {
	w.Header().Add("Content-Type", "application/json")
	s.sendJson(w, map[string]interface{}{
		"success": true,
		"data":   data,
	})

}

func (s *JsonServer) sendJson(w http.ResponseWriter, v interface{}) {
	json.NewEncoder(w).Encode(v)
}

func (s *JsonServer) SendJson(w http.ResponseWriter, v interface{}) {
	w.Header().Add("Content-Type", "application/json")
	s.sendJson(w, v)
}

func (s *JsonServer) SendDataSuccess(w http.ResponseWriter, v interface{}) {
	w.Header().Add("Content-Type", "application/json")
	s.sendJson(w, map[string]interface{}{
		"success": true,
		"data":    v,
	})
}

func (s *JsonServer) SendCreateSuccess(w http.ResponseWriter, v interface{}) {
	w.WriteHeader(http.StatusCreated)
	w.Header().Add("Content-Type", "application/json")
	s.sendJson(w, map[string]interface{}{
		"success": true,
		"data":    v,
	})
}

func (s *JsonServer) Success(w http.ResponseWriter) {
	s.SendDataSuccess(w, nil)
}

func (s *JsonServer) Send(w http.ResponseWriter, data interface{}, err ...error) {
	if err != nil && len(err) > 0 && err[0] != nil {
		s.SendError(w, err[0])
		return
	}
	s.SendDataSuccess(w, data)
}

func (s *JsonServer) DecodeBody(r *http.Request, v interface{}) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return BadRequest(err.Error())
	}
	return nil
}

func (s *JsonServer) MustDecodeBody(r *http.Request, v interface{}) {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		panic(BadRequest(err.Error()))
	}
}

func (s *JsonServer) Recover(w http.ResponseWriter) {
	if r := recover(); r != nil {
		if err, ok := r.(error); ok {
			s.SendError(w, err)
		} else {
			s.SendError(w, ErrServerError)
			glog.Error(r, string(debug.Stack()))
		}
	}
}

