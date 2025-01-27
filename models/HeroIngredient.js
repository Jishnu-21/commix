const mongoose = require('mongoose');

const heroIngredientSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  descriptions: [{ 
    type: String, 
    required: true 
  }],
  image_url: { 
    type: String, 
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HeroIngredient', heroIngredientSchema);