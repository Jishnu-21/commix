const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order_no: { type: String, required: true },
  order_status: { type: String, required: true },
  total_amount: { type: Number, required: true },
  payment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  shipped_at: { type: Date },
  delivered_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
