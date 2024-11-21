const Offer = require('../models/Offer');
const { validationResult } = require('express-validator');
const cloudinary = require('../config/cloudinary'); // Make sure this path is correct

// Add a new offer
exports.addOffer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, discount_percentage, start_date, end_date, product_ids } = req.body;

    // Parse product_ids
    let parsedProductIds;
    try {
      parsedProductIds = JSON.parse(product_ids);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid product_ids format' });
    }

    // Handle 'all' option
    if (parsedProductIds.includes('all')) {
      parsedProductIds = []; // or null, depending on how you want to represent "all products"
    } else {
      // Filter out any non-ObjectId values
      parsedProductIds = parsedProductIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    }

    // Convert dates to Date objects
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Check if end date is before start date
    if (endDate <= startDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    let image_url = '';

    // Upload image to Cloudinary if provided
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'offers' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      image_url = result.secure_url;
    }

    const offer = new Offer({
      title,
      description,
      discount_percentage,
      start_date: startDate,
      end_date: endDate,
      product_ids: parsedProductIds,
      image_url
    });

    await offer.save();
    res.status(201).json({ message: 'Offer added successfully', offer });
  } catch (error) {
    console.error('Error adding offer:', error);
    res.status(500).json({ message: 'Server error while adding offer' });
  }
};

// Edit an offer
exports.editOffer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { offerId } = req.params;
    const { title, description, discount_percentage, start_date, end_date, product_ids, is_active } = req.body;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Convert dates to Date objects if provided
    const startDate = start_date ? new Date(start_date) : offer.start_date;
    const endDate = end_date ? new Date(end_date) : offer.end_date;

    // Check if end date is before start date
    if (endDate <= startDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Upload new image to Cloudinary if provided
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'offers' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      offer.image_url = result.secure_url;
    }

    let parsedProductIds;
    if (product_ids) {
      try {
        parsedProductIds = JSON.parse(product_ids);
        if (parsedProductIds.includes('all')) {
          parsedProductIds = []; // or null
        } else {
          parsedProductIds = parsedProductIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        }
      } catch (error) {
        return res.status(400).json({ message: 'Invalid product_ids format' });
      }
    }

    offer.title = title || offer.title;
    offer.description = description || offer.description;
    offer.discount_percentage = discount_percentage || offer.discount_percentage;
    offer.start_date = startDate;
    offer.end_date = endDate;
    offer.product_ids = parsedProductIds || offer.product_ids;
    offer.is_active = is_active !== undefined ? is_active : offer.is_active;

    await offer.save();
    res.json({ message: 'Offer updated successfully', offer });
  } catch (error) {
    console.error('Error editing offer:', error);
    res.status(500).json({ message: 'Server error while editing offer' });
  }
};

// Delete an offer
exports.deleteOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Delete image from Cloudinary if it exists
    if (offer.image_url) {
      const publicId = offer.image_url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await Offer.findByIdAndDelete(offerId);
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ message: 'Server error while deleting offer' });
  }
};

// Get all offers
exports.getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().populate('product_ids', 'name price');
    res.json({ offers });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ message: 'Server error while fetching offers' });
  }
};


exports.getActiveOffers = async (req, res) => {
  try {
    const currentDate = new Date();

    const offers = await Offer.find({
      is_active: true,
      start_date: { $lte: currentDate },
      end_date: { $gte: currentDate }
    }).populate('product_ids', 'name price');

    res.status(200).json({ offers });
  } catch (error) {
    console.error('Error fetching active offers:', error);
    res.status(500).json({ message: 'Error fetching active offers', error: error.message });
  }
};


exports.applyOffer = async (req, res) => {
  try {
    const { offerId, cartTotal } = req.body;

    // Find the offer
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Check if the offer is active and within the valid date range
    const currentDate = new Date();
    if (!offer.is_active || currentDate < offer.start_date || currentDate > offer.end_date) {
      return res.status(400).json({ message: 'Offer is not active or has expired' });
    }

    // Calculate the discount
    const discountAmount = (cartTotal * offer.discount_percentage) / 100;
    const discountedTotal = cartTotal - discountAmount;

    res.status(200).json({
      success: true,
      offer: {
        id: offer._id,
        title: offer.title,
        discountPercentage: offer.discount_percentage,
        discountAmount: discountAmount,
        discountedTotal: discountedTotal
      }
    });
  } catch (error) {
    console.error('Error applying offer:', error);
    res.status(500).json({ message: 'Server error while applying offer' });
  }
};





exports.removeOffer = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Offer ID is required'
      });
    }

    // Find and remove the offer
    const offer = await Offer.findByIdAndDelete(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Offer removed successfully'
    });

  } catch (error) {
    console.error('Error removing offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove offer',
      error: error.message
    });
  }
};
