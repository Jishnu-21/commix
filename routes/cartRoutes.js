const express = require('express');
const router = express.Router();
const cartController = require('../controller/CartController');

// Add product to cart
router.post('/add', cartController.addToCart);

// Remove product from cart
router.post('/remove', cartController.removeFromCart);

// Delete entire cart
router.post('/delete-cart', cartController.deleteCart);
router.get('/:user_id', cartController.getCart);

router.put('/update-quantity', cartController.updateCartItemQuantity);

module.exports = router;
