const Banner = require('../models/Banner');
const cloudinary = require('../config/cloudinary');

// Create a new banner
const createBanner = async (req, res) => {
  try {
    const { title, description, link, type } = req.body;

    console.log('Request body:', req.body);
    console.log('File:', req.file);

    // Check if the banner type is valid
    if (!['homepage', 'productpage'].includes(type)) {
      return res.status(400).json({ message: 'Invalid banner type' });
    }

    // Check the number of existing banners for the given type
    const existingBannersCount = await Banner.countDocuments({ type });
    if (type === 'homepage' && existingBannersCount >= 3) {
      return res.status(400).json({ message: 'Maximum number of homepage banners (3) reached' });
    } else if (type === 'productpage' && existingBannersCount >= 1) {
      return res.status(400).json({ message: 'Maximum number of product page banners (1) reached' });
    }

    let image_url = '';

    // Check if file is present
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto', folder: 'banners' },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                console.log('Cloudinary upload result:', result);
                resolve(result);
              }
            }
          );
          uploadStream.end(req.file.buffer);
        });
        image_url = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading file to Cloudinary:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image' });
      }
    } else {
      console.log('No file was uploaded');
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const newBanner = new Banner({
      image_url,
      title,
      description,
      link,
      type,
    });

    const savedBanner = await newBanner.save();
    console.log('Saved banner:', savedBanner);

    res.status(201).json({ message: 'Banner created successfully', banner: savedBanner });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

// Get banners by type
const getBannersByType = async (req, res) => {
  try {
    const { type } = req.params;
    if (!['homepage', 'productpage'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid banner type' });
    }
    const banners = await Banner.find({ type });
    res.status(200).json({ success: true, banners });
  } catch (error) {
    console.error('Error fetching banners by type:', error);
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
    const { title, description, link } = req.body;

    let updateData = { title, description, link };

    // Check if a new image is uploaded
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto', folder: 'banners' },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                console.log('Cloudinary upload result:', result);
                resolve(result);
              }
            }
          );
          uploadStream.end(req.file.buffer);
        });
        updateData.image_url = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading file to Cloudinary:', uploadError);
        return res.status(500).json({ message: 'Failed to upload new image' });
      }
    }

    const updatedBanner = await Banner.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

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

    // Delete the image from Cloudinary
    if (deletedBanner.image_url) {
      const publicId = deletedBanner.image_url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
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
  getBannersByType,
  getBannerById,
  updateBanner,
  deleteBanner,
};
