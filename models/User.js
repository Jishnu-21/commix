const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  first_name: { type: String },
  last_name: { type: String },
  address: { type: String },
  phone_number: { type: String },
  isBlocked: { type: Boolean, default: false },
  referral_code: { type: String },
  referral_balance: { type: Number, default: 0.0 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
