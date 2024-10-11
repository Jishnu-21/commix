const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  product_name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }, // Added validation to ensure quantity is at least 1
  price: { type: Number, required: true },
  total_price: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order_no: { type: String, required: true, unique: true },
  order_status: {
    type: String,
    required: true,
    enum: ['Pending', 'Completed', 'Cancelled', 'Shipped'], // Added enum for predefined statuses
    default: 'Pending'
  },
  total_amount: { type: Number, required: true },
  items: [orderItemSchema],
}, { timestamps: true }); // Added automatic timestamps (createdAt and updatedAt)

module.exports = mongoose.model('Order', orderSchema);
