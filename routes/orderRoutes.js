const express = require('express');
const router = express.Router();

// Make sure this path matches your file structure exactly
const orderController = require('../controller/OrderController');  // Note: controller (not controllers)

// Create order from cart
router.post('/create', orderController.createOrderFromCart);                            
router.get('/history/:userId', orderController.getOrderHistory);
router.post('/verify', orderController.verifyPayment);
router.get('/', orderController.getAllOrders);
router.get('/invoice/:orderId', orderController.downloadInvoice);
router.post('/guest/create', orderController.createGuestOrder);

// Return request routes
router.post('/return-request', orderController.createReturnRequest);
router.put('/return-request/status', orderController.updateReturnRequestStatus);
router.get('/return-requests', orderController.getReturnRequests);

// Add these new routes
router.post('/guest-order', orderController.createGuestOrder);
router.post('/verify-guest-payment', orderController.verifyGuestPayment);

// Create COD order
router.post('/create-guest-cod-order', orderController.createGuestCodOrder);
router.post('/create-cod-order', orderController.createCodOrder);

module.exports = router;