package transaction_input

import ()

func GetByID(id string) (*TransactionInput, error) {
	var w TransactionInput
	return &w, TableTransactionInput.ReadByID(id, &w)
}

func GetAllByTransactionID(pageSize int, pageNumber int, sortBy string, sortOrder string, transactionid string, tranInput *[]TransactionInput) (int, error) {
	var where map[string]interface{}
	if transactionid == "" {
		where =  map[string]interface{}{
			"dtime": 0,
		}
	} else {
		where = map[string]interface{}{
			"dtime": 0,
			"transaction_id": transactionid,
		}
	}

	exclude := []string{}
	return TableTransactionInput.ReadPagingSortWithExclude(where, pageSize, pageNumber, sortBy, sortOrder, tranInput, exclude)
}
