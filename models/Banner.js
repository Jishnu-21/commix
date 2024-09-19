const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  image_url: { type: String, required: true },
  title: { type: String },
  description: { type: String },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
