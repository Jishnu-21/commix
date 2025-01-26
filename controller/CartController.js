const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get Cart
exports.getCart = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user_id: userId });
    if (!cart) {
      return res.status(200).json({ 
        cartItems: [],
        totalPrice: 0,
        message: 'Cart is empty'
      });
    }

    // Get cart items with product details
    const cartItems = await CartItem.find({ cart_id: cart._id })
      .populate({
        path: 'product_id',
        select: 'name image_urls variants description'
      });

    // Calculate total price
    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Format cart items for response
    const formattedCartItems = cartItems.map(item => ({
      product_id: item.product_id,
      variant_name: item.variant_name,
      quantity: item.quantity,
      price: item.price,
      total_price: item.price * item.quantity
    }));

    res.status(200).json({
      cartItems: formattedCartItems,
      totalPrice,
      message: 'Cart retrieved successfully'
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ 
      message: 'Failed to get cart', 
      error: error.message 
    });
  }
};

// Add to Cart
exports.addToCart = async (req, res) => {
  try {
    const { user_id, product_id, variant_name, quantity } = req.body;

    if (!user_id || !product_id || !variant_name || !quantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user_id });
    if (!cart) {
      cart = await Cart.create({ user_id });
    }

    // Find product and validate variant
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const variant = product.variants.find(v => v.name === variant_name);
    if (!variant) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    // Check stock
    if (variant.stock_quantity < quantity) {
      return res.status(400).json({ 
        message: 'Not enough stock',
        available: variant.stock_quantity 
      });
    }

    // Find existing cart item or create new one
    let cartItem = await CartItem.findOne({
      cart_id: cart._id,
      product_id,
      variant_name
    });

    if (cartItem) {
      cartItem.quantity = quantity;
      cartItem.price = variant.price;
      cartItem.total_price = quantity * variant.price;
      await cartItem.save();
    } else {
      cartItem = await CartItem.create({
        cart_id: cart._id,
        product_id,
        variant_name,
        quantity,
        price: variant.price,
        total_price: quantity * variant.price
      });
    }

    // Get updated cart item with product details
    const updatedCartItem = await CartItem.findById(cartItem._id)
      .populate({
        path: 'product_id',
        select: 'name image_urls variants description'
      });

    res.status(200).json({
      message: 'Product added to cart successfully',
      cartItem: updatedCartItem
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ 
      message: 'Failed to add to cart',
      error: error.message 
    });
  }
};

// Remove from Cart
exports.removeFromCart = async (req, res) => {
  try {
    const { user_id, product_id, variant_name } = req.body;

    if (!user_id || !product_id || !variant_name) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find cart
    const cart = await Cart.findOne({ user_id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Remove item
    const result = await CartItem.findOneAndDelete({
      cart_id: cart._id,
      product_id,
      variant_name
    });

    if (!result) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    res.status(200).json({ 
      message: 'Item removed from cart successfully'
    });

  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ 
      message: 'Failed to remove from cart',
      error: error.message 
    });
  }
};

// Update Cart Item Quantity
exports.updateCartItemQuantity = async (req, res) => {
  try {
    const { user_id, product_id, variant_name, quantity } = req.body;

    if (!user_id || !product_id || !variant_name || !quantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find cart
    const cart = await Cart.findOne({ user_id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find product and validate variant
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const variant = product.variants.find(v => v.name === variant_name);
    if (!variant) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    // Check stock
    if (variant.stock_quantity < quantity) {
      return res.status(400).json({ 
        message: 'Not enough stock',
        available: variant.stock_quantity 
      });
    }

    // Update cart item
    const cartItem = await CartItem.findOne({
      cart_id: cart._id,
      product_id,
      variant_name
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    cartItem.quantity = quantity;
    cartItem.price = variant.price;
    cartItem.total_price = quantity * variant.price;
    await cartItem.save();

    // Get updated cart item with product details
    const updatedCartItem = await CartItem.findById(cartItem._id)
      .populate({
        path: 'product_id',
        select: 'name image_urls variants description'
      });

    res.status(200).json({
      message: 'Quantity updated successfully',
      cartItem: updatedCartItem
    });

  } catch (error) {
    console.error('Update quantity error:', error);
    res.status(500).json({ 
      message: 'Failed to update quantity',
      error: error.message 
    });
  }
};

// Delete Cart
exports.deleteCart = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Delete cart and its items
    const cart = await Cart.findOne({ user_id: userId });
    if (cart) {
      await CartItem.deleteMany({ cart_id: cart._id });
      await Cart.deleteOne({ _id: cart._id });
    }

    res.status(200).json({ message: 'Cart deleted successfully' });
  } catch (error) {
    console.error('Delete cart error:', error);
    res.status(500).json({ 
      message: 'Failed to delete cart',
      error: error.message 
    });
  }
};
