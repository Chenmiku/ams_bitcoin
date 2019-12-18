package user

import (
	"ams_system/dapi/x/mlog"
	"db/mgo"
)

var objectUserLog = mlog.NewTagLog("object_user")

//User
type User struct {
	mgo.BaseModel `bson:",inline"`
	FirstName     string `bson:"first_name,omitempty" json:"first_name"`
	LastName      string `bson:"last_name,omitempty" json:"last_name"`
	Password      string `bson:"password,omitempty" json:"password,omitempty"`
	Email         string `bson:"email,omitempty" json:"email,omitempty"`
	Address       string `bson:"address,omitempty" json:"address,omitempty"`
	PublicAvatar  string `bson:"public_avatar,omitempty" json:"public_avatar,omitempty"`
	RoleID        string `bson:"role_id,omitempty" json:"role_id"`
	Phone         string `bson:"phone,omitempty" json:"phone"`
	DOB           int64  `bson:"dob,omitempty" json:"dob"`
	Active        bool   `bson:"active,omitempty" json:"active"`
	Gender        string `bson:"gender,omitempty" json:"gender"`
	Description   string `bson:"description,omitempty" json:"description"`
	AcceptPrivacy bool   `bson:"accept_privacy,omitempty" json:"accept_privacy"`
	AcceptTerms   bool   `bson:"accept_terms,omitempty" json:"accept_terms"`
	EmailConfirm  bool   `bson:"email_confirm,omitempty" json:"email_confirm"`
	CTime         int64  `bson:"ctime,omitempty" json:"ctime"` // Create Time
}

type ChangePassword struct {
	OldPassword string `bson:"old_password" json:"old_password"`
	NewPassword string `bson:"new_password" json:"new_password"`
}

func NewCleanUser() interface{} {
	return &User{}
}

// check unique email
func (v *User) ensureUniqueEmail() error {
	if err := TableUser.NotExist(map[string]interface{}{
		"email": v.Email,
	}); err != nil {
		return err
	}
	return nil
}
