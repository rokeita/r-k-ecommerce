const express = require('express');
const { confirmPayment } = require('../controllers/paymentController');

const router = express.Router();

router.get('/confirm', confirmPayment);

module.exports = router;
