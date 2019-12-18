package user

import (
	"http/web"
)

const errMissingBranchID = web.BadRequest("missing branch_id")

// validate user
func (u *User) validate() error {
	// u.Username = strings.ToLower(strings.TrimSpace(u.Username))
	// if len(u.BranchID) < 1 {
	// 	return errMissingBranchID
	// }
	return nil
}
