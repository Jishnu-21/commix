const paymentController = require('../controller/paymentController');
const express = require('express');
const authenticate = require('../middleware/userAuth');
const router = express.Router();

// Create Razorpay order
router.post('/create', paymentController.createRazorpayOrder);

// Verify Razorpay payment
router.post('/verify',authenticate, paymentController.verifyPayment);                            

module.exports = router;