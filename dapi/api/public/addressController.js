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
  qs = require('querystring')

// connect to ethereum node
const Web3 = require('web3'),
      mainnet = process.env.Provider,
      w3 = new Web3(new Web3.providers.HttpProvider(mainnet))

// connect to bitcoin node      
const Client = require('bitcoin-core')
var client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword })

// variables
var coin = 'eth'

var addressResult = { 
  data: {
    addr: String,
    balance: String,
    unconfirmed_balance: String,
    final_transaction: Number,
    coin_type: String,
    user_id: Number,
    ctime: String,
    mtime: String,
  },
  success: Boolean,
}

// api get all
exports.list_all_addresses = async(req, res) => {
    await Addr.find({}, function(err, address) {
      if (err)
        res.send(err);
      res.json(address);
  });
};

// api generate address
exports.create_a_address = async(req, res) => {
  const q = url.parse(req.url, true).query;
  const coinType = q.coin_type;
  const userId = q.user_id;
  var new_address = new Addr();
  var new_addresskey = new AddrKey();
  var new_wallet = new Wallet();
  var backupFileName = "";
  var walletName = ""

  // check coin type
  switch(coinType) {
    case 'btc':
      coin = 'btc';
      walletName = randomString.generate(8)
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
      walletName = randomString.generate(8)
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
  new_address.ctime = new Date().toISOString().replace('T', ' ').replace('Z', '')
  new_address.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

  new_addresskey._id = uuidv1()
  new_addresskey.coin_type = coin
  new_addresskey.ctime = new Date().toISOString().replace('T', ' ').replace('Z', '')
  new_addresskey.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

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
  console.log(coin)
  console.log(new_address.addr)
  console.log(walletName)

  const intervalObj = setInterval(() => {
    checkDeposit(coin, addressResult.data.addr, walletName, 0, intervalObj, res)
  }, 3000); 

};

// Api get By address
exports.get_a_address = async(req, res) => {
  const q = url.parse(req.url, true).query;
  const coinType = q.coin_type;
  const addr = q.addr
  var new_address = new Addr()
  var walletName = ""

  // check params
  if (addr == "") {
    re.errorResponse('address_empty', res, 400)
    return
  }

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
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      addressResult.data.balance =  String(parseFloat(new_address.balance_string) / 100000000)
      addressResult.data.unconfirmed_balance = String(parseFloat(new_address.unconfirmed_balance_string) / 100000000)

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
        new_address.balance_string = bal
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      addressResult.data.balance = w3.utils.fromWei(new_address.balance_string, 'ether');
      addressResult.data.unconfirmed_balance = 0

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
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      addressResult.data.balance =  String(parseFloat(new_address.balance_string) / 100000000)
      addressResult.data.unconfirmed_balance = String(parseFloat(new_address.unconfirmed_balance_string) / 100000000)

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
async function checkDeposit(coin,address,walletName,preBalance,intervalObject,res) {
  console.log('run')
  var balance = 0
  var trans = new Trans()
  var new_address = new Addr()
  // check coin type
  switch(coin) {
    case 'btc':
      // validate address
      await client.validateAddress(addr).then(function(validate){
        if (validate.isvalid == false) {
          //re.errorResponse('invalid_address', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // get wallet info
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
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
      // check valid address
      if (w3.utils.isAddress(addr) == false) {
        //re.errorResponse('invalid_address', res, 500);
        return
      }

      //get balance address
      await w3.eth.getBalance(address).then(function(bal){
        balance = Number(bal)
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
    default :
      // validate address
      await client.validateAddress(addr).then(function(validate){
        if (validate.isvalid == false) {
          //re.errorResponse('invalid_address', res, 500);
          return
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // get wallet info
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName});
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

  if (balance > preBalance) {
    // stop interval 
    clearInterval(intervalObject)
    // send notification to pms
    var requestBody = {}
    switch(coin) {
      case 'btc': 
        requestBody = {
          'u_wallet': address,
          'u_coin': coin,
          'u_deposit': String(parseFloat(balance - preBalance) / 100000000)
        }
        break;
      case 'eth':
        requestBody = {
          'u_wallet': address,
          'u_coin': coin,
          'u_deposit': w3.utils.fromWei(String(balance - preBalance), 'ether')
        }
        break;
      default:
        requestBody = {
          'u_wallet': address,
          'u_coin': coin,
          'u_deposit': String(parseFloat(balance - preBalance) / 100000000)
        }
        break;
    }

    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }

    await axios.post(process.env.NotificationURL, qs.stringify(requestBody), config)
    .then(function(noti){
    	
    })
    .catch(function(err){
    	re.errorResponse('cant_send_notification', res, 500);
      return
    });

    new_address.balance = balance - preBalance
    new_address.balance_string = String(balance - preBalance)
    new_address.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')
    // update address's balance
    await Addr.findOneAndUpdate({ addr: address }, new_address, function(err, add){
      if (err) {
        re.errorResponse('error_update_transaction', res, 500)
        return
      }
      if (add == null) {
        re.errorResponse('address_not_found', res, 500)
        return
      }
    });

    // save deposit to transaction
    trans._id = uuidv1()
    trans.sender = address
    trans.coin_type = coin
    trans.total_exchanged = balance - preBalance
    trans.total_exchanged_string = String(trans.total_exchanged)
    trans.is_deposit = true
    trans.ctime = new Date().toISOString().replace('T', ' ').replace('Z', '')
    trans.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

    await trans.save(function(err){
      if (err) {
        re.errorResponse('error_create_transaction', res, 500)
        return
      }
    });

    console.log('create deposit', address)
  }

}
