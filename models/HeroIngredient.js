const mongoose = require('mongoose');

const heroIngredientSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  image_url: { 
    type: String, 
    required: true 
  },
  benefits: [{ 
    type: String 
  }],
  scientific_name: { 
    type: String 
  },
  source: { 
    type: String 
  }
}, { timestamps: true });

module.exports = mongoose.model('HeroIngredient', heroIngredientSchema); 