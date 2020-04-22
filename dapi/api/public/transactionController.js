'use strict';

// library and modules
require('dotenv').config()
const mongoose = require('mongoose'),
  Addr = mongoose.model('addresses'),
  AddrKey = mongoose.model('addresskeys'),
  Trans = mongoose.model('transactions'),
  uuidv1 = require('uuid/v1'),
  url = require('url'),
  re = require('../modules/response'),
  Tx = require('ethereumjs-tx').Transaction

// connect to ethereum node
const Web3 = require('web3'),
      mainnet = process.env.Provider,
      w3 = new Web3(new Web3.providers.HttpProvider(mainnet))

// connect to bitcoin node
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
    tx_token:        Number, 
    pre_token_balance:     Number,    
    next_token_balance:    Number,    
    tx_create_time:  String
  },
  success: Boolean,
};

var depositStateResult = {
  data: {
    coin_type:  String,  
    coin_value: String, 
    token_value: Number,
    confirm:    Boolean,    
    message:    String, 
  },
  success: Boolean,
};

var transactionHistory = {
  data: [],
  success: Boolean
};

// api check deposit history
exports.check_deposit_history = async(req, res) => {
  let q = url.parse(req.url, true).query
  const addr = q.addr
  var service = q.service;
  var count = 0 

  // check params
  if (service == "") {
    re.errorResponse('service_empty', res, 400)
    return
  }

  service = service.toLocaleLowerCase();

  if (addr != "") {
    // check exists address
    await Addr.findOne({ addr: addr }, function(err, add){
      if (err) {
        re.errorResponse(err, res, 500);
        return
      }
      if (add == null) {
        re.errorResponse('address_not_found', res, 404);
        return
      }
    });
    await AddrKey.findOne({ addr: addr }, function(err, addrKey){
      if (err) {
        re.errorResponse(err, res, 500);
        return
      }
      if (addrKey == null) {
        re.errorResponse('addresskey_not_found', res, 404);
        return
      }
    });

    // get count transaction
    await Trans.countDocuments({ receiver: addr, is_deposit: true }, function(err, ct){
      if (err) {
        res.status(500).send(err)
      }
      count = ct
    })

    // get transaction
    await Trans.find({ receiver: addr, is_deposit: true }, function(err, transaction) {
      if (err) {
        re.errorResponse(err, res, 500);
        return
      }
      //transactionHistory
      transactionHistory.data = []
      transactionHistory.success = true
      for(var i=0; i<count;i++) {
        transactionHistory.success = true
        switch(transaction[i].coin_type) {
          case 'btc': 
            transactionHistory.data.push({ address: addr, coin_type: transaction[i].coin_type, coin_value: String(parseFloat(transaction[i].total_exchanged_string) / 100000000) })
            break;
          case 'eth':
            transactionHistory.data.push({ address: addr, coin_type: transaction[i].coin_type, coin_value: w3.utils.fromWei(transaction[i].total_exchanged_string, 'ether') }) 
            break;
        }
      }
    })

    res.json(transactionHistory);
  } else {
    // get count transaction
    await Trans.countDocuments({ is_deposit: true, service: service }, function(err, ct){
      if (err) {
        res.status(500).send(err)
      }
      count = ct
    })

    // get transaction
    await Trans.find({ is_deposit: true, service: service }, function(err, transaction) {
      if (err) {
        re.errorResponse(err, res, 500);
        return
      }
      //transactionHistory
      transactionHistory.data = []
      transactionHistory.success = true
      for(var i=0; i<count;i++) {
        transactionHistory.success = true
        switch(transaction[i].coin_type) {
          case 'btc': 
            transactionHistory.data.push({ address: transaction[i].sender, coin_type: transaction[i].coin_type, coin_value: String(parseFloat(transaction[i].total_exchanged_string) / 100000000) })
            break;
          case 'eth':
            transactionHistory.data.push({ address: transaction[i].sender, coin_type: transaction[i].coin_type, coin_value: w3.utils.fromWei(transaction[i].total_exchanged_string, 'ether') }) 
            break;
        }
      }
    })

    res.json(transactionHistory);
  }

  console.log('check deposit history')
};

// api check transaction history
exports.check_transaction_history = async(req, res) => {
  let q = url.parse(req.url, true).query
  const addr = q.addr
  var service = q.service;
  var count = 0 

  // check params
  if (service == "") {
    re.errorResponse('service_empty', res, 400)
    return
  }

  service = service.toLocaleLowerCase();

  if (addr != "") {
    // check exists address
    await Addr.findOne({ addr: addr }, function(err, add){
      if (err) {
        re.errorResponse(err, res, 500);
        return
      }
      if (add == null) {
        re.errorResponse('address_not_found', res, 404);
        return
      }
    });

    await AddrKey.findOne({ addr: addr }, function(err, addrKey){
      if (err) {
        re.errorResponse(err, res, 500);
        return
      }
      if (addrKey == null) {
        re.errorResponse('addresskey_not_found', res, 404);
        return
      }
    });

    // get count transaction
    await Trans.countDocuments({ sender: addr, is_deposit: false }, function(err, ct){
      if (err) {
        res.status(500).send(err)
      }
      count = ct
    })

    // get transaction
    await Trans.find({ sender: addr, is_deposit: false }, function(err, transaction) {
      if (err) {
        re.errorResponse(err, res, 500);
        return
      }
      //transactionHistory
      transactionHistory.data = []
      transactionHistory.success = true
      for(var i=0; i<count;i++) {
        transactionHistory.success = true
        switch(transaction[i].coin_type) {
          case 'btc': 
            transactionHistory.data.push({ address: addr, coin_type: transaction[i].coin_type, coin_value: String(parseFloat(transaction[i].total_exchanged_string) / 100000000) })
            break;
          case 'eth':
            transactionHistory.data.push({ address: addr, coin_type: transaction[i].coin_type, coin_value: w3.utils.fromWei(transaction[i].total_exchanged_string, 'ether') }) 
            break;
        }
      }
    })

    res.json(transactionHistory);
  } else {
    // get count transaction
    await Trans.countDocuments({ is_deposit: false, service: service }, function(err, ct){
      if (err) {
        res.status(500).send(err)
      }
      count = ct
    })

    // get transaction
    await Trans.find({ is_deposit: false, service: service }, function(err, transaction) {
      if (err) {
        re.errorResponse(err, res, 500);
        return
      }
      //transactionHistory
      transactionHistory.data = []
      transactionHistory.success = true
      for(var i=0; i<count;i++) {
        transactionHistory.success = true
        switch(transaction[i].coin_type) {
          case 'btc': 
            transactionHistory.data.push({ address: transaction[i].sender, coin_type: transaction[i].coin_type, coin_value: String(parseFloat(transaction[i].total_exchanged_string) / 100000000) })
            break;
          case 'eth':
            transactionHistory.data.push({ address: transaction[i].sender, coin_type: transaction[i].coin_type, coin_value: w3.utils.fromWei(transaction[i].total_exchanged_string, 'ether') }) 
            break;
        }
      }
    })

    res.json(transactionHistory);
  }

  console.log('check transaction history')
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
  var coinType = q.coin_type;
  const sender = q.sender
  const receiver = q.receiver
  var service = q.service;
  var trans = new Trans()
  var feeValue = 2000000000 * 200000
  var feeBitValue = 3000
  var senderBalance = 0
  var raw = ''
  var addressKey = new AddrKey()
  var walletName = ""
  var nonce = 0

  // check params
  if (service == "") {
    re.errorResponse('service_empty', res, 400)
    return
  }

  if (sender == "" || receiver == "") {
    re.errorResponse('sender_or_receiver_empty', res, 400)
    return
  }

  if (coinType == "") {
    re.errorResponse('cointype_empty', res, 400)
    return
  }

  coinType = coinType.toLocaleLowerCase();
  service = service.toLocaleLowerCase();

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
      await client.validateAddress(sender).then(function(validate){
        if (validate.isvalid == false) {
          re.errorResponse('invalid_address', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // load wallet
      var loadWallet = false
      await client.listWallets().then(function(listwallet){
        if (listwallet.includes(walletName) == false) {
          loadWallet = false
        } else {
          loadWallet = true
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      if (loadWallet == false) {
        await client.loadWallet(walletName).then(function(wallet){
          if (wallet.name != "") {
            client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
          }
        })
        .catch(function(err){
          re.errorResponse(err, res, 500);
          return
        });
      } else {
        client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
      }

      // get wallet info
      await client.getWalletInfo().then(function(walletInfo){
        senderBalance = walletInfo.balance * 100000000
        transactionResult.data.pre_balance = String(walletInfo.balance)
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
      await client.sendToAddress(receiver, parseFloat(senderBalance - feeBitValue) / 100000000).then(function(transactionId){
        trans.hash = transactionId
        trans.total_exchanged = senderBalance - feeBitValue
        trans.total_exchanged_string = trans.total_exchanged.toFixed()

        transactionResult.data.tx_hash = transactionId
      })
      .catch(function(err){
        re.errorResponse('not_enough_fund', res, 500);
        return
      });

      // get transaction info
      await client.getTransaction(trans.hash).then(function(transaction){
        trans.fees = Math.abs(transaction.fee) * 100000000
        trans.fees_string = trans.fees.toFixed()
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      transactionResult.data.tx_value = String(parseFloat(trans.total_exchanged_string) / 100000000)
      transactionResult.data.tx_fee = String(parseFloat(trans.fees_string) / 100000000) 
      transactionResult.data.tx_total_amount = String(parseFloat(trans.total_exchanged + trans.fees) / 100000000)

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
          console.log(feeValue)
          console.log(gasPrice)
          feeValue = gasPrice * 200000
          console.log(feeValue)
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });
      
      //get balance address
      await w3.eth.getBalance(sender).then(function(bal){
        if (Number(bal) <= feeValue) {
          re.errorResponse('not_enough_fund', res, 500);
          return
        }
        senderBalance = Number(bal)
        transactionResult.data.pre_balance = w3.utils.fromWei(bal, 'ether')
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // get nonce
      await w3.eth.getTransactionCount(sender).then(function(ct){
        nonce = ct
      })

      let tokenAbi = JSON.parse(process.env.Abi)
      let contractAddress = process.env.ContractAddress
      var contractInstance = new w3.eth.Contract(tokenAbi, contractAddress, { from: sender });

      // let transactionObject = {};
    
      // transactionObject = {
      //   from: sender,
      //   value: w3.utils.toHex(0), //senderBalance - feeValue
      //   gas: w3.utils.toHex(200000),
      //   gasPrice: w3.utils.toHex(feeValue / 200000)
      // }

      //let decimals = w3.utils.toBN();
      //let amount = w3.utils.toBN(100);
      //let valuesend = amount.mul(web3.utils.toBN(10).pow(decimals));

      // let payload = {
      //   data: byteCode
      // }

      // await contractInstance.deploy(payload).send(transactionObject, (err, hash) => {
      //   console.log('hash: ', hash)
      //   trans.hash = hash
      //   trans.total_exchanged = senderBalance - feeValue
      //   trans.total_exchanged_string = (senderBalance - feeValue).toFixed()
      //   trans.gas_limit = 21000
      //   trans.fees = feeValue
      //   trans.fees_string = feeValue.toFixed()
    
      //   transactionResult.data.tx_hash = trans.hash
      // })
      // .catch(function(err){
      //   console.log(err)
      //   re.errorResponse(err, res, 500);
      //   return
      // });

      // await contractInstance.methods.transfer(receiver, '100').send(transactionObject).on('transactionHash', function(hash) {
      //   console.log('hash: ', hash)
      //   trans.hash = hash
      //   trans.total_exchanged = senderBalance - feeValue
      //   trans.total_exchanged_string = (senderBalance - feeValue).toFixed()
      //   trans.gas_limit = 21000
      //   trans.fees = feeValue
      //   trans.fees_string = feeValue.toFixed()
    
      //   transactionResult.data.tx_hash = trans.hash
      // })
      // .catch(function(err){
      //   console.log(err)
      //   re.errorResponse(err, res, 500);
      //   return
      // });

      var rawTransaction = {
        nonce: w3.utils.toHex(nonce),
        from: sender,
        gasPrice: w3.utils.toHex(feeValue / 200000),
        gasLimit: w3.utils.toHex(200000),
        to: contractAddress,
        value: w3.utils.toHex(10), //senderBalance - feeValue
        data: contractInstance.methods.transfer(receiver, w3.utils.toHex(10000000)).encodeABI()
      }

      var privateKey = new Buffer(addressKey.private_key.substring(2,66), 'hex')
      var tx = new Tx(rawTransaction)

      tx.sign(privateKey)
      var serializedTx = tx.serialize()

      // send signed transaction
      await w3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), function(err, hash) { // raw
        console.log(hash)
        if (err) {
          re.errorResponse(err, res, 500);
          return
        }

        trans.hash = hash
        trans.total_exchanged = senderBalance - feeValue
        trans.total_exchanged_string = (senderBalance - feeValue).toFixed()
        trans.gas_limit = 200000
        trans.fees = feeValue
        trans.fees_string = feeValue.toFixed()
    
        transactionResult.data.tx_hash = trans.hash
      })
      .catch(function(err){
        console.log(err)
        re.errorResponse(err, res, 500);
        return
      });



      // let transactionObject = {};
    
      // transactionObject = {
      //   from: sender,
      //   to: receiver,
      //   value: String(senderBalance - feeValue),
      //   gas: String(21000),
      //   gasPrice: String(feeValue / 21000)
      // }

      // // sign transaction
      // await w3.eth.accounts.signTransaction(transactionObject, addressKey.private_key).then(function(transaction) {
      //   //console.log(transaction)
      //   raw = transaction.rawTransaction
      //   trans.size = w3.utils.hexToNumber(transaction.v)
      //   trans.signed_time = new Date().toISOString().replace('T', ' ').replace('Z', '')
      // })
      // .catch(function(err){
      //   re.errorResponse(err, res, 500);
      //   return
      // });
    
      // // send signed transaction
      // await w3.eth.sendSignedTransaction(raw, function(err, hash) { 
      //   console.log(hash)
      //   if (err) {
      //     re.errorResponse(err, res, 500);
      //     return
      //   }

      //   trans.hash = hash
      //   trans.total_exchanged = senderBalance - feeValue
      //   trans.total_exchanged_string = (senderBalance - feeValue).toFixed()
      //   trans.gas_limit = 21000
      //   trans.fees = feeValue
      //   trans.fees_string = feeValue.toFixed()
    
      //   transactionResult.data.tx_hash = trans.hash
      // })
      // .catch(function(err){
      //   re.errorResponse(err, res, 500);
      //   return
      // });

      //get transaction info
      await w3.eth.getTransaction(trans.hash, function(err, transaction){
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
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      transactionResult.data.tx_value = w3.utils.fromWei(trans.total_exchanged_string, 'ether')
      transactionResult.data.tx_fee = w3.utils.fromWei(trans.fees_string, 'ether')
      transactionResult.data.tx_total_amount = w3.utils.fromWei(String(trans.total_exchanged + trans.fees), 'ether')

      break;
    default :
      coin = 'btc';
      // validate address
      await client.validateAddress(sender).then(function(validate){
        if (validate.isvalid == false) {
          re.errorResponse('invalid_address', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // load wallet
      var loadWallet = false
      await client.listWallets().then(function(listwallet){
        if (listwallet.includes(walletName) == false) {
          loadWallet = false
        } else {
          loadWallet = true
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      if (loadWallet == false) {
        await client.loadWallet(walletName).then(function(wallet){
          if (wallet.name != "") {
            client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
          }
        })
        .catch(function(err){
          re.errorResponse(err, res, 500);
          return
        });
      } else {
        client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
      }

      // get wallet info
      await client.getWalletInfo().then(function(walletInfo){
        senderBalance = walletInfo.balance * 100000000
        transactionResult.data.pre_balance = String(walletInfo.balance)
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
      await client.sendToAddress(receiver, parseFloat(senderBalance - feeBitValue) / 100000000).then(function(transactionId){
        trans.hash = transactionId
        trans.total_exchanged = senderBalance - feeBitValue
        trans.total_exchanged_string = trans.total_exchanged.toFixed()

        transactionResult.data.tx_hash = transactionId
      })
      .catch(function(err){
        re.errorResponse('not_enough_fund', res, 500);
        return
      });

      // get transaction info
      await client.getTransaction(trans.hash).then(function(transaction){
        trans.fees = Math.abs(transaction.fee) * 100000000
        trans.fees_string = trans.fees.toFixed()
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      transactionResult.data.tx_value = String(parseFloat(trans.total_exchanged_string) / 100000000)
      transactionResult.data.tx_fee = String(parseFloat(trans.fees_string) / 100000000) 
      transactionResult.data.tx_total_amount = String(parseFloat(trans.total_exchanged + trans.fees) / 100000000)

      break;
  }

  trans._id = uuidv1()
  trans.sender = sender
  trans.receiver = receiver
  trans.coin_type = coin
  trans.service = service
  trans.is_deposit = false
  trans.ctime = new Date().toISOString().replace('T', ' ').replace('Z', '')
  trans.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

  transactionResult.data.tx_create_time = trans.ctime
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

  console.log('create transaction', trans.hash)
};

// api check deposit state by address
exports.check_deposit_state = async(req, res) => {
  let q = url.parse(req.url, true).query;
  var coinType = q.coin_type;
  const addr = q.addr
  var service = q.service;
  var address = new Addr()
  var new_address = new Addr()
  var walletName = ""

  // check params
  if (service == "") {
    re.errorResponse('service_empty', res, 400)
    return
  }
  if (addr == "") {
    errorMessage('address_empty', res, 400)
    return
  }
  if (coinType == "") {
    re.errorResponse('cointype_empty', res, 400)
    return
  }

  coinType = coinType.toLocaleLowerCase();
  service = service.toLocaleLowerCase();

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
      await client.validateAddress(addr).then(function(validate){
        if (validate.isvalid == false) {
          re.errorResponse('invalid_address', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // load wallet
      var loadWallet = false
      await client.listWallets().then(function(listwallet){
        if (listwallet.includes(walletName) == false) {
          loadWallet = false
        } else {
          loadWallet = true
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      if (loadWallet == false) {
        await client.loadWallet(walletName).then(function(wallet){
          if (wallet.name != "") {
            client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
          }
        })
        .catch(function(err){
          re.errorResponse(err, res, 500);
          return
        });
      } else {
        client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
      }

      // get wallet info
      await client.getWalletInfo().then(function(walletInfo){
        new_address.balance = walletInfo.balance * 100000000
        new_address.balance_string = new_address.balance.toFixed()
        new_address.unconfirmed_balance = walletInfo.unconfirmed_balance * 100000000
        new_address.unconfirmed_balance_string = new_address.unconfirmed_balance.toFixed()
        new_address.final_transaction = walletInfo.txcount
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
        new_address.balance = Number(bal)
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
    default :
      coin = 'btc';
      // validate address
      await client.validateAddress(addr).then(function(validate){
        if (validate.isvalid == false) {
          re.errorResponse('invalid_address', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // load wallet
      var loadWallet = false
      await client.listWallets().then(function(listwallet){
        if (listwallet.includes(walletName) == false) {
          loadWallet = false
        } else {
          loadWallet = true
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      if (loadWallet == false) {
        await client.loadWallet(walletName).then(function(wallet){
          if (wallet.name != "") {
            client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
          }
        })
        .catch(function(err){
          re.errorResponse(err, res, 500);
          return
        });
      } else {
        client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
      }

      // get wallet info
      await client.getWalletInfo().then(function(walletInfo){
        new_address.balance = walletInfo.balance * 100000000
        new_address.balance_string = new_address.balance.toFixed()
        new_address.unconfirmed_balance = walletInfo.unconfirmed_balance * 100000000
        new_address.unconfirmed_balance_string = new_address.unconfirmed_balance.toFixed()
        new_address.final_transaction = walletInfo.txcount
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
  }

  // check transaction state
  if (address.balance != new_address.balance && new_address.unconfirmed_balance == 0) {
    depositStateResult.data.coin_type = coin
    depositStateResult.data.coin_value = String(parseFloat(Math.abs(new_address.balance - address.balance)) / 100000000)
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

  if (new_address.unconfirmed_balance > 0) {
    depositStateResult.data.coin_type = coin
    depositStateResult.data.coin_value = String(parseFloat(new_address.unconfirmed_balance) / 100000000)
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

  console.log('check deposit state', addr)
};

// api check transaction state
exports.check_transaction = async(req, res) => {
  let q = url.parse(req.url, true).query;
  var coinType = q.coin_type;
  const hash = q.hash
  var service = q.service;
  var walletName = ""
  var sender = ""
  var trans = new Trans()

  // check params
  if (service == "") {
    re.errorResponse('service_empty', res, 400)
    return
  }
  if (hash == "") {
    errorMessage('transaction_hash_empty', res, 400)
    return
  }

  if (coinType == "") {
    re.errorResponse('cointype_empty', res, 400)
    return
  }

  coinType = coinType.toLocaleLowerCase();
  service = service.toLocaleLowerCase();

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
      // load wallet
      var loadWallet = false
      await client.listWallets().then(function(listwallet){
        if (listwallet.includes(walletName) == false) {
          loadWallet = false
        } else {
          loadWallet = true
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      if (loadWallet == false) {
        await client.loadWallet(walletName).then(function(wallet){
          if (wallet.name != "") {
            client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
          }
        })
        .catch(function(err){
          re.errorResponse(err, res, 500);
          return
        });
      } else {
        client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
      }

      // get transaction info
      await client.getTransaction(trans.hash).then(function(transaction){
        trans.confirmations = transaction.confirmations
        trans.block_hash = transaction.blockhash
        trans.block_index = transaction.blockindex
        depositStateResult.data.coin_value = String(Math.abs(transaction.amount))
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
    case 'eth':
      coin = 'eth';
      // get transaction info
      await w3.eth.getTransaction(trans.hash, function(err, transaction){
        if (err) {
          re.errorResponse(err, res, 500);
          return
        }
        if (transaction == null) {
          re.errorResponse('transaction_not_found', res, 404);
          return
        }

        trans.confirmations = transaction.blockNumber
        trans.block_number = transaction.blockNumber
        trans.block_hash = transaction.blockHash
        trans.nonce = transaction.nonce
        trans.block_index = transaction.transactionIndex
        depositStateResult.data.coin_value = w3.utils.fromWei(transaction.value, 'ether')
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });
      
      break;
    default :
      coin = 'btc';
      // load wallet
      var loadWallet = false
      await client.listWallets().then(function(listwallet){
        if (listwallet.includes(walletName) == false) {
          loadWallet = false
        } else {
          loadWallet = true
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      if (loadWallet == false) {
        await client.loadWallet(walletName).then(function(wallet){
          if (wallet.name != "") {
            client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
          }
        })
        .catch(function(err){
          re.errorResponse(err, res, 500);
          return
        });
      } else {
        client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
      }

      // get transaction info
      await client.getTransaction(trans.hash).then(function(transaction){
        trans.confirmations = transaction.confirmations
        trans.block_hash = transaction.blockhash
        trans.block_index = transaction.blockindex
        depositStateResult.data.coin_value = String(Math.abs(transaction.amount)) 
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

    res.json(depositStateResult);

  } else {
    depositStateResult.data.coin_type = coin
    depositStateResult.data.confirm = false
    depositStateResult.data.message = "transaction_pending"
    depositStateResult.success = true

    res.json(depositStateResult);
  }

  console.log('check transaction', hash)
};
