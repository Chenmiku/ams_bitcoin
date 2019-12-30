'use strict';

const express = require('express');
const router = express.Router();
const walletController = require('../api/public/walletController');

router.get('/get_all', walletController.list_all_wallet)

module.exports = router