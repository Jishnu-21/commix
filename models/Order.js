const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  product_name: {
    type: String,
    required: true
  },
  variant_name: {
    type: String,
    required: true,
    enum: ['50ml', '150ml', '250ml']
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  total_price: {
    type: Number,
    required: true,
    min: 0
  },
  return_status: {
    type: String,
    enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
    default: 'none'
  },
  return_details: {
    request_type: {
      type: String,
      enum: ['return', 'replace'],
    },
    reason: {
      type: String,
      enum: ['damaged', 'wrong_item', 'not_as_described', 'defective', 'size_issue', 'other']
    },
    description: String,
    request_date: Date,
    status_update_date: Date
  }
});

const orderSchema = new mongoose.Schema({
  order_no: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return !this.is_guest; } // Only required for non-guest orders
  },
  is_guest: {
    type: Boolean,
    default: false
  },
  guest_info: {
    name: String,
    email: String,
    phone: String
  },
  items: [{
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    product_name: {
      type: String,
      required: true
    },
    variant_name: {
      type: String,
      default: '50ml'
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    total_price: {
      type: Number,
      required: true
    }
  }],
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  shipping_address: {
    street: { type: String, required: true },
    state: { type: String, required: true },
    house: { type: String, required: true },
    postcode: { type: String, required: true },
    location: { type: String, required: true },
    country: { type: String, required: true },
    phone_number: { type: String, required: true }
  },
  payment_status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  order_status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  tracking_number: {
    type: String
  },
  payment_method: {
    type: String,
    required: true,
    enum: ['razorpay', 'cod']
  },
  payment_details: {
    razorpay_order_id: String,
    razorpay_payment_id: String,
    razorpay_signature: String,
    payment_date: Date
  },
  razorpay_order_id: {
    type: String,
    required: function() {
      return this.payment_method === 'razorpay'; // Only required for Razorpay payments
    }
  }
}, { timestamps: true });

// Add an index on payment_status and createdAt for efficient cleanup
orderSchema.index({ payment_status: 1, createdAt: 1 });

module.exports = mongoose.model('Order', orderSchema);
