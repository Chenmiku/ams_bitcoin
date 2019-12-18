package auth

import (
	"http/web"
)

const (
	errUserNotFound         = web.Unauthorized("user_not_found")
	errAuthenticationFailed = web.Unauthorized("authentication_failed")
)
