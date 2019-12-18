package addresskey

import (
	"ams_system/dapi/o/addresskey"
	"http/web"
	"net/http"
	"strconv"
)

type AddressKeyServer struct {
	web.JsonServer
	*http.ServeMux
}

// create server mux to handle public address api
func NewAddressKeyServer() *AddressKeyServer {
	var s = &AddressKeyServer{
		ServeMux: http.NewServeMux(),
	}

	s.HandleFunc("/get_all", s.HandleGetAll) 
	return s
}

func StrToInt(s string) int {
	i, _ := strconv.ParseInt(s, 10, 64)
	return int(i)
} 

//get all address api
func (s *AddressKeyServer) HandleGetAll(w http.ResponseWriter, r *http.Request) {
	sortBy := r.URL.Query().Get("sort_by")
	sortOrder := r.URL.Query().Get("sort_order")

	pageSize := StrToInt(r.URL.Query().Get("page_size"))
	pageNumber := StrToInt(r.URL.Query().Get("page_number"))

	var res = []addresskey.AddressKey{}
	count, err := addresskey.GetAll(pageSize, pageNumber, sortBy, sortOrder, &res)

	if err != nil {
		s.SendError(w, err)
	} else {
		s.SendDataSuccess(w, map[string]interface{}{
			"addresskeys": res,
			"count":   count,
		})
	}
}
