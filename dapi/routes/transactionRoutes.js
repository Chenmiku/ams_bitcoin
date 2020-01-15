'use strict';

const express = require('express');
const router = express.Router();
const transactionController = require('../api/public/transactionController');

router.get('/get_all', transactionController.list_all_transaction)
router.put('/deposit_state_by_address', transactionController.check_deposit_state)
router.put('/check_transaction', transactionController.check_transaction)
router.post('/send_to_bit', transactionController.create_a_transaction)

module.exports = router