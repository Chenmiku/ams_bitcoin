'use strict';

const mongoose = require('mongoose'),
  AddrKey = mongoose.model('addresskeys')

exports.list_all_addresskey = async(req, res) => {
    await AddrKey.find({}, function(err, addresskey) {
      if (err)
        res.send(err);
      res.json(addresskey);
  }).sort({ ctime: 'descending' });
};