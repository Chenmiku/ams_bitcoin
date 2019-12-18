package session

import (
	"ams_system/dapi/o/auth/session"
	"ams_system/dapi/x/mlog"
	"net/http"

	"github.com/mitchellh/mapstructure"
	"golang.org/x/net/context"
	"strings"
)

var tokenHeader = "Authorization"
var bearerHeader = "Bearer"
var accessToken = "token"
var sessionLog = mlog.NewTagLog("session_log")

// Get token from Authorization of header
func MustGet(r *http.Request) *session.Session {
	var sessionID = r.Header.Get(tokenHeader)
	if strings.HasPrefix(sessionID, bearerHeader) {
		sessionID = strings.TrimPrefix(sessionID, bearerHeader)
	}
	var s, e = Get(sessionID)
	if e != nil {
		panic(e)
	}
	return s
}

// Check scope
func MustAuthScope(r *http.Request) *session.Session {
	var query = r.URL.Query()
	var sessionID = r.Header.Get(tokenHeader)
	if strings.HasPrefix(sessionID, bearerHeader) {
		sessionID = strings.TrimPrefix(sessionID, bearerHeader)
	}
	var scope = query.Get("scope")
	var s, e = Get(sessionID)
	if e != nil {
		panic(e)
	}
	if !s.Role.CanAccess(scope) {
		panic(errUnauthorizedAccess)
	}
	return s
}

// Clear token when logout
func MustClear(r *http.Request) {
	var sessionID = r.Header.Get(tokenHeader)
	if strings.HasPrefix(sessionID, bearerHeader) {
		sessionID = strings.TrimPrefix(sessionID, bearerHeader)
	}
	var e = session.MarkDelete(sessionID)
	if e != nil {
		sessionLog.Error(e, "remove_session")
	}
}

// create new context
func NewContext(c context.Context, s *session.Session) (context.Context, error) {
	return context.WithValue(c, "session", s), nil

}

// map session object
func FromContext(c context.Context) (*Session, error) {

	var contextSession = c.Value("session")
	var newSession = &session.Session{}

	err := mapstructure.Decode(contextSession, &newSession)

	if err != nil {
		panic(err)
	}

	return &Session{
		UserID:    newSession.UserID,
		Email:     newSession.Email,
		SessionID: newSession.ID,
		Role:      newSession.Role,
	}, nil
}
