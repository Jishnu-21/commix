const mongoose = require('mongoose');

const favouriteSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Favourite', favouriteSchema);
