const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true },
  username: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, },
  first_name: { type: String },
  last_name: { type: String },
  address: [{
    street: { type: String },
    house: { type: String },
    postcode: { type: String },
    location: { type: String },
    country: { type: String }
  }],
  phone_number: { type: String },
  profile_picture: { type: String },
  isBlocked: { type: Boolean, default: false },
  referral_code: { type: String },
  referral_balance: { type: Number, default: 0.0 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
