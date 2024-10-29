const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const addressSchema = new mongoose.Schema({
  street: { type: String },
  state: { type: String },
  house: { type: String },
  postcode: { type: String },
  location: { type: String },
  country: { type: String },
  phone_number: { type: String },
}, { _id: true }); 


const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true },
  username: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, },
  first_name: { type: String },
  last_name: { type: String },
  address: [addressSchema],
  phone_number: { type: String },
  profile_picture: { type: String },
  isBlocked: { type: Boolean, default: false },
  referral_code: { type: String },
  referral_balance: { type: Number, default: 0.0 },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
