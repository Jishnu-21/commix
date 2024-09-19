const express = require('express');
const router = express.Router();
const cartController = require('../controller/CartController');

// Add product to cart
router.post('/add-to-cart', cartController.addToCart);

// Remove product from cart
router.post('/remove-from-cart', cartController.removeFromCart);

// Delete entire cart
router.post('/delete-cart', cartController.deleteCart);

module.exports = router;
