const express = require('express');
const orderController = require('../controller/OrderController');
const authenticate = require('../middleware/Adminauth');

const router = express.Router();

// Create order from cart
router.post('/cart-order', orderController.createOrderFromCart);                            

module.exports = router;