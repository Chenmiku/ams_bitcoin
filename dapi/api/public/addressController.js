'use strict';

// library and modules
require('dotenv').config()
const mongoose = require('mongoose'),
  uuidv1 = require('uuid/v1'),
  Addr = mongoose.model('addresses'),
  AddrKey = mongoose.model('addresskeys'),
  Wallet = mongoose.model('wallets'),
  Trans = mongoose.model('transactions'),
  randomString = require('randomstring'),
  url = require('url'),
  re = require('../modules/response'),
  axios = require('axios'),
  qs = require('querystring'),
  cronJob = require('cron').CronJob

// connect to ethereum node
const Web3 = require('web3'),
      mainnet = process.env.Provider,
      w3 = new Web3(new Web3.providers.HttpProvider(mainnet))

// connect to bitcoin node      
const Client = require('bitcoin-core')
var client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword })

// api get all
exports.list_all_addresses = async(req, res) => {
    await Addr.find({}, function(err, address) {
      if (err)
        res.send(err);
      res.json(address);
  }).sort({ ctime: 'descending' });
};

// api generate address
exports.create_a_address = async(req, res) => {

  var coin = 'eth'

  var addressResult = { 
    data: {
      addr: String,
      balance: String,
      token_balance: String,
      unconfirmed_balance: String,
      final_transaction: Number,
      coin_type: String,
      user_id: Number,
      ctime: String,
      mtime: String,
    },
    success: Boolean,
  }

  const q = url.parse(req.url, true).query;
  var coinType = q.coin_type;
  const userId = q.user_id;
  var service = q.service;
  var new_address = new Addr();
  var new_addresskey = new AddrKey();
  var new_wallet = new Wallet();
  var backupFileName = "";
  var walletName = ""

  // check param
  if (service == "") {
    re.errorResponse('service_empty', res, 400)
    return
  }
  if (coinType == "") {
    re.errorResponse('cointype_empty', res, 400)
    return
  }
  if (userId == "") {
    re.errorResponse('userId_empty', res, 400)
    return
  }

  coinType = coinType.toLocaleLowerCase();
  service = service.toLocaleLowerCase();

  // check coin type
  switch(coinType) {
    case 'btc':
      coin = 'btc';
      walletName = randomString.generate(34)
      backupFileName = walletName + '.dat';       
      // create a new wallet
      await client.createWallet(walletName).then(function(wall){
        if (res != null) {
          new_wallet.name = wall.name
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

      // backup wallet	
      await client.backupWallet(process.env.BitWallet + backupFileName).then(function(backupWall){	
        new_wallet.file_backup = backupFileName	
      })	
      .catch(function(err){	
        re.errorResponse(err, res, 500);
        return	
      })

      // create a new address
      await client.getNewAddress().then(function(address){
        new_address.addr = address
        new_addresskey.addr = address
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      })

      // add private key to address
      await client.dumpPrivKey(new_address.addr).then(function(privKey){
        new_addresskey.private_key = privKey
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      })

      new_wallet._id = uuidv1()
      new_wallet.coin_type = coin
      new_wallet.service = service
      new_wallet.ctime = new Date().toISOString().replace('T', ' ').replace('Z', '')
      new_wallet.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

      new_address.wallet_id = new_wallet._id
      new_address.wallet_name = new_wallet.name

      // create a new wallet
      await new_wallet.save(function(err){
        if(err) {
          re.errorResponse(err, res, 500);
          return
        }
      })
      
      break;
    case 'eth':
      coin = 'eth';
      const entropy = w3.utils.randomHex(32)
      // Create a new address
      const account = w3.eth.accounts.create(entropy)
      new_address.addr = account.address
      new_address.entropy = entropy

      new_addresskey.addr = account.address
      new_addresskey.private_key = account.privateKey
      break;
    case '':
      coin = 'btc';       
      walletName = randomString.generate(34)
      backupFileName = walletName + '.dat';
      // create a new wallet
      await client.createWallet(walletName).then(function(wall){
        if (res != null) {
          new_wallet.name = wall.name
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

      // backup wallet	
      await client.backupWallet(process.env.BitWallet + backupFileName).then(function(backupWall){	
        new_wallet.file_backup = backupFileName	
      })	
      .catch(function(err){	
        re.errorResponse(err, res, 500);	
        return	
      })

      // create a new address
      await client.getNewAddress().then(function(address){
        new_address.addr = address
        new_addresskey.addr = address
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      })

      // add private key to address
      await client.dumpPrivKey(new_address.addr).then(function(privKey){
        new_addresskey.private_key = privKey
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      })

      new_wallet._id = uuidv1()
      new_wallet.coin_type = coin
      new_wallet.service = service
      new_wallet.ctime = new Date().toISOString().replace('T', ' ').replace('Z', '')
      new_wallet.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

      new_address.wallet_id = new_wallet._id
      new_address.wallet_name = new_wallet.name

      // create a new wallet
      await new_wallet.save(function(err){
        if(err) {
          re.errorResponse(err, res, 500);
          return
        }
      })

      break;
  }

  new_address._id = uuidv1()
  new_address.balance = 0
  new_address.balance_string = "0"
  new_address.unconfirmed_balance = 0
  new_address.unconfirmed_balance_string = "0"
  new_address.final_transaction = 0
  new_address.user_id = userId || 0
  new_address.coin_type = coin
  new_address.service = service
  new_address.token_balance = "0"
  new_address.ctime = new Date().toISOString().replace('T', ' ').replace('Z', '')
  new_address.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

  new_addresskey._id = uuidv1()
  new_addresskey.coin_type = coin
  new_addresskey.service = service
  new_addresskey.ctime = new Date().toISOString().replace('T', ' ').replace('Z', '')
  new_addresskey.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

  if(new_address.addr != null) {
    // create a new addresskey
    await new_addresskey.save(function(err){
      if(err) {
        re.errorResponse(err, res, 500);
        return
      }
    })
  // create a new address
    await new_address.save(function(err, addr) {
      if(err) {
        re.errorResponse('error_create_address', res, 500);
      } else {
        addressResult.data.addr = addr.addr
        addressResult.data.balance = "0"
        addressResult.data.token_balance = "0"
        addressResult.data.unconfirmed_balance = "0"
        addressResult.data.final_transaction = 0
        addressResult.data.coin_type = coin
        addressResult.data.user_id = userId || 0
        addressResult.data.ctime = new_address.ctime
        addressResult.data.mtime = new_address.mtime
        addressResult.success = true

        res.status(201).json(addressResult);
      }
    });

    // set interval to check deposit of address every 3s
    console.log('create wallet', addressResult.data.addr)
    console.log('coin: ', coin)
    
    var job = new cronJob('*/3 * * * * *', function() {
      checkDeposit(coin, new_address.addr, walletName, res, service, userId)
     }, null, true, 'Asia/Seoul');
    job.start(); 
  } else {
    re.errorResponse('address_is_null', res, 500);
  }
};

// Api get By address
exports.get_a_address = async(req, res) => {

  var coin = 'eth'

  var addressResult = { 
    data: {
      addr: String,
      balance: String,
      token_balance: String,
      unconfirmed_balance: String,
      final_transaction: Number,
      coin_type: String,
      user_id: Number,
      ctime: String,
      mtime: String,
    },
    success: Boolean,
  }

  const q = url.parse(req.url, true).query;
  var coinType = q.coin_type;
  const addr = q.addr
  var service = q.service;
  var new_address = new Addr()
  var walletName = ""

  // check params
  if (service == "") {
    re.errorResponse('service_empty', res, 400)
    return
  }

  if (addr == "") {
    re.errorResponse('address_empty', res, 400)
    return
  }

  if (coinType == "") {
    re.errorResponse('cointype_empty', res, 400)
    return
  }

  coinType = coinType.toLocaleLowerCase();
  service = service.toLocaleLowerCase();

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

      // get address
      await Addr.findOne({ addr: addr }, function(err, add){
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
        new_address.token_balance = "0"
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      addressResult.data.balance =  String(parseFloat(new_address.balance_string) / 100000000)
      addressResult.data.unconfirmed_balance = String(parseFloat(new_address.unconfirmed_balance_string) / 100000000)
      addressResult.data.token_balance = "0"

      break;
    case 'eth':
      coin = 'eth';
      // check valid address
      if (w3.utils.isAddress(addr) == false) {
        re.errorResponse('invalid_address', res, 500);
        return
      }

      // get address
      await Addr.findOne({ addr: addr }, function(err, add){
        if (err) {
          re.errorResponse(err, res, 404);
          return
        }
        if (add == null) {
          re.errorResponse('address_not_found', res, 404);
          return
        }
      })

      //get balance address
      await w3.eth.getBalance(addr).then(function(bal){
        new_address.balance = Number(bal)
        new_address.balance_string = bal
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // get token balance address
      let tokenAbi = JSON.parse(process.env.Abi)
      let contractAddress = process.env.ContractAddress
      var contractInstance = new w3.eth.Contract(tokenAbi, contractAddress, { from: addr });
      await contractInstance.methods.balanceOf(addr).call().then(function(val){
        console.log('balance: ', val)
        new_address.token_balance = String(parseFloat(w3.utils.toWei(val, 'wei')) / 100000000)
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      addressResult.data.balance = w3.utils.fromWei(new_address.balance_string, 'ether');
      addressResult.data.unconfirmed_balance = 0
      addressResult.data.token_balance = new_address.token_balance

      break;
    default :
      coin = 'btc';
      // validate address
      await client.validateAddress(new_address.addr).then(function(validate){
        if (validate.isvalid == false) {
          re.errorResponse('invalid_address', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // get address
      await Addr.findOne({ addr: addr }, function(err, add){
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
        new_address.token_balance = "0"
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      addressResult.data.balance = String(parseFloat(new_address.balance_string) / 100000000)
      addressResult.data.unconfirmed_balance = String(parseFloat(new_address.unconfirmed_balance_string) / 100000000)
      addressResult.data.token_balance = "0"

      break;
  }

  new_address.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

  // update address
  await Addr.findOneAndUpdate({ addr: addr }, new_address, function(err, ad) {
    if (err) {
      re.errorResponse(err, res, 500);
      return
    }
    if (ad == null) {
      re.errorResponse('address_not_found', res, 404);
    } else {
      addressResult.data.addr = addr
      addressResult.data.final_transaction = ad.final_transaction
      addressResult.data.coin_type = coin
      addressResult.data.user_id = ad.user_id || 0
      addressResult.data.ctime = ad.ctime
      addressResult.data.mtime = ad.mtime
      addressResult.success = true

      res.json(addressResult);
    }
  });

  console.log('get wallet info', addr)
};

// function auto check deposit 
async function checkDeposit(coin,address,walletName,res,service,userId) {

  if (global.gc) {
    global.gc()
  }

  if (address.startsWith("0x")) {
    coin = 'eth'
  } else {
    coin = 'btc'
  }

  console.log('coin:', coin)
  console.log('addr:', address)

  var blockNumber = 0
  var includeBlock = 0
  var value = 0
  var hash = ""
  var balance = 0
  var token_balance = ''
  var count = 0
  var countTran = 0
  var txns = []
  var trans = new Trans()
  var new_address = new Addr()

  // get the number of address's deposit 
  await Trans.countDocuments({ receiver: address, is_deposit: true }, function(err, ct){
    if (err) {
      re.errorResponse(err, res, 500)
      return
    }
    count = ct
  })

  // check coin type
  switch(coin) {
    case 'btc':
      // get deposit info
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
      await client.listTransactions().then(function(transactions){
        for(var i = 0; i < transactions.length; i++) {
          if( transactions[i].category == "receive" && transactions[i].confirmations > 0 ) {
            txns.push(transactions[i])
          }
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      console.log('trans: ', txns)
      if (txns.length > count) {
        value = txns[count].amount * 100000000
        hash = txns[count].txid
      }

      // get wallet info
      await client.getWalletInfo().then(function(walletInfo){
        balance = walletInfo.balance * 100000000
        new_address.final_transaction = walletInfo.txcount
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
    case 'eth':
      let input = ''
      // get highest block
      await w3.eth.getBlockNumber().then(function(blockNum){
        console.log('high number=>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>: ', blockNum)
        blockNumber = blockNum
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // get deposit info
      for(var i = blockNumber-1; i <= blockNumber; i++) {
        await w3.eth.getBlock(i, true).then(function(block){ 
          if(block == null || block == 'undefined') {
            re.errorResponse(err, res, 500);
            return
          }
          if(block.transactions.length > 0) {
            for(var j = 0; j < block.transactions.length; j++) {
              if( block.transactions[j].to == address ) {
                includeBlock = block.transactions[j].blockNumber
                input = block.transactions[j].input
                if (input.length == 138) {
                  value = String(parseFloat(w3.utils.hexToNumberString('0x' + input.slice(74,138))) / 10000)
                  console.log('token=>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>: ', value)
                  coin = 'dsn'
                } else {
                  value = block.transactions[j].value
                }
                hash = block.transactions[j].hash
              }
            }
          }
        })
      }

      //get balance address
      await w3.eth.getBalance(address).then(function(bal){
        balance = Number(bal)
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // get token balance address
      let tokenAbi = JSON.parse(process.env.Abi)
      let contractAddress = process.env.ContractAddress
      var contractInstance = new w3.eth.Contract(tokenAbi, contractAddress, { from: address });
      await contractInstance.methods.balanceOf(address).call().then(function(val){
        token_balance = String(parseFloat(w3.utils.toWei(val, 'wei')) / 100000000)
        console.log('token balance>>>>>>>>>>>>>>>>>>>>>>: ', token_balance)
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
    default :
      // get deposit info
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
      await client.listTransactions().then(function(transactions){
        for(var i = 0; i < transactions.length; i++) {
          if( transactions[i].category == "receive" && transactions[i].confirmations > 0 ) {
            txns.push(transactions[i])
          }
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      if (txns.length > count) {
        value = txns[count].amount * 100000000
        hash = txns[count].txid
      }

      // get wallet info
      await client.getWalletInfo().then(function(walletInfo){
        balance = walletInfo.balance * 100000000
        new_address.final_transaction = walletInfo.txcount
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
  }

  if (value > 0) {
    // check duplicate transaction
    await Trans.countDocuments({ hash: hash, receiver: address, is_deposit: true }, function(err, ct){
      if (err) {
        re.errorResponse(err, res, 500)
        return
      }
      console.log('count transaction deposit true: ', ct)
      countTran = ct
    })

    if (countTran == 0) {
      // send notification to pms
      var requestBody = {}
      switch(coin) {
        case 'btc': 
          requestBody = {
            'u_wallet': address,
            'u_hash': hash,
            'user_id': userId,
            'u_coin': coin,
            'u_deposit': String(parseFloat(value) / 100000000)
          }
          break;
        case 'eth':
          requestBody = {
            'u_wallet': address,
            'u_hash': hash,
            'user_id': userId,
            'u_coin': coin,
            'u_deposit': w3.utils.fromWei(String(value), 'ether')
          }
          break;
        case 'dsn':
          console.log('token send noti')
          requestBody = {
            'u_wallet': address,
            'u_hash': hash,
            'user_id': userId,
            'u_coin': coin,
            'u_deposit': String(parseFloat(w3.utils.toWei(val, 'wei')) / 100000000)
          }
          break;
        default:
          requestBody = {
            'u_wallet': address,
            'u_hash': hash,
            'user_id': userId,
            'u_coin': coin,
            'u_deposit': String(parseFloat(value) / 100000000)
          }
          break;
      }

      const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      if (service == 'polebit') {
        await axios.post(process.env.PolebitNotificationURL, qs.stringify(requestBody), config)
        .then(function(noti){
          
        })
        .catch(function(err){
          re.errorResponse('cant_send_notification', res, 500);
          return
        })
      } else {
        await axios.post(process.env.GobitNotificationURL, qs.stringify(requestBody), config)
        .then(function(noti){
          
        })
        .catch(function(err){
          re.errorResponse('cant_send_notification', res, 500);
          return
        })
      }

      new_address.token_balance = token_balance
      new_address.balance = balance
      new_address.balance_string = String(balance)
      new_address.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

      // update address's balance
      await Addr.findOneAndUpdate({ addr: address }, new_address, function(err, add){
        if (err) {
          re.errorResponse('error_update_address', res, 500)
          return
        }
        if (add == null) {
          re.errorResponse('address_not_found', res, 500)
          return
        }
      });

      // save deposit to transaction
      trans._id = uuidv1()
      trans.hash = hash
      trans.receiver = address
      trans.coin_type = coin
      trans.service = service
      trans.total_exchanged = value
      trans.total_exchanged_string = String(value)
      trans.is_deposit = true
      trans.ctime = new Date().toISOString().replace('T', ' ').replace('Z', '')
      trans.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')
      if (includeBlock > 0 ) {
        trans.block_number = includeBlock
      }

      await trans.save(function(err){
        if (err) {
          re.errorResponse('error_create_transaction', res, 500)
          return
        }
      });

      console.log('create deposit', address)
    }
  }
  
}
