const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true }, // Add slug field
  description: { type: String },
  price: { type: Number, required: true },
  stock_quantity: { type: Number, required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: { type: String },
  image_urls: [{ type: String }],
  rating: { type: Number, default: 0.0 },
  discount_percentage: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  sales: { type: Number, default: 0 }
}, { timestamps: true });

// Pre-save middleware to generate slug from name
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);