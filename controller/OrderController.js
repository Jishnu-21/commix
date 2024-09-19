const Order = require('../models/Order'); // Your order model
const Cart = require('../models/Cart'); // Your cart model
const CartItem = require('../models/CartItem'); // Your cart item model
const Payment = require('../models/Payment'); // Your payment model

const createOrderFromCart = async (req, res) => {
    const { user_id } = req.body;
  
    try {
      const cart = await Cart.findOne({ user_id });
      if (!cart) {
        return res.status(404).json({ success: false, message: 'Cart not found' });
      }
  
      const cartItems = await CartItem.find({ cart_id: cart._id }).populate('product_id');
      if (!cartItems.length) {
        return res.status(404).json({ success: false, message: 'No items in cart' });
      }
  
      let totalAmount = 0;
      cartItems.forEach(item => {
        totalAmount += item.product_id.price * item.quantity;
      });
  
      const order_no = `ORD-${Date.now()}`;
      const order = new Order({
        user_id,
        order_no,
        order_status: 'Pending',
        total_amount: totalAmount,
      });
  
      const savedOrder = await order.save();
  
      res.status(201).json({
        success: true,
        order_id: savedOrder._id,
        order_details: savedOrder,
      });
    } catch (error) {
      console.error('Error creating order from cart:', error);
      res.status(500).json({ success: false, message: 'Error creating order', error: error.message });
    }
  };
  
  module.exports = {
    createOrderFromCart,
  };
  