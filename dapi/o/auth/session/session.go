package session

import (
	"db/mgo"
	"encoding/json"
	"ams_system/dapi/o/org/user"
)

// Session
type Session struct {
	mgo.BaseModel `bson:",inline"`
	Email         string    `json:"email"`
	UserID        string    `json:"userid"`
	BranchID      string    `json:"branch_id"`
	Role          user.Role `json:"role"`
	CTime         int64     `json:"ctime"`
}

func (a *Session) MarshalBinary() ([]byte, error) {
	return json.Marshal(a)
}

func (a *Session) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, a)
}
