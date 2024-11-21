const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  verifyPayment,
  createGuestOrder,
  verifyGuestPayment
} = require('../controller/paymentController');

// Existing routes
router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyPayment);
router.post('/create-guest-order', createGuestOrder);

// Add this route - this was missing
router.post('/verify-guest-payment', verifyGuestPayment);

module.exports = router;