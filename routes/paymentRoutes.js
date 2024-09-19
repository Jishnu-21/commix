const paymentController = require('../controller/paymentController');
const express = require('express');
const router = express.Router();

// Create Razorpay order
router.post('/create-razorpay-order', paymentController.createRazorpayOrder);

// Verify Razorpay payment
router.post('/verify-razorpay-payment', paymentController.verifyRazorpayPayment);                            

module.exports = router;