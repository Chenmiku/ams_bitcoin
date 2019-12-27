'use strict';

const express = require('express');
const router = express.Router();
const addrKeyController = require('../api/public/addressKeyController');

router.get('/get_all', addrKeyController.list_all_addresskey)

module.exports = router