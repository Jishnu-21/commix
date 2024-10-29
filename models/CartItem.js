const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  cart_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variant_name: { 
    type: String, 
    required: true,
    enum: ['50ml', '150ml', '250ml'] // Add enum to ensure valid variant names
  },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  total_price: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('CartItem', cartItemSchema);
