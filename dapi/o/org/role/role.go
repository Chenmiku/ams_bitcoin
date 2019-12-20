package role

import (
	"ams_api/dapi/o/model"
)

// Role
type Role struct {
	model.BaseModel `bson:",inline"`
	Name            string   `bson:"name" json:"name"` //
	Permission      []string `bson:"permission" json:"permission"`
}
