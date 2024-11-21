const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false
  },
  order_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true 
  },
  is_guest: {
    type: Boolean,
    default: false
  },
  guest_info: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  payment_method: { 
    type: String, 
    required: true 
  },
  payment_status: { 
    type: String, 
    required: true 
  },
  razorpay_order_id: { 
    type: String 
  },
  razorpay_payment_id: { 
    type: String 
  },
  transaction_id: { 
    type: String 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'INR' 
  }
}, { timestamps: true });

paymentSchema.pre('save', function(next) {
  if (!this.user_id && !this.is_guest) {
    next(new Error('Payment must have either user_id or guest information'));
  }
  if (this.is_guest && (!this.guest_info || !this.guest_info.email)) {
    next(new Error('Guest payment must include guest information'));
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);