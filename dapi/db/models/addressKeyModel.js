'use strict'

var mongoose = require('mongoose')
var schema = mongoose.Schema

var addressKeySchema = new schema({
    _id: {
        type: String
    },
    addr: {
        type: String
    },
    public_key: {
        type: String
    },
    private_key: {
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

module.exports = mongoose.model('addresskeys', addressKeySchema)