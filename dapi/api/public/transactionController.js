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
  var feeValue = 20000000000 * 21000
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
          feeValue = gasPrice * 21000
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

      // let tokenAbi = [
      //   {
      //     "constant": false,
      //     "inputs": [
      //       {
      //         "name": "_to",
      //         "type": "address"
      //       },
      //       {
      //         "name": "_value",
      //         "type": "uint256"
      //       }
      //     ],
      //     "name": "transfer",
      //     "outputs": [
      //       {
      //         "name": "",
      //         "type": "bool"
      //       }
      //     ],
      //     "type": "function"
      //   }
      // ];

      //let tokenAbi = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newInvestorList","type":"address[]"},{"name":"releaseTime","type":"uint256"}],"name":"setLockFunds","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"pausedPublic","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_value","type":"uint256"}],"name":"burn","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getTime","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"pausedOwnerAdmin","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_account","type":"address"},{"name":"_amount","type":"uint256"}],"name":"burnFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"investorList","type":"address[]"}],"name":"removeLockFunds","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_value","type":"uint256"}],"name":"setTotalLockedTime","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totallockedtime","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"investor","type":"address"}],"name":"removeLockFund","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newPausedPublic","type":"bool"},{"name":"newPausedOwnerAdmin","type":"bool"}],"name":"pause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newInvestor","type":"address"},{"name":"releaseTime","type":"uint256"}],"name":"setLockFund","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"admin","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_totallockedtime","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_burner","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newState","type":"bool"}],"name":"PausePublic","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newState","type":"bool"}],"name":"PauseOwnerAdmin","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]

      let byteCode = '0x6060604052341561000c57fe5b5b6125a08061001c6000396000f300606060405236156101a95763ffffffff7c0100000000000000000000000000000000000000000000000000000000600035041663029a8bf781146102a357806306fdde03146102dc578063095ea7b31461036c5780630ba12c83146103ac5780630e6d1de9146103d057806314cba0021461040957806318160ddd146104ad57806323385089146104cf57806323b872dd1461050357806323de66511461054957806330599fc51461057d578063313ce567146105a4578063406838b3146105ca5780634bfaf2e8146106035780634dfe950d146106255780635b48684e146106495780636461fe391461066d57806370a08231146106f9578063733480b71461073457806377fe38a41461075e5780637bcdc2f0146107cc57806395d89b41146108135780639b487f3f146108a3578063a48a663c14610941578063a525f42c146109c7578063a66e6e5c14610a0a578063a883fb9014610a2c578063a9059cbb14610a65578063ac35caee14610aa5578063b2b45df514610b29578063c915fc9314610be7578063d4eec5a614610c24578063dd62ed3e14610c48578063fe8beb7114610c89575b6102a15b60006101b7610cdb565b73ffffffffffffffffffffffffffffffffffffffff1663db00b84834600036336000604051602001526040518563ffffffff167c010000000000000000000000000000000000000000000000000000000002815260040180806020018373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001828103825285858281815260200192508082843782019150509450505050506020604051808303818588803b151561027957fe5b6125ee5a03f1151561028757fe5b505050506040518051905090508060005260206000f35b50565b005b34156102ab57fe5b6102b3610cec565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b34156102e457fe5b6102ec610d09565b604080516020808252835181830152835191928392908301918501908083838215610332575b80518252602083111561033257601f199092019160209182019101610312565b505050905090810190601f16801561035e5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b341561037457fe5b61039873ffffffffffffffffffffffffffffffffffffffff60043516602435610db2565b604080519115158252519081900360200190f35b34156103b457fe5b610398610eb5565b604080519115158252519081900360200190f35b34156103d857fe5b6102b3610f4c565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b341561041157fe5b604080516020600460643581810135601f810184900484028501840190955284845261039894823573ffffffffffffffffffffffffffffffffffffffff9081169560248035909216956044359594608494929301919081908401838280828437509496505050923573ffffffffffffffffffffffffffffffffffffffff169250610f69915050565b604080519115158252519081900360200190f35b34156104b557fe5b6104bd6110ec565b60408051918252519081900360200190f35b34156104d757fe5b6102a173ffffffffffffffffffffffffffffffffffffffff60043581169060243516604435611181565b005b341561050b57fe5b61039873ffffffffffffffffffffffffffffffffffffffff60043581169060243516604435611212565b604080519115158252519081900360200190f35b341561055157fe5b6102a173ffffffffffffffffffffffffffffffffffffffff6004358116906024351660443561123a565b005b341561058557fe5b6103986004356112cb565b604080519115158252519081900360200190f35b34156105ac57fe5b6105b4611438565b6040805160ff9092168252519081900360200190f35b34156105d257fe5b6102b36114cd565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b341561060b57fe5b6104bd6114e9565b60408051918252519081900360200190f35b341561062d57fe5b6103986114f0565b604080519115158252519081900360200190f35b341561065157fe5b6103986115e9565b604080519115158252519081900360200190f35b341561067557fe5b604080516020600460643581810135601f810184900484028501840190955284845261039894823573ffffffffffffffffffffffffffffffffffffffff90811695602480359092169560443595946084949293019190819084018382808284375094965061163a95505050505050565b604080519115158252519081900360200190f35b341561070157fe5b6104bd73ffffffffffffffffffffffffffffffffffffffff600435166117ea565b60408051918252519081900360200190f35b341561073c57fe5b610398600435602435611888565b604080519115158252519081900360200190f35b341561076657fe5b604080516020600460443581810135601f81018490048402850184019095528484526103989482359460248035956064949293919092019181908401838280828437509496506118ae95505050505050565b604080519115158252519081900360200190f35b34156107d457fe5b61039873ffffffffffffffffffffffffffffffffffffffff6004358116906024359060443516611a05565b604080519115158252519081900360200190f35b341561081b57fe5b6102ec611afc565b604080516020808252835181830152835191928392908301918501908083838215610332575b80518252602083111561033257601f199092019160209182019101610312565b505050905090810190601f16801561035e5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b34156108ab57fe5b604080516020600460643581810135601f810184900484028501840190955284845261039894823573ffffffffffffffffffffffffffffffffffffffff1694602480359560443595946084949201919081908401838280828437509496505050923573ffffffffffffffffffffffffffffffffffffffff169250611ba8915050565b604080519115158252519081900360200190f35b341561094957fe5b604080516020600460643581810135601f810184900484028501840190955284845261039894823573ffffffffffffffffffffffffffffffffffffffff169460248035956044359594608494920191908190840183828082843750949650611d1f95505050505050565b604080519115158252519081900360200190f35b34156109cf57fe5b61039873ffffffffffffffffffffffffffffffffffffffff60043516602435604435611eab565b604080519115158252519081900360200190f35b3415610a1257fe5b6104bd611ed3565b60408051918252519081900360200190f35b3415610a3457fe5b6102b3611ed9565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b3415610a6d57fe5b61039873ffffffffffffffffffffffffffffffffffffffff60043516602435611ef6565b604080519115158252519081900360200190f35b3415610aad57fe5b604080516020600460443581810135601f810184900484028501840190955284845261039894823573ffffffffffffffffffffffffffffffffffffffff16946024803595606494929391909201918190840183828082843750949650611f1c95505050505050565b604080519115158252519081900360200190f35b3415610b3157fe5b60408051602060046024803582810135601f810185900485028601850190965285855261039895833573ffffffffffffffffffffffffffffffffffffffff16959394604494939290920191819084018382808284375050604080516020601f89358b0180359182018390048302840183019094528083529799988101979196509182019450925082915084018382808284375094965061209795505050505050565b604080519115158252519081900360200190f35b3415610bef57fe5b61039873ffffffffffffffffffffffffffffffffffffffff6004351661213e565b604080519115158252519081900360200190f35b3415610c2c57fe5b610398612311565b604080519115158252519081900360200190f35b3415610c5057fe5b6104bd73ffffffffffffffffffffffffffffffffffffffff600435811690602435166123a4565b60408051918252519081900360200190f35b3415610c9157fe5b6102b373ffffffffffffffffffffffffffffffffffffffff6004351661244b565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b6000610ce63361244b565b90505b90565b60005473ffffffffffffffffffffffffffffffffffffffff165b90565b600280546040805160206001841615610100027fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01909316849004601f81018490048402820184019092528181529291830182828015610daa5780601f10610d7f57610100808354040283529160200191610daa565b820191906000526020600020905b815481529060010190602001808311610d8d57829003601f168201915b505050505081565b6000610dbc610cdb565b73ffffffffffffffffffffffffffffffffffffffff1663e34f71378484336000604051602001526040518463ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018381526020018273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019350505050602060405180830381600087803b1515610e9757fe5b6102c65a03f11515610ea557fe5b5050604051519150505b92915050565b60055460009073ffffffffffffffffffffffffffffffffffffffff161515610edf57506000610ce9565b426203f480600654011115610ef657506000610ce9565b5060058054600480547fffffffffffffffffffffffff000000000000000000000000000000000000000090811673ffffffffffffffffffffffffffffffffffffffff841617909155169055600060065560015b90565b60045473ffffffffffffffffffffffffffffffffffffffff165b90565b6000813373ffffffffffffffffffffffffffffffffffffffff16610f8c8261244b565b73ffffffffffffffffffffffffffffffffffffffff1614156110e0576000805460015460408051602090810194909452517f161ff66200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8b8116600483019081528b82166024840152604483018b90526064830184905288821660a484015260c0608484019081528a5160c48501528a51929095169563161ff662958e958e958e9591948e948e949193919260e4019190860190808383821561107c575b80518252602083111561107c57601f19909201916020918201910161105c565b505050905090810190601f1680156110a85780820380516001836020036101000a031916815260200191505b50975050505050505050602060405180830381600087803b15156110c857fe5b6102c65a03f115156110d657fe5b5050604051519250505b5b5b5095945050505050565b6000805460015460408051602090810185905281517fb524abcf0000000000000000000000000000000000000000000000000000000081526004810193909352905173ffffffffffffffffffffffffffffffffffffffff9093169263b524abcf92602480820193929182900301818787803b151561116657fe5b6102c65a03f1151561117457fe5b5050604051519150505b90565b6000543373ffffffffffffffffffffffffffffffffffffffff9081169116141561120b578173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925836040518082815260200191505060405180910390a35b5b5b505050565b6000611230848484602060405190810160405280600081525061163a565b90505b9392505050565b6000543373ffffffffffffffffffffffffffffffffffffffff9081169116141561120b578173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040518082815260200191505060405180910390a35b5b5b505050565b6000805460015460408051602090810185905281517fe96b462a00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff338116600483015260248201949094529151929093169263e96b462a9260448084019382900301818787803b151561134c57fe5b6102c65a03f1151561135a57fe5b50506040515115905061143157604080516000602091820181905282517fac35caee00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff33811660048301526024820187905260606044830152600f60648301527f546f6b656e73207265636f76657279000000000000000000000000000000000060848301529351309094169363ac35caee9360a48084019491938390030190829087803b151561141957fe5b6102c65a03f1151561142757fe5b5050604051519150505b5b5b919050565b6000805460015460408051602090810185905281517fdc86e6f00000000000000000000000000000000000000000000000000000000081526004810193909352905173ffffffffffffffffffffffffffffffffffffffff9093169263dc86e6f092602480820193929182900301818787803b151561116657fe5b6102c65a03f1151561117457fe5b5050604051519150505b90565b60005473ffffffffffffffffffffffffffffffffffffffff1681565b6006545b90565b6000805460015460408051602090810185905281517fe96b462a00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff338116600483015260248201949094529151929093169263e96b462a9260448084019382900301818787803b151561157157fe5b6102c65a03f1151561157f57fe5b505060405151159050610ce95760055473ffffffffffffffffffffffffffffffffffffffff1615156115b357506000610ce9565b50600580547fffffffffffffffffffffffff0000000000000000000000000000000000000000169055600060065560015b5b5b90565b73ffffffffffffffffffffffffffffffffffffffff3316600090815260076020526040902080547fffffffffffffffffffffffff000000000000000000000000000000000000000016905560015b90565b6000611644610cdb565b73ffffffffffffffffffffffffffffffffffffffff1663cca9702586868686336000604051602001526040518663ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001848152602001806020018373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182810382528481815181526020019150805190602001908083836000831461177f575b80518252602083111561177f57601f19909201916020918201910161175f565b505050905090810190601f1680156117ab5780820380516001836020036101000a031916815260200191505b509650505050505050602060405180830381600087803b15156117ca57fe5b6102c65a03f115156117d857fe5b5050604051519150505b949350505050565b6000805460015460408051602090810185905281517f4d30b6be00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8781166004830152602482019490945291519290931692634d30b6be9260448084019382900301818787803b151561141957fe5b6102c65a03f1151561142757fe5b5050604051519150505b919050565b60006118a5838360206040519081016040528060008152506118ae565b90505b92915050565b60006118b8610cdb565b73ffffffffffffffffffffffffffffffffffffffff1663c10796df858585336000604051602001526040518563ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808560001916600019168152602001848152602001806020018373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182810382528481815181526020019150805190602001908083836000831461199c575b80518252602083111561199c57601f19909201916020918201910161197c565b505050905090810190601f1680156119c85780820380516001836020036101000a031916815260200191505b5095505050505050602060405180830381600087803b15156119e657fe5b6102c65a03f115156119f457fe5b5050604051519150505b9392505050565b6000813373ffffffffffffffffffffffffffffffffffffffff16611a288261244b565b73ffffffffffffffffffffffffffffffffffffffff161415611af2576000805460015460408051602090810185905281517f14712e2f00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8b81166004830152602482018b905260448201949094528884166064820152915192909316936314712e2f9360848084019491939192918390030190829087803b1515611ada57fe5b6102c65a03f11515611ae857fe5b5050604051519250505b5b5b509392505050565b6003805460408051602060026001851615610100027fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0190941693909304601f81018490048402820184019092528181529291830182828015610daa5780601f10610d7f57610100808354040283529160200191610daa565b820191906000526020600020905b815481529060010190602001808311610d8d57829003601f168201915b505050505081565b6000813373ffffffffffffffffffffffffffffffffffffffff16611bcb8261244b565b73ffffffffffffffffffffffffffffffffffffffff1614156110e0576000805460408051602090810193909352517fa69032ee00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8a811660048301908152602483018b9052604483018a9052878216608484015260a060648401908152895160a48501528951929094169463a69032ee948d948d948d948d948d949193919260c490920191908601908083838215611cb0575b805182526020831115611cb057601f199092019160209182019101611c90565b505050905090810190601f168015611cdc5780820380516001836020036101000a031916815260200191505b509650505050505050602060405180830381600087803b15156110c857fe5b6102c65a03f115156110d657fe5b5050604051519250505b5b5b5095945050505050565b6000611d29610cdb565b73ffffffffffffffffffffffffffffffffffffffff1663eb58705b86868686336000604051602001526040518663ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018560001916600019168152602001848152602001806020018373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182810382528481815181526020019150805190602001908083836000831461177f575b80518252602083111561177f57601f19909201916020918201910161175f565b505050905090810190601f1680156117ab5780820380516001836020036101000a031916815260200191505b509650505050505050602060405180830381600087803b15156117ca57fe5b6102c65a03f115156117d857fe5b5050604051519150505b949350505050565b60006112308484846020604051908101604052806000815250611d1f565b90505b9392505050565b60015481565b60055473ffffffffffffffffffffffffffffffffffffffff165b90565b60006118a583836020604051908101604052806000815250611f1c565b90505b92915050565b6000611f26610cdb565b73ffffffffffffffffffffffffffffffffffffffff16631962df71858585336000604051602001526040518563ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001848152602001806020018373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182810382528481815181526020019150805190602001908083836000831461199c575b80518252602083111561199c57601f19909201916020918201910161197c565b505050905090810190601f1680156119c85780820380516001836020036101000a031916815260200191505b5095505050505050602060405180830381600087803b15156119e657fe5b6102c65a03f115156119f457fe5b5050604051519150505b9392505050565b6000805473ffffffffffffffffffffffffffffffffffffffff16156120be57506000611233565b600080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff8616179055612107836124c9565b600155815161211d9060029060208501906124d4565b5082516121319060039060208601906124d4565b50600190505b9392505050565b6000805460015460408051602090810185905281517fe96b462a00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff338116600483015260248201949094529151929093169263e96b462a9260448084019382900301818787803b15156121bf57fe5b6102c65a03f115156121cd57fe5b5050604051511590506114315760055473ffffffffffffffffffffffffffffffffffffffff161561220057506000611431565b73ffffffffffffffffffffffffffffffffffffffff8216151561222557506000611431565b60045473ffffffffffffffffffffffffffffffffffffffff16151561228c5750600480547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff83161790556001611431565b6005805473ffffffffffffffffffffffffffffffffffffffff84167fffffffffffffffffffffffff000000000000000000000000000000000000000090911681179091554260065560408051918252517faf574319215a31df9b528258f1bdeef2b12b169dc85ff443a49373248c77493a9181900360200190a15060015b5b5b919050565b73ffffffffffffffffffffffffffffffffffffffff3381166000908152600760205260408120549091161561234857506000610ce9565b506004543373ffffffffffffffffffffffffffffffffffffffff908116600090815260076020526040902080547fffffffffffffffffffffffff0000000000000000000000000000000000000000169190921617905560015b90565b6000805460015460408051602090810185905281517f1c8d5d3800000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff88811660048301528781166024830152604482019490945291519290931692631c8d5d389260648084019382900301818787803b1515610e9757fe5b6102c65a03f11515610ea557fe5b5050604051519150505b92915050565b73ffffffffffffffffffffffffffffffffffffffff808216600090815260076020526040812054909116156124a75773ffffffffffffffffffffffffffffffffffffffff808316600090815260076020526040902054166124c1565b60045473ffffffffffffffffffffffffffffffffffffffff165b90505b919050565b60208101515b919050565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061251557805160ff1916838001178555612542565b82800160010185558215612542579182015b82811115612542578251825591602001919060010190612527565b5b5061254f929150612553565b5090565b610ce991905b8082111561254f5760008155600101612559565b5090565b905600a165627a7a7230582098e94b8b6bc6c305ad672235323039c0f64eae1b06a90d411d66a33af7ccf5060029'
      let tokenAbi = '[{"constant":true,"inputs":[],"name":"multiAsset","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"commitUpgrade","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"getLatestVersion","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"},{"name":"_reference","type":"string"},{"name":"_sender","type":"address"}],"name":"_forwardTransferFromWithReference","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"emitApprove","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"emitTransfer","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_value","type":"uint256"}],"name":"recoverTokens","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"etoken2","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"getPendingVersionTimestamp","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"purgeUpgrade","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"optIn","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"},{"name":"_reference","type":"string"}],"name":"transferFromWithReference","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_icap","type":"bytes32"},{"name":"_value","type":"uint256"}],"name":"transferToICAP","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_icap","type":"bytes32"},{"name":"_value","type":"uint256"},{"name":"_reference","type":"string"}],"name":"transferToICAPWithReference","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"},{"name":"_sender","type":"address"}],"name":"_forwardApprove","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_icap","type":"bytes32"},{"name":"_value","type":"uint256"},{"name":"_reference","type":"string"},{"name":"_sender","type":"address"}],"name":"_forwardTransferFromToICAPWithReference","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_icap","type":"bytes32"},{"name":"_value","type":"uint256"},{"name":"_reference","type":"string"}],"name":"transferFromToICAPWithReference","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_icap","type":"bytes32"},{"name":"_value","type":"uint256"}],"name":"transferFromToICAP","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"etoken2Symbol","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"getPendingVersion","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"},{"name":"_reference","type":"string"}],"name":"transferWithReference","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_etoken2","type":"address"},{"name":"_symbol","type":"string"},{"name":"_name","type":"string"}],"name":"init","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_newVersion","type":"address"}],"name":"proposeUpgrade","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"optOut","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_from","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_sender","type":"address"}],"name":"getVersionFor","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"payable":true,"type":"fallback"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newVersion","type":"address"}],"name":"UpgradeProposal","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"}]'
      let transactionObject = {};
    
      transactionObject = {
        from: sender,
        //value: w3.utils.toHex(senderBalance - feeValue),
        gas: w3.utils.toHex(21000),
        gasPrice: w3.utils.toHex(feeValue / 21000)
      }

      //let decimals = w3.utils.toBN();
      //let amount = w3.utils.toBN(100);
      //let valuesend = amount.mul(web3.utils.toBN(10).pow(decimals));

      //let contractAddress = "0xd0929d411954c47438dc1d871dd6081F5C5e149c";
      var contractInstance = new w3.eth.Contract(JSON.parse(tokenAbi), sender);

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

      // await contractInstance.methods.transfer(receiver, '10').send({ from: sender }).on('transactionHash', function(hash) {
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
        gasPrice: w3.utils.toHex(feeValue / 21000),
        gasLimit: w3.utils.toHex(21000),
        to: receiver,
        value: '0x00',
        data: contractInstance.methods.transfer(receiver, '10').encodeABI()
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
        trans.gas_limit = 21000
        trans.fees = feeValue
        trans.fees_string = feeValue.toFixed()
    
        transactionResult.data.tx_hash = trans.hash
      })
      .catch(function(err){
        re.errorResponse(err, res, 500);
        return
      });

      // let transactionObject = {};
    
      // transactionObject = {
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
