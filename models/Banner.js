const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  image_url: { type: String, required: true },
  title: { type: String },
  type: { 
    type: String, 
    enum: ['homepage', 'productpage'], 
    required: true 
  },
  description: { type: String },
  link: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);