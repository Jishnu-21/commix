const express = require('express');
const router = express.Router();
const cartController = require('../controller/CartController');

// Get user's cart
router.get('/:userId', cartController.getCart);

// Add product to cart
router.post('/add', cartController.addToCart);

// Remove product from cart
router.post('/remove', cartController.removeFromCart);

// Delete entire cart
router.delete('/:userId', cartController.deleteCart);

// Update cart item quantity
router.put('/update-quantity', cartController.updateCartItemQuantity);

module.exports = router;