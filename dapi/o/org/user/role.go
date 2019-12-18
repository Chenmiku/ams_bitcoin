package user

import (
	"http/web"
)

type Role string

const (
	RoleAdminRoot    = Role("admin_root")
	RoleAdmin        = Role("admin")
	RoleUserStandard = Role("user_standard")
)

const errUnknownRole = web.BadRequest("role_is_unknown")

func (r Role) IsValid() bool {
	return r.isValid() == nil
}

func (r Role) isValid() error {
	switch r {
	case RoleAdminRoot:
	case RoleAdmin:
	default:
		return errUnknownRole
	}
	return nil
}

func (r Role) IsAdminRoot() bool {
	return r == RoleAdminRoot
}

func (r Role) IsAdmin() bool {
	return r == RoleAdminRoot || r == RoleAdmin
}

func (r Role) IsUserStandard() bool {
	return r == RoleUserStandard
}

func (r Role) CanAccess(scope string) bool {
	switch scope {
	case "admin_root":
		return r.IsAdmin()
	case "admin":
		return r.IsAdmin()
	case "user_standard":
		return r.IsUserStandard()
	default:
		return false
	}
}
