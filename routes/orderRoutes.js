const express = require('express');
const orderController = require('../controller/OrderController');

const router = express.Router();

// Create order from cart
router.post('/create', orderController.createOrderFromCart);                            
router.get('/history/:userId', orderController.getOrderHistory);
router.post('/verify', orderController.verifyPayment);
router.get('/', orderController.getAllOrders);
router.get('/invoice/:orderId', orderController.downloadInvoice);



module.exports = router;