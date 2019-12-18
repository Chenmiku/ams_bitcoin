package transaction

import ()

func GetByID(id string) (*Transaction, error) {
	var w Transaction
	return &w, TableTransaction.ReadByID(id, &w)
}

func GetByHash(hash string) (*Transaction, error) {
	var w Transaction
	return &w, TableTransaction.ReadOne(map[string]interface{}{
		"hash": hash,
		"dtime": 0,
	}, &w)
}

func GetAllTransaction(pageSize int, pageNumber int, sortBy string, sortOrder string, trans *[]Transaction) (int, error) {
	where :=  map[string]interface{}{
		"dtime": 0,
	}
	exclude := []string{}
	return TableTransaction.ReadPagingSortWithExclude(where, pageSize, pageNumber, sortBy, sortOrder, trans, exclude)
}
