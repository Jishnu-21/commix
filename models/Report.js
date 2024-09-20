const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
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
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'Reviewed', 'Resolved'],
    default: 'Pending'
  },
  reason: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);