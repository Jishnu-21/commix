const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const reviewSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product'
  },
  photo_urls: [{
    type: String,
  }],
  comment: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

reviewSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Review', reviewSchema);
