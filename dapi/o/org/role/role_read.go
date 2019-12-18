package role

func GetByID(id string) (*Role, error) {
	var b Role
	return &b, RoleTable.ReadByID(id, &b)
}

func ReadAll() ([]*Role, error) {
	var branch = []*Role{}
	var err = RoleTable.UnsafeReadMany(map[string]interface{}{
		"dtime": 0,
	}, &branch)
	return branch, err
}
