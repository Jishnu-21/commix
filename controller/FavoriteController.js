const Favourite = require('../models/Favourite'); // Import the Favourite model
const Product = require('../models/Product'); // Import the Product model
const User = require('../models/User'); // Import the User model

// Create a Favorite
const createFavorite = async (req, res) => {
  try {
    const { user_id, product_id } = req.body;

    // Validate the input
    if (!user_id || !product_id) {
      return res.status(400).json({ success: false, message: 'User ID and Product ID are required' });
    }

    // Check if the product exists
    const productExists = await Product.findById(product_id);
    if (!productExists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if the favorite already exists
    const existingFavorite = await Favourite.findOne({ user_id, product_id });
    if (existingFavorite) {
      return res.status(409).json({ success: false, message: 'Product is already in favorites' });
    }

    // Create a new favorite
    const newFavorite = new Favourite({ user_id, product_id });
    await newFavorite.save();

    res.status(201).json({ success: true, message: 'Product added to favorites', favorite: newFavorite });
  } catch (error) {
    console.error('Error creating favorite:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


// Delete a Favorite
const deleteFavorite = async (req, res) => {
    try {
      const { user_id, product_id } = req.body;
  
      // Validate the input
      if (!user_id || !product_id) {
        return res.status(400).json({ success: false, message: 'User ID and Product ID are required' });
      }
  
      // Check if the favorite exists
      const favorite = await Favourite.findOneAndDelete({ user_id, product_id });
      if (!favorite) {
        return res.status(404).json({ success: false, message: 'Favorite not found' });
      }
  
      res.status(200).json({ success: true, message: 'Favorite deleted successfully' });
    } catch (error) {
      console.error('Error deleting favorite:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  };
  
  module.exports = {
    createFavorite,
    deleteFavorite,
  };
  