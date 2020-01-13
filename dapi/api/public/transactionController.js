'use strict';

// library and modules
require('dotenv').config()
const mongoose = require('mongoose'),
  Addr = mongoose.model('addresses'),
  AddrKey = mongoose.model('addresskeys'),
  Trans = mongoose.model('transactions'),
  uuidv1 = require('uuid/v1'),
  url = require('url'),
  convert = require('../modules/convert_to_coin'),
  axios = require('axios'),
  re = require('../modules/response'),
  bn = require('bignumber.js')

// connect to node
const Web3 = require('web3'),
      mainnet = process.env.Provider,
      w3 = new Web3(new Web3.providers.HttpProvider(mainnet))

const Client = require('bitcoin-core')
var client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword })

// variables
var coin = 'eth'

var transactionResult = {
  data: {
    confirm:         Boolean,    
    message:         String, 
    tx_hash:         String,  
    tx_type:         String,  
    tx_value:        String, 
    tx_fee:          String, 
    chk_fee_value:   Number, 
    tx_total_amount: String,     // Value + Fee
    pre_balance:     String,     // balance
    next_balance:    String,     // Current Balance in wallet - Total Transaction Amount
    tx_create_time:  String
  },
  success: Boolean,
};

var depositStateResult = {
  data: {
    coin_type:  String,  
    coin_value: String, 
    confirm:    Boolean,    
    message:    String, 
  },
  success: Boolean,
};

// api get all transaction 
exports.list_all_transaction = async(req, res) => {
    await Trans.find({}, function(err, transaction) {
      if (err)
        res.send(err);
      res.json(transaction);
  });
};

// api send coin to polebit
exports.create_a_transaction = async(req, res) => {
  let q = url.parse(req.url, true).query;
  const coinType = q.coin_type;
  const sender = q.sender
  const receiver = q.receiver
  var trans = new Trans()
  var feeValue = 20000000000 * 21000
  var feeBitValue = 3000
  var senderBalance = 0
  var raw = ''
  var addressKey = new AddrKey()
  var walletName = ""

  // check params
  if (sender == "" || receiver == "") {
    re.errorResponse('sender_or_receiver_empty', res, 400)
    return
  }

  // check exists address
  await Addr.findOne({ addr: sender }, function(err, addr){
    if (err) {
      re.errorResponse(err, res, 500);
      return
    }
    if (addr == null) {
      re.errorResponse('address_not_found', res, 404);
      return
    }
    walletName = addr.wallet_name
  });
  await AddrKey.findOne({ addr: sender }, function(err, addrKey){
    if (err) {
      re.errorResponse(err, res, 500);
      return
    }
    if (addrKey == null) {
      re.errorResponse('addresskey_not_found', res, 404);
      return
    }
    addressKey = addrKey
  });

  // check coin type
  switch(coinType) {
    case 'btc':
      coin = 'btc';
      // validate address
      await client.validateAddress(sender).then(function(res){
        if (res.isvalid == false) {
          re.errorResponse('invalid_address', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // get balance
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName });
      await client.getWalletInfo().then(function(res){
        console.log(res)
        senderBalance = res.balance * 100000000
        transactionResult.data.pre_balance = String(res.balance)
        if (senderBalance <= feeBitValue) {
          re.errorResponse('not_enough_fund', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // create and send transaction
      await client.sendToAddress(receiver, convert.convertToCoin(coin, String(senderBalance - feeBitValue))).then(function(transactionId){
        trans.hash = transactionId
        let value = new bn(senderBalance - feeBitValue)
        if (w3.utils.isBigNumber(value)) {
          trans.total_exchanged_string = value.toFixed()
        } else {
          trans.total_exchanged = senderBalance - feeBitValue
          trans.total_exchanged_string = trans.total_exchanged.toFixed()
        }
      })
      .catch(function(err){
        re.errorResponse('not_enough_fund', res, 500);
        return
      });

      // get transaction info
      await client.getTransaction(trans.hash).then(function(res){
        let value = new bn(Math.abs(res.fee) * 100000000)
        if (w3.utils.isBigNumber(value)) {
          trans.fees_string = value.toFixed()
        } else {
          trans.fees = Math.abs(res.fee) * 100000000
          trans.fees_string = trans.fees.toFixed()
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
    case 'eth':
      coin = 'eth';
      // check valid sender address
      if (w3.utils.isAddress(sender) == false) {
        re.errorResponse('invalid_address', res, 500);
          return
      }

      // get gas price
      await w3.eth.getGasPrice().then(function(gasPrice){
        if (gasPrice > 0) {
          feeValue = gasPrice * 21000
        }
      })
      
      //get balance address
      await w3.eth.getBalance(sender).then(function(bal){
        if (bal <= feeValue) {
          re.errorResponse('not_enough_fund', res, 500);
          return
        }
        senderBalance = bal
        transactionResult.data.pre_balance = String(convert.convertToCoin(coin, String(bal)))
      })
      .catch(function(err){
        re.errorResponse('cant_get_balance', res, 500);
        return
      });
    
      let transactionObject = {};
    
      transactionObject = {
        from: sender,
        to: receiver,
        value: senderBalance - feeValue,
        gas: 21000,
        gasPrice: feeValue / 21000
      }
    
      // sign transaction
      await w3.eth.accounts.signTransaction(transactionObject, addressKey.private_key, function(err, transaction){
        if (err) {
          re.errorResponse(err, res, 500);
          return
        }
        console.log(transaction.tx)
        raw = transaction.rawTransaction
        trans.size = w3.utils.hexToNumber(transaction.v)
        trans.signed_time = new Date().toISOString().replace('T', ' ').replace('Z', '')
      })
    
      // send signed transaction
      await w3.eth.sendSignedTransaction(raw, function(err, hash) {
        if (err) {
          re.errorResponse(err, res, 500);
          return
        }

        trans.hash = hash
        let value = new bn(senderBalance - feeValue)
        if (w3.utils.isBigNumber(senderBalance - feeValue)) {
          trans.total_exchanged_string = value.toFixed()
        } else {
          trans.total_exchanged = senderBalance - feeValue
          trans.total_exchanged_string = (senderBalance - feeValue).toFixed()
        }
        trans.gas_limit = 21000
        let fe = new bn(feeValue)
        if (w3.utils.isBigNumber(fe)) {
          trans.fees_string = fe.toFixed()
        } else {
          trans.fees = feeValue
          trans.fees_string = feeValue.toFixed()
        }  
        transactionResult.data.tx_hash = trans.hash
        // transactionResult.data.chk_fee_value = chkFeeValue
      });

      // get transaction info
      await web3.eth.getTransaction(trans.hash, function(err, transaction){
        if (err) {
          re.errorResponse(err, res, 500);
          return
        }
        if (transaction == null) {
          re.errorResponse('transaction_not_found', res, 404);
          return
        }

        trans.gas_price = transaction.gasPrice
        trans.gas = transaction.gas
        trans.nonce = transaction.nonce
      });

      break;
    default :
      coin = 'btc';
      // validate address
      await client.validateAddress(sender).then(function(res){
        if (res.isvalid == false) {
          re.errorResponse('invalid_address', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // get balance
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName });
      await client.getWalletInfo().then(function(res){
        console.log(res)
        senderBalance = res.balance * 100000000
        transactionResult.data.pre_balance = String(res.balance)
        if (senderBalance <= feeBitValue) {
          re.errorResponse('not_enough_fund', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // create and send transaction
      await client.sendToAddress(receiver, convert.convertToCoin(coin, String(senderBalance - feeBitValue))).then(function(transactionId){
        trans.hash = transactionId
        let value = new bn(senderBalance - feeBitValue)
        if (w3.utils.isBigNumber(value)) {
          trans.total_exchanged_string = value.toFixed()
        } else {
          trans.total_exchanged = senderBalance - feeBitValue
          trans.total_exchanged_string = trans.total_exchanged.toFixed()
        }
      })
      .catch(function(err){
        re.errorResponse('not_enough_fund', res, 500);
        return
      });

      // get transaction info
      await client.getTransaction(trans.hash).then(function(res){
        let value = new bn(Math.abs(res.fee) * 100000000)
        if (w3.utils.isBigNumber(value)) {
          trans.fees_string = value.toFixed()
        } else {
          trans.fees = Math.abs(res.fee) * 100000000
          trans.fees_string = trans.fees.toFixed()
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
  }

  // get chk fee value

  // const requestBody = {
  //   'search_type': coinType
  // }
  // const config = {
  //   headers: {
  //     'Content-Type': 'application/x-www-form-urlencoded'
  //   }
  // }
	// await axios.post(process.env.GetFeeURL, qs.stringify(requestBody), config)
	// .then(function(res){
	// 	chkFeeValue = Number(res.data.resp[0].chk_fee_value)
	// })
	// .catch(function(err){
	// 	re.errorResponse('cant_get_fee', res, 500);
  //   return
  // });

  trans._id = uuidv1()
  trans.sender = sender
  trans.receiver = receiver
  trans.coin_type = coin
  trans.ctime = new Date().toISOString().replace('T', ' ').replace('Z', '')
  trans.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

  let exchange = new bn(trans.total_exchanged_string)
  let fe = new bn(trans.fees_string)
  transactionResult.data.tx_create_time = trans.ctime
  transactionResult.data.tx_value = String(convert.convertToCoin(coin, trans.total_exchanged_string))
  transactionResult.data.tx_fee = String(convert.convertToCoin(coin, trans.fees_string))
  transactionResult.data.tx_total_amount = String(convert.convertToCoin(coin, String(exchange + fe)))
  transactionResult.data.next_balance = Math.abs(parseFloat(transactionResult.data.pre_balance) - parseFloat(transactionResult.data.tx_total_amount)).toFixed(8)

  // create a new transaction
  await trans.save(function(err){
    if (err) {
      re.errorResponse('error_create_transaction', res, 500)
    } else {
      transactionResult.data.confirm = false
      transactionResult.data.message = "transaction_pending"
      transactionResult.data.tx_type = coin
      transactionResult.success = true

      res.json(transactionResult);
    }
  })
};

// api check deposit state by address
exports.check_deposit_state = async(req, res) => {
  let q = url.parse(req.url, true).query;
  const coinType = q.coin_type;
  const addr = q.addr
  var address = new Addr()
  var new_address = new Addr()
  var walletName = ""

  // check params
  if (addr == "") {
    errorMessage('address_empty', res, 400)
    return
  }

  // check exists address
  await Addr.findOne({ addr: addr }, function(err, add){
    if (err) {
      re.errorResponse(err, res, 404);
      return
    }
    if (add == null) {
      re.errorResponse('address_not_found', res, 404);
      return
    }
    address = add
    walletName = add.wallet_name
  });

  // check coin type
  switch(coinType) {
    case 'btc':
      coin = 'btc';
      // validate address
      await client.validateAddress(addr).then(function(res){
        if (res.isvalid == false) {
          re.errorResponse('invalid_address', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // get balance
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName });
      await client.getWalletInfo().then(function(res){
        let balance = new bn(res.balance * 100000000)
        if (w3.utils.isBigNumber(balance)) {
          new_address.balance_string = balance.toFixed()
        } else {
          new_address.balance = res.balance * 100000000
          new_address.balance_string = new_address.balance.toFixed()
        }
        
        let unconfirmBalance = new bn(res.balance * 100000000)
        if (w3.utils.isBigNumber(unconfirmBalance)) {
          new_address.unconfirmed_balance_string = unconfirmBalance.toFixed()
        } else {
          new_address.unconfirmed_balance = res.unconfirmed_balance * 100000000
          new_address.unconfirmed_balance_string = new_address.unconfirmed_balance.toFixed()
        }
        new_address.final_transaction = res.txcount
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
    case 'eth':
      coin = 'eth';
      // check valid address
      if (w3.utils.isAddress(addr) == false) {
        re.errorResponse('invalid_address', res, 500);
          return
      }

      //get balance address
      await w3.eth.getBalance(addr).then(function(bal){
        let balance = new bn(bal)
        if (w3.utils.isBigNumber(balance)) {
          new_address.balance_string = balance.toFixed()
        } else {
          new_address.balance = bal
          new_address.balance_string = new_address.balance.toFixed()
        }      
      })

      break;
    default :
      coin = 'btc';
      // validate address
      await client.validateAddress(addr).then(function(res){
        if (res.isvalid == false) {
          re.errorResponse('invalid_address', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // get balance
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName });
      await client.getWalletInfo().then(function(res){
        let balance = new bn(res.balance * 100000000)
        if (w3.utils.isBigNumber(balance)) {
          new_address.balance_string = balance.toFixed()
        } else {
          new_address.balance = res.balance * 100000000
          new_address.balance_string = new_address.balance.toFixed()
        }
        
        let unconfirmBalance = new bn(res.balance * 100000000)
        if (w3.utils.isBigNumber(unconfirmBalance)) {
          new_address.unconfirmed_balance_string = unconfirmBalance.toFixed()
        } else {
          new_address.unconfirmed_balance = res.unconfirmed_balance * 100000000
          new_address.unconfirmed_balance_string = new_address.unconfirmed_balance.toFixed()
        }
        new_address.final_transaction = res.txcount
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
  }

  let bal = new bn(address.balance_string)
  let new_bal = new bn(new_address.balance_string)
  let new_unbal = new bn(new_address.unconfirmed_balance_string)
  // check transaction state
  if (bal != new_bal && new_unbal == 0) {
    depositStateResult.data.coin_type = coin
    depositStateResult.data.coin_value = String(convert.convertToCoin(coin, String(Math.abs(new_bal - bal))))
    depositStateResult.data.confirm = true
    depositStateResult.data.message = "transaction_confirmed"
    depositStateResult.success = true

    new_address.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')
    // update address
    await Addr.findOneAndUpdate({ addr: addr }, new_address, function(err, ad) {
      if (err) {
        re.errorResponse(err, res, 500);
        return
      }
      if (ad == null) {
        re.errorResponse('address_not_found', res, 404);
        return
      }
    });

    res.json(depositStateResult);
    return
  }

  if (new_unbal> 0) {
    depositStateResult.data.coin_type = coin
    depositStateResult.data.coin_value = String(convert.convertToCoin(coin, new_address.unconfirmed_balance_string))
    depositStateResult.data.confirm = false
    depositStateResult.data.message = "transaction_pending"
    depositStateResult.success = true

    res.json(depositStateResult);
  } else {
    depositStateResult.data.coin_type = coin
    depositStateResult.data.coin_value = "0"
    depositStateResult.data.confirm = false
    depositStateResult.data.message = "no_transaction"
    depositStateResult.success = true

    res.json(depositStateResult);
  }
};

// api check transaction state
exports.check_transaction = async(req, res) => {
  let q = url.parse(req.url, true).query;
  const coinType = q.coin_type;
  const hash = q.hash
  var walletName = ""
  var sender = ""
  var trans = new Trans()

  // check params
  if (hash == "") {
    errorMessage('transaction_hash_empty', res, 400)
    return
  }

  // check exists transaction
  await Trans.findOne({ hash: hash }, function(err, tran){
    if (err) {
      re.errorResponse(err, res, 404);
      return
    }
    if (tran == null) {
      re.errorResponse('transaction_not_found', res, 404);
      return
    }

    sender = tran.sender
    trans = tran
  });

  // get wallet name
  await Addr.findOne({ addr: sender }, function(err, add){
    if (err) {
      re.errorResponse(err, res, 404);
      return
    }
    if (add == null) {
      re.errorResponse('address_not_found', res, 404);
      return
    }

    walletName = add.wallet_name
  })

  // check coin type
  switch(coinType) {
    case 'btc':
      coin = 'btc';
      // get transaction info
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName });
      await client.getTransaction(trans.hash).then(function(res){
        trans.confirmations = res.confirmations
        trans.block_hash = res.blockhash
        trans.block_index = res.blockindex
        depositStateResult.data.coin_value = String(res.amount)
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
    case 'eth':
      coin = 'eth';
      // get transaction info
      await web3.eth.getTransaction(hash, function(err, transaction){
        if (err) {
          re.errorResponse(err, res, 500);
          return
        }
        if (transaction == null) {
          re.errorResponse('transaction_not_found', res, 404);
          return
        }
        trans.confirmations = transaction.blockNumber
        trans.block_hash = transaction.blockHash
        trans.block_index = transaction.transactionIndex
        depositStateResult.data.coin_value = String(convert.convertToCoin(coin, String(res.value)))
      });
      
      break;
    default :
      coin = 'btc';
      // get transaction info
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName });
      await client.getTransaction(trans.hash).then(function(res){
        trans.confirmations = res.confirmations
        trans.block_hash = res.blockhash
        trans.block_index = res.blockindex
        depositStateResult.data.coin_value = String(res.amount)
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
  }

  trans.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')
  // check transaction state
  if (trans.confirmations > 0) {
    depositStateResult.data.coin_type = coin
    depositStateResult.data.confirm = true
    depositStateResult.data.message = "transaction_confirmed"
    depositStateResult.success = true

    // update transaction
    Trans.findOneAndUpdate({ hash: hash }, trans, function(err){
      if (err) {
        re.errorResponse(err, res, 500);
        return
      }
    })

  } else {
    depositStateResult.data.coin_type = coin
    depositStateResult.data.confirm = false
    depositStateResult.data.message = "transaction_pending"
    depositStateResult.success = true
  }

  res.json(depositStateResult);
};
