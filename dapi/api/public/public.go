package public

import (
	"ams_api/dapi/api/public/org"
	"ams_api/dapi/api/public/address"
	"ams_api/dapi/api/public/addresskey"
	//"ams_api/dapi/api/public/transaction"
	"ams_api/dapi/config"
	"http/web"
	"net/http"
)

type PublicServer struct {
	web.JsonServer
	*http.ServeMux
}

func NewPublicServer(pc *config.ProjectConfig) *PublicServer {
	var s = &PublicServer{
		ServeMux: http.NewServeMux(),
	}

	s.Handle("/org/", http.StripPrefix("/org", org.NewOrgServer()))
	s.Handle("/address/", http.StripPrefix("/address", address.NewAddressServer()))
	// s.Handle("/transaction/", http.StripPrefix("/transaction", transaction.NewTransactionServer()))
	s.Handle("/addresskey/", http.StripPrefix("/addresskey", addresskey.NewAddressKeyServer()))
	return s
}
