package address

import (
	"ams_system/dapi/o/address"
	"ams_system/dapi/o/addresskey"
	"http/web"
	"net/http"
	"strconv"
	"github.com/blockcypher/gobcy"
	"ams_system/dapi/config"
	"fmt"
	"time"
)

type AddressServer struct {
	web.JsonServer
	*http.ServeMux
}

type AddressResult struct {
	Id					   string `json:"id"`
	Addr                   string `json:"addr"`
	TotalRevceived         float64    `json:"total_revceived"`
	TotalSent              float64    `json:"total_sent"`
	Balance                float64    `json:"balance"`
	UnconfirmedBalance     float64   `json:"unconfirmed_balance"`
	FinalBalance           float64    `json:"final_balance"`
	CoinType               string `json:"coin_type"`
	ConfirmedTransaction   int    `json:"confirmed_transaction"`
	UnconfirmedTransaction int   `json:"unconfirmed_transaction"`
	FinalTransaction       int    `json:"final_transaction"`
	UserID                 int    `json:"user_id"`
	CTime                  string  `json:"ctime"` // Create Time
	MTime                  string  `json:"mtime"` // Update Time
}

// create server mux to handle public address api
func NewAddressServer() *AddressServer {
	var s = &AddressServer{
		ServeMux: http.NewServeMux(),
	}

	s.HandleFunc("/get_all", s.HandleGetAll) 
	s.HandleFunc("/generate", s.HandleCreate) 
	s.HandleFunc("/get_by_address", s.HandleGetByAddress) 
	s.HandleFunc("/update", s.HandleUpdateByID) 
	s.HandleFunc("/mark_delete", s.HandleMarkDelete)
	return s
}

//get all address api by user
func (s *AddressServer) HandleGetAll(w http.ResponseWriter, r *http.Request) {
	userid := StrToInt(r.URL.Query().Get("user_id"))
	sortBy := r.URL.Query().Get("sort_by")
	sortOrder := r.URL.Query().Get("sort_order")

	pageSize := StrToInt(r.URL.Query().Get("page_size"))
	pageNumber := StrToInt(r.URL.Query().Get("page_number"))

	var res = []address.Address{}
	count, err := address.GetAllByUser(pageSize, pageNumber, sortBy, sortOrder, userid, &res)

	if err != nil {
		s.SendError(w, err)
	} else {
		s.SendDataSuccess(w, map[string]interface{}{
			"addresses": res,
			"count":   count,
		})
	}
}

// generate address api
func(s *AddressServer) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userid := StrToInt(r.URL.Query().Get("user_id"))
	coinType := r.URL.Query().Get("coin_type")
	var err error

	var u = &address.Address{}
	var uKey = &addresskey.AddressKey{}

	switch coinType {
	case "btc":
		config.CoinType = "btc"
	case "eth":
		config.CoinType = "eth"
	case "":
		config.CoinType = "btc"
	}

	btc := gobcy.API{config.UserToken, config.CoinType, config.Chain}
	addrKeys, err := btc.GenAddrKeychain()
	if err != nil {
		s.ErrorMessage(w, err.Error())
		return
	}

	uKey.Addr = addrKeys.Address
	uKey.PublicKey = addrKeys.Public
	uKey.PrivateKey = addrKeys.Private
	uKey.Wif = addrKeys.Wif
	err = uKey.Create()
	if err != nil {
		s.ErrorMessage(w, err.Error())
		return
	}

	u.Addr = addrKeys.Address
	u.CoinType = config.CoinType
	u.UserID = userid
	err = u.Create()
	if err != nil {
		s.ErrorMessage(w, err.Error())
	} else {
		fmt.Println("create address success")
		ad, err := address.GetByAddress(addrKeys.Address)
		if err != nil {
			s.ErrorMessage(w, err.Error())
			return
		}
		addressResult := &AddressResult{}
		addressResult.Id = ad.ID
		addressResult.Addr = addrKeys.Address
		addressResult.UserID = ad.UserID
		addressResult.CoinType = ad.CoinType
		addressResult.CTime = time.Now().Format("2006-01-02 15:04:05")
		addressResult.MTime = time.Now().Format("2006-01-02 15:04:05")
		addressResult.TotalRevceived = ConvertToCoin(coinType, ad.TotalRevceived)
		addressResult.TotalSent = ConvertToCoin(coinType, ad.TotalSent) 
		addressResult.Balance = ConvertToCoin(coinType, ad.Balance) 
		addressResult.UnconfirmedBalance = 0
		addressResult.FinalBalance = ConvertToCoin(coinType, ad.FinalBalance) 
		addressResult.ConfirmedTransaction = ad.ConfirmedTransaction
		addressResult.UnconfirmedTransaction = 0 
		addressResult.FinalTransaction = ad.FinalTransaction
		s.SendDataSuccess(w, addressResult)
	}
}

// balance and get address's infor api
func (s *AddressServer) HandleGetByAddress(w http.ResponseWriter, r *http.Request) {
	addr := r.URL.Query().Get("addr")
	coinType := r.URL.Query().Get("coin_type")

	// check coin type
	switch coinType {
	case "btc":
		config.CoinType = "btc"
	case "eth":
		config.CoinType = "eth"
	case "":
		config.CoinType = "btc"
	}

	btc := gobcy.API{config.UserToken, config.CoinType, config.Chain}
	addre, err := btc.GetAddrBal(addr, nil)
	if err != nil {
		s.ErrorMessage(w, err.Error())
		return
	}

	ad, err := address.GetByAddress(addr)
	if err != nil { 
		s.ErrorMessage(w, "address_not_found")
		return
	}
	add, err := address.GetByAddress(addr)

	ad.TotalRevceived = addre.TotalReceived
	ad.TotalSent = addre.TotalSent
	ad.Balance = addre.Balance
	ad.UnconfirmedBalance = &addre.UnconfirmedBalance
	ad.FinalBalance = addre.FinalBalance
	ad.ConfirmedTransaction = addre.NumTX
	ad.UnconfirmedTransaction = &addre.UnconfirmedNumTX
	ad.FinalTransaction = addre.FinalNumTX

	err = add.UpdateById(ad)
	if err != nil {
		s.ErrorMessage(w, err.Error())
	} else {
		addressResult := &AddressResult{}
		addressResult.Id = ad.ID
		addressResult.Addr = addr
		addressResult.UserID = ad.UserID
		addressResult.CoinType = ad.CoinType
		addressResult.CTime = ConvertDateTime(add.CTime)
		addressResult.MTime = time.Now().Format("2006-01-02 15:04:05")
		addressResult.TotalRevceived = ConvertToCoin(coinType, ad.TotalRevceived)
		addressResult.TotalSent = ConvertToCoin(coinType, ad.TotalSent) 
		addressResult.Balance = ConvertToCoin(coinType, ad.Balance) 
		addressResult.UnconfirmedBalance = ConvertToCoin(coinType, *ad.UnconfirmedBalance) 
		addressResult.FinalBalance = ConvertToCoin(coinType, ad.FinalBalance)
		addressResult.ConfirmedTransaction = ad.ConfirmedTransaction
		addressResult.UnconfirmedTransaction = *ad.UnconfirmedTransaction
		addressResult.FinalTransaction = ad.FinalTransaction
		s.SendDataSuccess(w, addressResult)
	}
}

func (s *AddressServer) mustGetAddress(r *http.Request) (*address.Address, error) {
	var id = r.URL.Query().Get("id")
	var u, err = address.GetByID(id)
	if err != nil {
		return u, err
	} else {
		return u, nil
	}
}

// update address api
func (s *AddressServer) HandleUpdateByID(w http.ResponseWriter, r *http.Request) {
	var newaddress = &address.Address{}
	s.MustDecodeBody(r, newaddress)
	u, err := s.mustGetAddress(r)
	if err != nil {
		s.ErrorMessage(w, "address_not_found")
		return
	}
	err = u.UpdateById(newaddress)
	if err != nil {
		s.ErrorMessage(w, err.Error())
	} else {
		result, err := address.GetByID(u.ID)
		if err != nil {
			s.ErrorMessage(w, "address_not_found")
			return
		}
		s.SendDataSuccess(w, result)
	}
}

// delete address api
func (s *AddressServer) HandleMarkDelete(w http.ResponseWriter, r *http.Request) {
	u, err := s.mustGetAddress(r)
	if err != nil {
		s.ErrorMessage(w, "address_not_found")
		return
	}
	err = address.MarkDelete(u.ID)
	if err != nil {
		s.ErrorMessage(w, err.Error())
	} else {
		s.Success(w)
	}
}

func StrToInt(s string) int {
	i, _ := strconv.ParseInt(s, 10, 64)
	return int(i)
} 

func ConvertToCoin(coinType string, value int) float64 {
	var result float64
	switch coinType {
	case "btc":
		result = (float64(value) /100000000)
	case "eth":
		result = (float64(value) /1000000000000000000)
	case "":
		result = (float64(value) /100000000)
	}

	return result
}

func ConvertDateTime(value int64) string {
	t := time.Unix(value, 0)
	return t.Format("2006-01-02 15:04:05")
}