const Order = require('../models/Order');
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Payment = require('../models/Payment');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createRazorpayOrder = async (req, res) => {
  const { user_id, amount, currency } = req.body;

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

    const paymentOptions = {
      amount: amount * 100, // Amount in paise
      currency: currency || 'INR',
      receipt: `RECEIPT-${Date.now()}`,
      payment_capture: 1, // Auto capture
    };

    const paymentOrder = await razorpay.orders.create(paymentOptions);

    res.status(201).json({
      success: true,
      order_id: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, message: 'Error creating order', error: error.message });
  }
};

const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const user_id = req.user.id; // Assuming you have user authentication middleware

  try {
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== 'captured') {
      return res.status(400).json({ success: false, message: 'Payment not captured' });
    }

    // Create order
    const cart = await Cart.findOne({ user_id });
    const cartItems = await CartItem.find({ cart_id: cart._id }).populate('product_id');

    const orderItems = cartItems.map(item => ({
      product_id: item.product_id._id,
      product_name: item.product_id.name,
      quantity: item.quantity,
      price: item.product_id.price,
      total_price: item.product_id.price * item.quantity
    }));

    const order = new Order({
      user_id,
      order_no: `ORD-${Date.now()}`,
      order_status: 'Completed',
      total_amount: payment.amount / 100, // Convert back from paise to rupees
      items: orderItems
    });

    const savedOrder = await order.save();

    // Save payment details
    const paymentRecord = new Payment({
      user_id,
      order_id: savedOrder._id,
      razorpay_order_id,
      razorpay_payment_id,
      amount: payment.amount / 100,
      currency: payment.currency,
      payment_status: 'Successful',
      payment_method: 'Razorpay',
    });

    await paymentRecord.save();

    // Clear the cart
    await CartItem.deleteMany({ cart_id: cart._id });
    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified and order created successfully',
      order_id: savedOrder._id
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Error verifying payment', error: error.message });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
};