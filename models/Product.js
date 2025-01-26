const mongoose = require('mongoose');
const slugify = require('slugify');

const VARIANT_SIZES = ['50ml', '150ml', '250ml'];

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true },
  description: { type: String },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subcategory_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category.subcategories', index: true },
  functions: { type: String },
  ingredients: { type: String },
  hero_ingredients: { type: String },
  taglines: { type: String },   
  FAQs: [{ type: String }],
  additional_info: { type: String },
  variants: [{
    name: { 
      type: String, 
      required: true, 
      enum: VARIANT_SIZES,
      message: '{VALUE} is not a valid variant size'
    },
    price: { 
      type: Number, 
      required: true, 
      min: [0, 'Variant price cannot be negative'] 
    },
    stock_quantity: { 
      type: Number, 
      required: true, 
      min: [0, 'Variant stock cannot be negative'] 
    }
  }],
  image_urls: [{ type: String, default: [] }],
  rating: { type: Number, default: 0.0, min: 0, max: 5 },
  isBlocked: { type: Boolean, default: false },
  sales: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

// Only keep slug generation, remove hero ingredients validation
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
