const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Address Schema
const addressSchema = new mongoose.Schema({
  address_name: {
    type: String,
    enum: ['Home', 'Work', 'Office', 'Other'],
    default: 'Home'
  },
  street: { 
    type: String,
    required: true
  },
  state: { 
    type: String,
    required: true
  },
  house: { 
    type: String,
    required: true
  },
  postcode: { 
    type: String,
    required: true
  },
  location: { 
    type: String,
    required: true
  },
  country: { 
    type: String,
    required: true
  },
  phone_number: { 
    type: String,
    required: true
  },
  firstName: { 
    type: String,
    required: true
  },
  lastName: { 
    type: String,
    required: true
  }
}, { _id: true }); 

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  googleId: {
    type: String,
    default: undefined
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password is required only for local auth
    }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  profile_picture: String,
  first_name: String,
  last_name: String,
  address: [addressSchema], // Add the address array to the user schema
  isBlocked: {
    type: Boolean,
    default: false
  },
  referral_code: String,
  referral_balance: {
    type: Number,
    default: 0
  },
  emailVerified: {
    type: Boolean,
    default: false
  }
}, 
{
  timestamps: true
});

// Remove existing indexes
userSchema.index({ googleId: 1 }, { sparse: true });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Add a method to validate address
userSchema.methods.validateAddress = function(addressData) {
  const requiredFields = [
    'street', 'state', 'house', 'postcode', 
    'location', 'country', 'phone_number',
    'firstName', 'lastName'
  ];

  const missingFields = requiredFields.filter(field => !addressData[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  if (addressData.address_name && 
      !['Home', 'Work', 'Office', 'Other'].includes(addressData.address_name)) {
    throw new Error('Invalid address_name. Must be one of: Home, Work, Office, Other');
  }

  // Validate phone number format
  const phoneNumber = addressData.phone_number.replace(/\D/g, '');
  if (!/^\d{10}$/.test(phoneNumber)) {
    throw new Error('Phone number must be 10 digits');
  }

  return true;
};

const User = mongoose.model('User', userSchema);

module.exports = User;