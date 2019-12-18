package transaction

import (
	"ams_system/dapi/o/address"
	"ams_system/dapi/o/addresskey"
	"ams_system/dapi/o/transaction"
	"ams_system/dapi/o/transaction_input"
	"ams_system/dapi/o/transaction_output"
	"fmt"
	"http/web"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"ams_system/dapi/config"
	"encoding/json"
	"github.com/blockcypher/gobcy"
)

type TransactionServer struct {
	web.JsonServer
	*http.ServeMux
}

type TransactionResult struct {
	Confirm       bool    `json:"confirm"`
	Message       string  `json:"message"`
	TXHash        string  `json:"tx_hash"`
	TXType        string  `json:"tx_type"`
	TXValue       float64 `json:"tx_value"`
	TXFee         float64 `json:"tx_fee"`
	CHKFeeValue   int `json:"chk_fee_value"`
	TXTotalAmount float64 `json:"tx_total_amount"` // Value + Fee
	PreBalance    float64 `json:"pre_balance"`     // balance
	NextBalance   float64 `json:"next_balance"`    // Current Balance in wallet - Total Transaction Amount
	TXCreateTime  string  `json:"tx_create_time"`
}
type DepositStateByAddressResult struct {
	CoinType  string  `json:"coin_type"`
	CoinValue float64 `json:"coin_value"`
	Confirm   bool    `json:"confirm"`
	Message   string  `json:"message"`
}
type DepositStateResult struct {
	Confirm bool   `json:"confirm"`
	Message string `json:"message"`
}
type TXFee struct {
	Result bool
	MSG    string
	RESP   []Resp
}
type Resp struct {
	CHK_Name       string
	CHK_Fee_Value  int
	CHK_Final_Date string
}

func getJson(url string, target interface{}) error {
	var myClient = &http.Client{Timeout: 10 * time.Second}
	r, err := myClient.Get(url)
	if err != nil {
		return err
	}
	defer r.Body.Close()

	return json.NewDecoder(r.Body).Decode(target)
}

// create server mux to handle Transaction api
func NewTransactionServer() *TransactionServer {
	var s = &TransactionServer{
		ServeMux: http.NewServeMux(),
	}

	s.HandleFunc("/send_to_polebit", s.HandleSend)
	s.HandleFunc("/check_deposit_state", s.HandleCheckDepositState)
	s.HandleFunc("/check_deposit_state_by_address", s.HandleCheckDepositStateByAddress)
	s.HandleFunc("/deposit_state_by_address", s.HandleDepositStateByAddress)
	s.HandleFunc("/get", s.HandleGetByHash)
	s.HandleFunc("/get_all", s.HandleGetAll)
	return s
}

func StrToInt(s string) int {
	i, _ := strconv.ParseInt(s, 10, 64)
	return int(i)
}

//get all transaction api
func (s *TransactionServer) HandleGetAll(w http.ResponseWriter, r *http.Request) {
	sortBy := r.URL.Query().Get("sort_by")
	sortOrder := r.URL.Query().Get("sort_order")

	pageSize := StrToInt(r.URL.Query().Get("page_size"))
	pageNumber := StrToInt(r.URL.Query().Get("page_number"))

	var res = []transaction.Transaction{}
	count, err := transaction.GetAllTransaction(pageSize, pageNumber, sortBy, sortOrder, &res)

	if err != nil {
		s.SendError(w, err)
	} else {
		s.SendDataSuccess(w, map[string]interface{}{
			"transactions": res,
			"count":        count,
		})
	}
}

// send coin to polebit wallet api
func (s *TransactionServer) HandleSend(w http.ResponseWriter, r *http.Request) {
	sender := r.URL.Query().Get("sender")
	receiver := r.URL.Query().Get("receiver")
	coinType := r.URL.Query().Get("coin_type")
	var fees int
	if receiver == "" || sender == "" {
		s.SendError(w, web.ErrBadRequest)
		return
	}

	var u = &transaction.Transaction{}
	var txInput = &transaction_input.TransactionInput{}
	var txOutput = &transaction_output.TransactionOutput{}
	var txInputs = []transaction_input.TransactionInput{}
	var txOutputs = []transaction_output.TransactionOutput{}

	_, err := address.GetByAddress(sender)
	if err != nil {
		s.ErrorMessage(w, "address_not_found")
		return
	}
	addrKey, err := addresskey.GetByAddress(sender)
	if err != nil {
		s.ErrorMessage(w, "address_not_found")
		return
	}

	switch coinType {
	case "btc":
		config.CoinType = "btc"
	case "eth":
		config.CoinType = "eth"
	case "":
		config.CoinType = "btc"
	}

	btc := gobcy.API{config.UserToken, config.CoinType, config.Chain}
	// set fees
	txfee := &TXFee{}
	formdata := url.Values{
		"search_type": {coinType},
	}
	resp, err := http.PostForm("http://ex.polebit.com:3001/admin/service/check_transaction_fee", formdata)
	if err != nil {
		s.ErrorMessage(w, "can't_get_fee")
		return
	}

	json.NewDecoder(resp.Body).Decode(txfee)
	fmt.Println(txfee)
	if !txfee.Result {
		s.ErrorMessage(w, "return_false")
		return
	} else {
		switch coinType {
		case "btc":
			fees = txfee.RESP[0].CHK_Fee_Value
		case "eth":
			fees = txfee.RESP[0].CHK_Fee_Value * 1000000000 * 21000
		case "":
			fees = txfee.RESP[0].CHK_Fee_Value
		}
	}

	fmt.Println(fees)
	//check fund
	addr, err := btc.GetAddrBal(sender, nil)
	if err != nil {
		s.ErrorMessage(w, err.Error())
		return
	}

	// create new transaction
	skel, err := btc.NewTX(gobcy.TempNewTX(addr.Address, receiver, addr.Balance-fees), false)
	if err != nil {
		s.ErrorMessage(w, "not_enough_fund")
		return
	}
	//sign it
	err = skel.Sign([]string{addrKey.PrivateKey})
	if err != nil {
		s.ErrorMessage(w, "not_enough_und")
		return
	}
	// send transaction
	skel, err = btc.SendTX(skel)
	if err != nil {
		s.ErrorMessage(w, "not_enough_und")
		return
	}

	fmt.Printf("%+v\n", skel)

	// create txoutput on db
	txO := skel.Trans.Outputs
	for i, _ := range txO {
		txOutput.Value = txO[i].Value
		txOutput.ScriptType = txO[i].ScriptType
		txOutput.Script = txO[i].Script
		txOutput.Addresses = txO[i].Addresses
		err = txOutput.Create()
		if err != nil {
			s.ErrorMessage(w, err.Error())
			return
		}
		txOutputs = append(txOutputs, *txOutput)
	}
	//create txinput on db
	txI := skel.Trans.Inputs
	for i, _ := range txI {
		txInput.PreviousHash = txI[i].PrevHash
		txInput.OutputIndex = txI[i].OutputIndex
		txInput.OutputValue = txI[i].OutputValue
		txInput.ScriptType = txI[i].ScriptType
		txInput.Script = txI[i].Script
		txInput.Addresses = txI[i].Addresses
		err = txInput.Create()
		if err != nil {
			s.ErrorMessage(w, err.Error())
			return
		}
		txInputs = append(txInputs, *txInput)
	}
	// create tx on db
	u.Hash = skel.Trans.Hash
	u.BlockHeight = skel.Trans.BlockHeight
	u.TotalBlock = skel.Trans.Confirmations
	u.TotalExchanged = skel.Trans.Total
	u.Fees = skel.Trans.Fees
	u.Size = skel.Trans.Size
	u.DoubleSpend = skel.Trans.DoubleSpend
	u.Inputs = txInputs
	u.Outputs = txOutputs
	u.Addresses = skel.Trans.Addresses
	u.ToSign = skel.ToSign
	u.Signatures = skel.Signatures
	u.PublicKeys = skel.PubKeys

	tra := &transaction.Transaction{}
	getJson("https://api.blockcypher.com/v1/"+config.CoinType+"/main/txs/"+u.Hash, tra)
	if config.CoinType == "eth" {
		u.GasUsed = tra.GasUsed
		u.GasPrice = tra.GasPrice
		u.GasLimit = tra.GasLimit
	}
	err = u.Create()
	if err != nil {
		s.ErrorMessage(w, err.Error())
	}

	fmt.Println(u)
	// send response
	txResult := &TransactionResult{}
	txResult.Confirm = false
	txResult.Message = "transaction_pending"
	txResult.TXHash = skel.Trans.Hash
	txResult.TXType = coinType
	txResult.TXCreateTime = time.Now().Format("2006-01-02 15:04:05")
	txResult.TXValue = ConvertToCoin(coinType, skel.Trans.Total)
	txResult.TXFee = ConvertToCoin(coinType, skel.Trans.Fees)
	txResult.CHKFeeValue = txfee.RESP[0].CHK_Fee_Value
	txResult.TXTotalAmount = txResult.TXValue + txResult.TXFee
	txResult.PreBalance = ConvertToCoin(coinType, addr.Balance)
	txResult.NextBalance = ConvertToCoin(coinType, addr.Balance) - txResult.TXTotalAmount

	s.SendDataSuccess(w, txResult)
}

// check deposit state api
func (s *TransactionServer) HandleCheckDepositState(w http.ResponseWriter, r *http.Request) {
	hash := r.URL.Query().Get("hash")
	coinType := r.URL.Query().Get("coin_type")

	switch coinType {
	case "btc":
		config.CoinType = "btc"
	case "eth":
		config.CoinType = "eth"
	case "":
		config.CoinType = "btc"
	}

	btc := gobcy.API{config.UserToken, config.CoinType, config.Chain}
	// check confirm transaction every 3 second

	var x = 1200
	for i := 0; i < x; i++ {
		time.Sleep(3 * time.Second)
		trans, err := btc.GetTX(hash, nil)
		if err != nil {
			s.ErrorMessage(w, "transaction_not_found")
			return
		}

		if trans.Confirmations > 0 {
			// save transaction on db
			tr, err := transaction.GetByHash(hash)
			if err != nil {
				s.ErrorMessage(w, "transaction_not_found")
				return
			}

			u, err := transaction.GetByHash(hash)
			if err == nil {
				u.Hash = trans.Hash
				u.BlockHeight = trans.BlockHeight
				u.BlockHash = trans.BlockHash
				u.TotalBlock = trans.Confirmations
				u.TotalExchanged = trans.Total
				u.Fees = trans.Fees
				u.Size = trans.Size
				u.Version = trans.Ver
				u.DoubleSpend = trans.DoubleSpend
				u.ConfirmedTime = trans.Confirmed.Unix()
				u.InputsTransaction = trans.VinSize
				u.OutputsTransaction = trans.VoutSize
				u.Addresses = trans.Addresses
				err = tr.UpdateById(u)
				if err != nil {
					s.ErrorMessage(w, err.Error())
					return
				}
			}

			// send response
			result := &DepositStateResult{}
			result.Confirm = true
			result.Message = "transaction_confirmed"

			s.SendDataSuccess(w, result)
			break
		}

		if i == 20 {
			// send response
			result := &DepositStateResult{}
			result.Confirm = false
			result.Message = "no_transaction"

			s.SendDataSuccess(w, result)
			break
		}
	}
}

// check deposit state by address api
func (s *TransactionServer) HandleCheckDepositStateByAddress(w http.ResponseWriter, r *http.Request) {
	addr := r.URL.Query().Get("addr")
	coinType := r.URL.Query().Get("coin_type")
	confirm := false

	ad, err := address.GetByAddress(addr)
	if err != nil {
		s.ErrorMessage(w, "address_not_found")
		return
	}
	add, err := address.GetByAddress(addr)

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

	// check confirm transaction every 3 second
	var x = 1200
	for i := 0; i < x; i++ {
		time.Sleep(3 * time.Second)
		addre, err := btc.GetAddrBal(addr, nil)
		if err != nil {
			s.ErrorMessage(w, err.Error())
			return
		}

		if ad.Balance != addre.Balance {
			confirm = true

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
				return
			}

			// send response
			result := &DepositStateByAddressResult{}
			result.CoinType = config.CoinType
			result.CoinValue = ConvertToCoin(coinType, addre.UnconfirmedBalance)
			result.Confirm = confirm
			result.Message = "transaction_confirmed"

			s.SendDataSuccess(w, result)
			break
		}

		if i == 20 {
			// send response
			result := &DepositStateByAddressResult{}
			result.CoinType = config.CoinType
			result.CoinValue = 0
			result.Confirm = false
			result.Message = "no_transaction"

			s.SendDataSuccess(w, result)
			break
		}
	}
}

// check deposit state by address api
func (s *TransactionServer) HandleDepositStateByAddress(w http.ResponseWriter, r *http.Request) {
	addr := r.URL.Query().Get("addr")
	coinType := r.URL.Query().Get("coin_type")
	confirm := false
	coinValue := 0

	ad, err := address.GetByAddress(addr)
	if err != nil {
		s.ErrorMessage(w, "address_not_found")
		return
	}
	add, err := address.GetByAddress(addr)

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

	// check confirm transaction
	addre, err := btc.GetAddrBal(addr, nil)
	if err != nil {
		s.ErrorMessage(w, err.Error())
		return
	}

	ad.TotalRevceived = addre.TotalReceived
	ad.TotalSent = addre.TotalSent
	ad.FinalBalance = addre.FinalBalance
	ad.ConfirmedTransaction = addre.NumTX
	ad.FinalTransaction = addre.FinalNumTX
	ad.UnconfirmedTransaction = &addre.UnconfirmedNumTX
	ad.UnconfirmedBalance = &addre.UnconfirmedBalance

	// 	ad.Balance = addre.Balance

	if ad.Balance != addre.Balance {
		confirm = true
		coinValue = addre.Balance - ad.Balance

		ad.Balance = addre.Balance

		err = add.UpdateById(ad)
		if err != nil {
			s.ErrorMessage(w, err.Error())
			return
		}

		// send response
		result := &DepositStateByAddressResult{}
		result.CoinType = config.CoinType
		result.CoinValue = ConvertToCoin(coinType, coinValue)
		result.Confirm = confirm
		result.Message = "transaction_confirmed"

		s.SendDataSuccess(w, result)
		return
	}

	if addre.UnconfirmedNumTX > 0 {
		confirm = false
		ad.Balance = addre.Balance

		err = add.UpdateById(ad)
		if err != nil {
			s.ErrorMessage(w, err.Error())
			return
		}

		// send response
		result := &DepositStateByAddressResult{}
		result.CoinType = config.CoinType
		result.CoinValue = ConvertToCoin(coinType, addre.UnconfirmedBalance)
		result.Confirm = confirm
		result.Message = "transaction_pending"

		s.SendDataSuccess(w, result)
	} else {
		confirm = false

		// send response
		result := &DepositStateByAddressResult{}
		result.CoinType = config.CoinType
		result.CoinValue = 0
		result.Confirm = confirm
		result.Message = "no_transaction"

		s.SendDataSuccess(w, result)
	}
}

// Get transaction by hash api
func (s *TransactionServer) HandleGetByHash(w http.ResponseWriter, r *http.Request) {
	hash := r.URL.Query().Get("hash")
	u, err := transaction.GetByHash(hash)
	if err != nil {
		s.ErrorMessage(w, "transaction_not_found")
		return
	}
	s.SendDataSuccess(w, u)
}

func ConvertToCoin(coinType string, value int) float64 {
	var result float64
	switch coinType {
	case "btc":
		result = float64(value) / 100000000
	case "eth":
		result = float64(value) / 1000000000000000000
	case "":
		result = float64(value) / 100000000
	}

	return result
}
