'use strict';

// library and modules
const mongoose = require('mongoose'),
  Addr = mongoose.model('addresses'),
  uuidv1 = require('uuid/v1'),
  AddrKey = mongoose.model('addresskeys'),
  randomString = require('randomstring'),
  url = require('url'),
  convert = require('../modules/convert_to_coin'),
  re = require('../modules/response'),
  bn = require('bignumber.js')

const Web3 = require('web3'),
      mainnet = process.env.Provider,
      w3 = new Web3(new Web3.providers.HttpProvider(mainnet))
// w3.eth.getNodeInfo().then(console.log)

const Client = require('bitcoin-core'),
      client = new Client({ host: '127.0.0.1', port: 8332, username: 'ams', password: 'ams@123456'})
      
      // const batch = [
      //   { method: 'getnewaddress', parameters: [] }
      // ]
       
      // client.command(batch).then((responses) => console.log(responses));

// variables
var coin = 'eth'

var addressResult = { 
  data: {
    addr: String,
    balance: String,
    unconfirmed_balance: String,
    final_balance: String,
    confirmed_transaction: Number,
    unconfirmed_transaction: Number,
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

  // check coin type
  switch(coinType) {
    case 'btc':
      coin = 'btc';       
      const walletName = randomString(5)
      await client.createWallet(walletName).then(function(res){
        console.log(res)
        
      }) 

      await client.getNewAddress().then(function(address){
        console.log(address)
        new_address.addr = address
        new_addresskey.addr = address
      });

      await client.validateAddress(new_address.addr).then(function(res){
        console.log(res)
        if (res.isvalid == false) {
          re.errorResponse('invalid_address', res, 500);
          return
        }
        new_addresskey.public_key = res.pubkey
      });

      await client.dumpPrivKey(new_address.addr).then(function(privKey){
        new_addresskey.private_key = privKey
      }); 
      
      break;
    case 'eth':
      coin = 'eth';
        // Create a new address
      const account = w3.eth.accounts.create(w3.utils.randomHex(32))
        // check valid address
      if (w3.utils.isAddress(account.address) == false) {
        re.errorResponse('invalid_address', res, 500);
        return
      }
      new_address.addr = account.address

      new_addresskey.addr = account.address
      //new_addresskey.public_key = account.publickey
      new_addresskey.private_key = account.privateKey
      break;
    case '':
      coin = 'btc';       
      await client.getNewAddress().then(function(address){
        console.log(address)
        new_address.addr = address
        new_addresskey.addr = address
      });

      await client.validateAddress(new_address.addr).then(function(res){
        console.log(res)
        if (res.isvalid == false) {
          re.errorResponse('invalid_address', res, 500);
          return
        }
        new_addresskey.public_key = res.pubkey
      });

      await client.dumpPrivKey(new_address.addr).then(function(privKey){
        new_addresskey.private_key = privKey
      });
      break;
  }

  new_address._id = uuidv1()
  new_address.balance = 0
  new_address.balance_string = "0"
  new_address.unconfirmed_balance = 0
  new_address.unconfirmed_balance_string = "0"
  new_address.final_balance = 0
  new_address.final_balance_string = "0"
  new_address.confirmed_transaction = 0
  new_address.unconfirmed_transaction = 0
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
      addressResult.data.final_balance = "0"
      addressResult.data.confirmed_transaction = "0"
      addressResult.data.final_balance = "0"
      addressResult.data.final_balance = "0"
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

  // check params
  if (addr == "") {
    re.errorResponse('address_empty', res, 400)
    return
  }

  // check valid address
  if (w3.utils.isAddress(addr) == false) {
    re.errorResponse('invalid_address', res, 500);
    return
  }

  // check coin type
  switch(coinType) {
    case 'btc':
      coin = 'btc';
      break;
    case 'eth':
      coin = 'eth';
      break;
    default :
      coin = 'btc';
      break;
  }

  //get transaction count
  // await web3.eth.getTransactionCount(addr).then(function(count){

  // })

  // const batch = [
  //   { method: 'getnewaddress', parameters: [] }
  // ]
   
  // await client.command(batch).then(function(response){
    
  // });

  //get balance address
  await w3.eth.getBalance(addr).then(function(bal){
    new_address.balance = bal
    new_address.balance_string = Number(bal).toFixed()
  })

  new_address.unconfirmed_balance = 0
  new_address.unconfirmed_balance_string = "0"
  new_address.final_balance = 0
  new_address.final_balance_string = "0"
  new_address.confirmed_transaction = 0
  new_address.unconfirmed_transaction = 0
  new_address.final_transaction = 0
  new_address.mtime = new Date().toISOString().replace('T', ' ').replace('Z', '')

  // update wallet 
  await Addr.findOneAndUpdate({ addr: addr }, new_address, function(err, ad) {
    if (err) {
      re.errorResponse(err, res, 500);
      return
    }
    if (ad == null) {
      re.errorResponse('address_not_found', res, 404);
    } else {
      addressResult.data.addr = addr
      addressResult.data.balance = convert.convertToCoin(coin, new_address.balance).toFixed()
      addressResult.data.final_balance = convert.convertToCoin(coin, new_address.final_balance).toFixed()
      addressResult.data.unconfirmed_balance = convert.convertToCoin(coin, new_address.unconfirmed_balance).toFixed()
      addressResult.data.confirmed_transaction = new_address.confirmed_transaction
      addressResult.data.unconfirmed_transaction = new_address.unconfirmed_transaction
      addressResult.data.final_transaction = new_address.final_transaction
      addressResult.data.coin_type = coin
      addressResult.data.user_id = ad.user_id || 0
      addressResult.data.ctime = ad.ctime
      addressResult.data.mtime = new_address.mtime
      addressResult.success = true

      res.json(addressResult);
    }
  });
};
