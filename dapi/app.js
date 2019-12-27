// library
require('dotenv').config()

var express = require('express'),
  app = express(),
  cors = require('cors'),
  port = process.env.Port || 3000
  mongoose = require('mongoose'),
  Addr = require('./db/models/addressModel'),
  AddrKey = require('./db/models/addressKeyModel'),
  Transaction = require('./db/models/transactionModel'),
  bodyParser = require('body-parser');

// connect mongodbnode
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://' + process.env.DBHost + '/' + process.env.DBName, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
.then(() => console.log("Connected to DB"))
.catch(err => console.error("Couldn't connect to DB"))

// setting for bodyparser
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies
app.use(cors({ origin: '*' }));

// setting for cors
app.use(function(req, res, next){
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE, HEAD');
  res.header('Access-Control-Allow-Headers', 'Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', false);
  next()
})

// routes
var addrRoutes = require('./routes/addressRoutes');
app.use('/api/' + process.env.Version + '/public/address', addrRoutes);
var tranRoutes = require('./routes/transactionRoutes');
app.use('/api/' + process.env.Version + '/public/transaction', tranRoutes);
var addrKeyRoutes = require('./routes/addressKeyRoutes');
app.use('/api/' + process.env.Version + '/public/addresskey', addrKeyRoutes);

// middlewares
app.use(function(req, res) {
  res.status(404).send({url: req.originalUrl + ' not found'})
});

// listen
app.listen(process.env.Port)
console.log('API server started on: ' + port);