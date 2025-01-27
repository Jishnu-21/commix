const mongoose = require('mongoose');
const slugify = require('slugify');

const VARIANT_SIZES = ['50ml', '150ml', '250ml','100ml','200ml','300ml','50mg','100mg','30ml'];

const productSchema = new mongoose.Schema({
  // Basic Product Information
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  slug: { 
    type: String, 
    unique: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  category_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true, 
    index: true 
  },
  subcategory_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category.subcategories', 
    index: true 
  },

  // Ingredients and Hero Ingredients
  ingredients: { 
    type: String, 
    required: true 
  },
  hero_ingredients: [{
    ingredient: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'HeroIngredient', 
      required: true 
    },
    description: { 
      type: String, 
      required: true 
    } // Product-specific description for the hero ingredient
  }],

  // Usage Instructions
  how_to_use: { 
    type: String, 
    required: true 
  },

  // Additional Product Details
  functions: { 
    type: String 
  },
  taglines: { 
    type: String 
  },
  faqs: [{ 
    question: { type: String, required: true }, 
    answer: { type: String, required: true } 
  }],
  additional_info: { 
    type: String 
  },

  // Variants (Sizes and Pricing)
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

  // Media
  image_urls: [{ 
    type: String, 
    default: [] 
  }],

  // Ratings and Sales
  rating: { 
    type: Number, 
    default: 0.0, 
    min: 0, 
    max: 5 
  },
  review_count: { 
    type: Number, 
    default: 0 
  },
  sales: { 
    type: Number, 
    default: 0, 
    min: 0 
  },

  // Status
  isBlocked: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

// Slug Generation
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
