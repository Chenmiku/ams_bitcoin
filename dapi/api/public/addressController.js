'use strict';

// library and modules
require('dotenv').config()
const mongoose = require('mongoose'),
  uuidv1 = require('uuid/v1'),
  Addr = mongoose.model('addresses'),
  AddrKey = mongoose.model('addresskeys'),
  Wallet = mongoose.model('wallets'),
  randomString = require('randomstring'),
  url = require('url'),
  convert = require('../modules/convert_to_coin'),
  re = require('../modules/response'),
  bn = require('bignumber.js')

const Web3 = require('web3'),
      mainnet = process.env.Provider,
      w3 = new Web3(new Web3.providers.HttpProvider(mainnet))

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
  const walletName = randomString.generate(8)
  const backupFileName = walletName + '.dat';

  // check coin type
  switch(coinType) {
    case 'btc':
      coin = 'btc';       
      // create a new wallet
      await client.createWallet(walletName).then(function(res){
        if (res != null) {
          new_wallet.name = res.name
          new_wallet.file_backup = backupFileName
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // backup wallet	
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName });	
      console.log(client)
      await client.backupWallet(process.env.BitWallet + backupFileName).then(function(res){	
        new_wallet.file_backup = backupFileName	
      })	
      .catch(function(err){	
        re.errorResponse(err, res, 500);
        return	
      })

      // create a new address
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName });
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
      // Create a new address
      const account = w3.eth.accounts.create(w3.utils.randomHex(32))
      new_address.addr = account.address

      new_addresskey.addr = account.address
      new_addresskey.private_key = account.privateKey
      break;
    case '':
      coin = 'btc';       
      // create a new wallet
      await client.createWallet(walletName).then(function(res){
        if (res != null) {
          new_wallet.name = res.name
          new_wallet.file_backup = backupFileName
        }
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // backup wallet	
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName });	
      await client.backupWallet(process.env.BitWallet + backupFileName).then(function(res){	
        new_wallet.file_backup = backupFileName	
      })	
      .catch(function(err){	
        re.errorResponse(err, res, 500);	
        return	
      })

      // create a new address
      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName });
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

      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName}); //process.env.BitWallet + 'j0DKsFK1.dat'
      console.log(client)
      await client.getWalletInfo().then(function(res){
        new_address.balance = res.balance * 100000000
        new_address.balance_string = new_address.balance.toFixed()
        new_address.unconfirmed_balance = res.unconfirmed_balance * 100000000
        new_address.unconfirmed_balance_string = new_address.unconfirmed_balance.toFixed()
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
        console.log(bal)
        new_address.balance = Number(bal)
        new_address.balance_string = bal
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      break;
    default :
      coin = 'btc';
      // validate address
      await client.validateAddress(new_address.addr).then(function(res){
        if (res.isvalid == false) {
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

      client = new Client({ host: process.env.Host, port: process.env.BitPort, username: process.env.BitUser, password: process.env.BitPassword, wallet: walletName });
      await client.getWalletInfo().then(function(res){
        new_address.balance = res.balance * 100000000
        new_address.balance_string = new_address.balance.toFixed()
        new_address.unconfirmed_balance = res.unconfirmed_balance * 100000000
        new_address.unconfirmed_balance_string = new_address.unconfirmed_balance.toFixed()
        new_address.final_transaction = res.txcount
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });
      break;
  }

  new_address.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

  // update address- 
  await Addr.findOneAndUpdate({ addr: addr }, new_address, function(err, ad) {
    if (err) {
      re.errorResponse(err, res, 500);
      return
    }
    if (ad == null) {
      re.errorResponse('address_not_found', res, 404);
    } else {
      addressResult.data.addr = addr
      console.log(convert.convertToCoin(coin, ad.balance))
      addressResult.data.balance = convert.convertToCoin(coin, ad.balance).toFixed()
      addressResult.data.unconfirmed_balance = convert.convertToCoin(coin, ad.unconfirmed_balance).toFixed()
      addressResult.data.final_transaction = ad.final_transaction
      addressResult.data.coin_type = coin
      addressResult.data.user_id = ad.user_id || 0
      addressResult.data.ctime = ad.ctime
      addressResult.data.mtime = ad.mtime
      addressResult.success = true

      res.json(addressResult);
    }
  });
};
