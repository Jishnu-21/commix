const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  userIp: { type: String, required: true },
  userAgent: { type: String, required: true },
  visitedAt: { type: Date, default: Date.now }
});

const productVisitSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  visits: [visitSchema]
});

const ProductVisit = mongoose.model('ProductVisit', productVisitSchema);

module.exports = ProductVisit;