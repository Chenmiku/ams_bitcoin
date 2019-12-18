package user

import ()

func getUser(where map[string]interface{}) (*User, error) {
	var u User
	return &u, TableUser.ReadOne(where, &u)
}

func GetByID(id string) (*User, error) {
	var u User
	return &u, TableUser.ReadByID(id, &u)
}

func GetByEmail(email string) (*User, error) {
	var u User
	return &u, TableUser.ReadOne(map[string]interface{}{
		"email": email,
		"dtime": 0,
	}, &u)
}

func GetAll(pageSize int, pageNumber int, sortBy string, sortOrder string, user *[]User) (int, error) {
	var where = map[string]interface{}{
		"dtime": 0,
	}
	exclude := []string{"password"}
	return TableUser.ReadPagingSortWithExclude(where, pageSize, pageNumber, sortBy, sortOrder, user, exclude)
}
