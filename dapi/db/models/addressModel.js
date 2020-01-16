'use strict'

var mongoose = require('mongoose')
var schema = mongoose.Schema

var addressSchema = new schema({
    _id: {
        type: String
    },
    addr: {
        type: String
    },
    entropy: {
        type: String
    },
    balance: {
        type: Number
    },
    balance_string: {
        type: String
    },
    unconfirmed_balance: {
        type: Number
    },
    unconfirmed_balance_string: {
        type: String
    },
    final_transaction: {
        type: Number
    },
    user_id: {
        type: Number
    },
    wallet_id: {
        type: String
    },
    wallet_name: {
        type: String
    },
    coin_type: {
        type: String
    },
    ctime: {
        type: String,
    }, 
    mtime: {
        type: String
    },
    dtime: {
        type: String
    }
}, {
    versionKey: false // remove __v
})

module.exports = mongoose.model('addresses', addressSchema)