const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true },
  description: { type: String },
  price: { type: Number, required: true, min: [0, 'Price cannot be negative'] }, // Added min validation
  stock_quantity: { type: Number, required: true, min: [0, 'Stock cannot be negative'] }, // Added min validation
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true }, // Added index
  brand: { type: String },
  image_urls: [{ type: String, default: [] }], // Ensuring an empty array by default
  rating: { type: Number, default: 0.0, min: 0, max: 5 }, // Ensured rating between 0 and 5
  discount_percentage: { type: Number, default: 0, min: 0, max: 100 }, // Ensured discount between 0 and 100
  isBlocked: { type: Boolean, default: true },
  sales: { type: Number, default: 0, min: 0 }, // Prevent negative sales numbers
}, { timestamps: true });

// Pre-save middleware to generate slug from name
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
