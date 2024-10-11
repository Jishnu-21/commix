const express = require('express');
const orderController = require('../controller/OrderController');
const authenticate = require('../middleware/Adminauth');

const router = express.Router();

// Create order from cart
router.post('/create', orderController.createOrderFromCart);                            
router.get('/history/:userId', orderController.getOrderHistory);
router.post('/verify', orderController.verifyPayment);


module.exports = router;