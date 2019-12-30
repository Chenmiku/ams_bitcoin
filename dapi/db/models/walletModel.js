'use strict'

var mongoose = require('mongoose')
var schema = mongoose.Schema

var walletSchema = new schema({
    _id: {
        type: String
    },
    name: {
        type: String
    },
    file_backup: {
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

module.exports = mongoose.model('wallets', walletSchema)