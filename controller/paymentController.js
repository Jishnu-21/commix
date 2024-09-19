const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment'); // Your payment model
const Order = require('../models/Order'); // Your order model
require('dotenv').config();

// Initialize Razorpay instance with API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay Payment Order
const createRazorpayOrder = async (req, res) => {
    try {
      const { user_id, order_id, amount, currency } = req.body;
  
      // Validate required fields
      if (!user_id || !order_id || !amount) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
  
      const order = await Order.findById(order_id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      const payment_capture = 1; // Auto capture payment
      const razorpayOptions = {
        amount: amount * 100,
        currency: currency || 'INR',
        receipt: `receipt_order_${order_id}`,
        payment_capture,
      };
  
      const razorpayOrder = await razorpay.orders.create(razorpayOptions);
  
      const payment = new Payment({
        user_id,
        order_id,
        payment_method: 'razorpay',
        payment_status: 'Pending',
        razorpay_order_id: razorpayOrder.id,
        amount,
        currency: razorpayOrder.currency,
      });
  
      await payment.save();
  
      res.status(201).json({
        success: true,
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        payment_id: payment._id,
      });
    } catch (error) {
      console.error('Error in creating Razorpay order:', error);
      res.status(500).json({ success: false, message: 'Error creating Razorpay order', error: error.message });
    }
  };
  

// Verify Razorpay Payment Signature
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Generate expected signature using the key_secret
    const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Verify the signature
    if (generatedSignature === razorpay_signature) {
      // Payment verified, update the status in DB
      const payment = await Payment.findOneAndUpdate(
        { razorpay_order_id },
        { payment_status: 'Paid', transaction_id: razorpay_payment_id },
        { new: true }
      );

      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      res.status(200).json({ success: true, message: 'Payment verified successfully!', payment });
    } else {
      // Payment verification failed
      res.status(400).json({ success: false, message: 'Invalid Razorpay signature' });
    }
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ success: false, message: 'Error verifying payment', error: error.message });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
};
