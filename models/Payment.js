const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  payment_method: { type: String, required: true },
  payment_status: { type: String, required: true },
  razorpay_order_id: { type: String }, // Add this to store the Razorpay order ID
  razorpay_payment_id: { type: String }, // Add this to store the Razorpay payment ID
  transaction_id: { type: String }, // Used for successful transactions
  amount: { type: Number, required: true },
  payment_method: { // Add this field
    type: String,
    required: true // Ensure this is required
  },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
