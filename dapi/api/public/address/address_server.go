package address

import (
	"ams_api/dapi/o/address"
	"ams_api/dapi/o/addresskey"
	"http/web"
	"net/http"
	"strconv"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"crypto/ecdsa"
	"github.com/ethereum/go-ethereum/common"
	"ams_api/dapi/config"
	"fmt"
	"time"
	"regexp"
	"context"
	//"golang.org/x/net/context"
	"math"
	"math/big"
)

type AddressServer struct {
	web.JsonServer
	*http.ServeMux
}

// address response
type AddressResult struct {
	Addr                   string `json:"addr"`
	TotalRevceived         string    `json:"total_revceived"`
	TotalSent              string    `json:"total_sent"`
	Balance                string    `json:"balance"`
	UnconfirmedBalance     string   `json:"unconfirmed_balance"`
	FinalBalance           string    `json:"final_balance"`
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

	// check coin type
	switch coinType {
	case "btc":
		config.CoinType = "btc"
	case "eth":
		config.CoinType = "eth"
	case "":
		config.CoinType = "btc"
	}

	// connect to node
	_, err = ethclient.Dial(config.EndPoint)
	if err != nil {
		s.ErrorMessage(w, err.Error())
		return
	}

	// generate address and private key
	key, err := crypto.GenerateKey()
	if err != nil {
		s.ErrorMessage(w, err.Error())
		return
	}

	privateKeyBytes := crypto.FromECDSA(key)
	publicKey := key.Public()
	publicKeyECDSA, _ := publicKey.(*ecdsa.PublicKey)
	publicKeyBytes := crypto.FromECDSAPub(publicKeyECDSA)

	priKey := hexutil.Encode(privateKeyBytes)[2:] // private key
	pubKey := hexutil.Encode(publicKeyBytes)[4:] // public key
	address := crypto.PubkeyToAddress(key.PublicKey).Hex() // address

	// check valid address
	re := regexp.MustCompile("^0x[0-9a-fA-F]{40}$")
	if re.MatchString(address) == false {
		s.ErrorMessage(w, "invalid_address")
		return
	}

	// save address to db
	uKey.Addr = address
	uKey.PrivateKey = priKey
	uKey.PublicKey = pubKey
	err = uKey.Create()
	if err != nil {
		s.ErrorMessage(w, err.Error())
		return
	}

	u.Addr = address
	u.CoinType = config.CoinType
	u.UserID = userid
	err = u.Create()
	if err != nil {
		s.ErrorMessage(w, err.Error())
	} else {
		fmt.Println("address was created: ", address)
		addressResult := &AddressResult{}
		addressResult.Addr = address
		addressResult.UserID = userid
		addressResult.CoinType = config.CoinType
		addressResult.CTime = time.Now().Format("2006-01-02 15:04:05")
		addressResult.MTime = time.Now().Format("2006-01-02 15:04:05")
		addressResult.TotalRevceived = "0"
		addressResult.TotalSent = "0"
		addressResult.Balance = "0"
		addressResult.UnconfirmedBalance = "0"
		addressResult.FinalBalance = "0"
		addressResult.ConfirmedTransaction = 0
		addressResult.UnconfirmedTransaction = 0 
		addressResult.FinalTransaction = 0
		
		// send response
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

	// check address on db
	ad, err := address.GetByAddress(addr)
	if err != nil { 
		s.ErrorMessage(w, "address_not_found")
		return
	}

	// connect to node
	client, err := ethclient.Dial(config.EndPoint)
	if err != nil {
		s.ErrorMessage(w, err.Error())
		return
	}

	// get address info on node
	account := common.HexToAddress(addr)
	fmt.Println(account)
	balance, err := client.BalanceAt(context.Background(), account, nil)
	if err != nil {
		s.ErrorMessage(w, err.Error())
		return
	}
	pendingBalance, err := client.PendingBalanceAt(context.Background(), account)
	if err != nil {
		s.ErrorMessage(w, err.Error())
		return
	}

	//ad.TotalRevceived = 0
	//ad.TotalSent = 0
	ad.Balance = balance
	ad.UnconfirmedBalance = pendingBalance
	//ad.FinalBalance = 0
	ad.ConfirmedTransaction = 0
	// ad.UnconfirmedTransaction = 0
	ad.FinalTransaction = 0

	err = ad.UpdateById(ad)
	if err != nil {
		s.ErrorMessage(w, err.Error())
	} else {
		addressResult := &AddressResult{}
		addressResult.Addr = addr
		addressResult.UserID = ad.UserID
		addressResult.CoinType = ad.CoinType
		addressResult.CTime = ConvertDateTime(ad.CTime)
		addressResult.MTime = time.Now().Format("2006-01-02 15:04:05")
		addressResult.TotalRevceived = ConvertToCoin(coinType, ad.TotalRevceived)
		addressResult.TotalSent = ConvertToCoin(coinType, ad.TotalSent) 
		addressResult.Balance = ConvertToCoin(coinType, ad.Balance) 
		addressResult.UnconfirmedBalance = ConvertToCoin(coinType, ad.UnconfirmedBalance) 
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

func ConvertToCoin(coinType string, value *big.Int) string {
	fbalance := new(big.Float)
	fbalance.SetString(value.String())

	var result string
	switch coinType {
	case "btc":
		result = fmt.Sprintf("%f", new(big.Float).Quo(fbalance, big.NewFloat(math.Pow10(8)))) //(float64(value) /100000000)
	case "eth":
		result = fmt.Sprintf("%f", new(big.Float).Quo(fbalance, big.NewFloat(math.Pow10(18)))) //(float64(value) /1000000000000000000)
	case "":
		result = fmt.Sprintf("%f", new(big.Float).Quo(fbalance, big.NewFloat(math.Pow10(8)))) //(float64(value) /100000000)
	}

	return result
}

func ConvertDateTime(value int64) string {
	t := time.Unix(value, 0)
	return t.Format("2006-01-02 15:04:05")
}