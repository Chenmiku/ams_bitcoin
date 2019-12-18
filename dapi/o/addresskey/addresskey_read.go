package addresskey

import (
)

func GetByAddress(address string) (*AddressKey, error) {
	var w AddressKey
	return &w, TableAddressKey.ReadOne(map[string]interface{}{
		"addr": address,
		"dtime": 0,
	}, &w)
}

func GetAll(pageSize int, pageNumber int, sortBy string, sortOrder string, addressKey *[]AddressKey) (int, error) {
	var where map[string]interface{}

	exclude := []string{}
	return TableAddressKey.ReadPagingSortWithExclude(where, pageSize, pageNumber, sortBy, sortOrder, addressKey, exclude)
}