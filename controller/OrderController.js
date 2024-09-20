const Order = require('../models/Order');
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Payment = require('../models/Payment');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const createOrderFromCart = async (req, res) => {
  const { user_id } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const cart = await Cart.findOne({ user_id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const cartItems = await CartItem.find({ cart_id: cart._id }).populate('product_id');
    if (!cartItems.length) {
      return res.status(404).json({ success: false, message: 'No items in cart' });
    }

    let totalAmount = cartItems.reduce((total, item) => total + (item.product_id.price * item.quantity), 0);

    const order_no = `ORD-${Date.now()}`;
    const order = new Order({
      user_id,
      order_no,
      order_status: 'Pending',
      total_amount: totalAmount,
    });

    const savedOrder = await order.save();

    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create a payment order
    const paymentOptions = {
      amount: totalAmount * 100, // Amount in paise
      currency: 'INR',
      receipt: order_no,
      payment_capture: 1, // Auto capture
    };

    const paymentOrder = await razorpay.orders.create(paymentOptions);

    // Save payment details in the database
    const payment = new Payment({
      user_id,
      order_id: savedOrder._id,
      razorpay_order_id: paymentOrder.id,
      amount: totalAmount,
      currency: 'INR',
      payment_status: 'Pending',
      payment_method: 'Razorpay',
    });

    await payment.save();

    // Clear the cart
    await CartItem.deleteMany({ cart_id: cart._id });
    cart.items = [];
    await cart.save();

    res.status(201).json({
      success: true,
      order_id: savedOrder._id,
      order_details: savedOrder,
      payment_order_id: paymentOrder.id,
    });
  } catch (error) {
    console.error('Error creating order from cart:', error);
    res.status(500).json({ success: false, message: 'Error creating order', error: error.message });
  }
};

module.exports = {
  createOrderFromCart,
};