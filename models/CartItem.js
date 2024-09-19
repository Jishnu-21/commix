const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  cart_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('CartItem', cartItemSchema);
