'use strict';

const mongoose = require('mongoose'),
  Wallet = mongoose.model('wallets')

exports.list_all_wallet = async(req, res) => {
    await Wallet.find({}, function(err, wallet) {
      if (err)
        res.send(err);
      res.json(wallet);
  });
};