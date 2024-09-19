const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referred_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referral_code: { type: String, required: true },
  referral_bonus: { type: Number, default: 0.0 },
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema);
