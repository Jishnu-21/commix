const Banner = require('../models/Banner'); // Import the Banner model
const Product = require('../models/Product'); // Import the Product model (if needed)

// Create a new banner
const createBanner = async (req, res) => {
  try {
    const { image_url, title, description, product_id } = req.body;

    // Validate the input
    if (!image_url) {
      return res.status(400).json({ success: false, message: 'Image URL is required' });
    }

    // Check if the product exists (optional)
    if (product_id) {
      const productExists = await Product.findById(product_id);
      if (!productExists) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
    }

    // Create a new banner
    const newBanner = new Banner({ image_url, title, description, product_id });
    await newBanner.save();

    res.status(201).json({ success: true, message: 'Banner created successfully', banner: newBanner });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all banners
const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find();
    res.status(200).json({ success: true, banners });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get a single banner by ID
const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    res.status(200).json({ success: true, banner });
  } catch (error) {
    console.error('Error fetching banner:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update a banner by ID
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url, title, description, product_id } = req.body;

    // Update the banner
    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      { image_url, title, description, product_id },
      { new: true, runValidators: true } // Return the updated document and validate
    );

    if (!updatedBanner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    res.status(200).json({ success: true, message: 'Banner updated successfully', banner: updatedBanner });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete a banner by ID
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBanner = await Banner.findByIdAndDelete(id);

    if (!deletedBanner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    res.status(200).json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  createBanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
};
