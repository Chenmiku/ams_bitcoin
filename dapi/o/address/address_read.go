package address

import (
	"strconv"
)

func GetByID(id string) (*Address, error) {
	var w Address
	return &w, TableAddress.ReadByID(id, &w)
}

func GetByAddress(address string) (*Address, error) {
	var w Address
	return &w, TableAddress.ReadOne(map[string]interface{}{
		"addr": address,
		"dtime": 0,
	}, &w)
}

func GetAllByUser(pageSize int, pageNumber int, sortBy string, sortOrder string, userid int, address *[]Address) (int, error) {
	var where map[string]interface{}
	if strconv.Itoa(userid) == "0" {
		where =  map[string]interface{}{
			"dtime": 0,
		}
	} else {
		where = map[string]interface{}{
			"dtime": 0,
			"user_id": userid, 
		}
	}

	exclude := []string{}
	return TableAddress.ReadPagingSortWithExclude(where, pageSize, pageNumber, sortBy, sortOrder, address, exclude)
}
