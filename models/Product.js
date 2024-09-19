const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  stock_quantity: { type: Number, required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: { type: String },
  image_url: { type: String, required: true }, 
  rating: { type: Number, default: 0.0 },
  discount_percentage: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
