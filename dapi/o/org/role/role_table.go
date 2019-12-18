package role

import (
	"ams_system/dapi/o/model"
)

//TableBranch : Table in DB
var RoleTable = model.NewTable("roles")

//Create :
func (b *Role) Create() error {
	return RoleTable.Create(b)
}

//MarkDelete :
func MarkDelete(id string) error {
	return RoleTable.MarkDelete(id)
}

//Update :
func (v *Role) Update(newValue *Role) error {
	return RoleTable.UpdateByID(v.ID, newValue)
}
