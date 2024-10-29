const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  discount_percentage: { type: Number, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  product_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // Changed to array
  is_active: { type: Boolean, default: true },
  image_url: { type: String }, 
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
