const Offer = require('../models/Offer');
const { validationResult } = require('express-validator');

// Add a new offer
exports.addOffer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, discount_percentage, start_date, end_date, product_id, image_url } = req.body;

    // Convert dates to Date objects
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Check if end date is before start date
    if (endDate <= startDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const offer = new Offer({
      title,
      description,
      discount_percentage,
      start_date: startDate,
      end_date: endDate,
      product_id,
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
    const { title, description, discount_percentage, start_date, end_date, product_id, image_url, is_active } = req.body;

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

    offer.title = title || offer.title;
    offer.description = description || offer.description;
    offer.discount_percentage = discount_percentage || offer.discount_percentage;
    offer.start_date = startDate;
    offer.end_date = endDate;
    offer.product_id = product_id || offer.product_id;
    offer.image_url = image_url || offer.image_url;
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

    await Offer.findByIdAndDelete(offerId);
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ message: 'Server error while deleting offer' });
  }
};