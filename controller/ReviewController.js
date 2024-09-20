const Review = require('../models/Review');
const { validationResult } = require('express-validator');

// Add a review
exports.addReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, product_id, photo_url, comment, rating } = req.body; // Get user_id from the request body

    const review = new Review({
      user_id, // Use user_id from the request body
      product_id,
      photo_url: photo_url || null, // Set to null if not provided
      comment,
      rating,
    });

    await review.save();
    res.status(201).json({ message: 'Review added successfully', review });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Server error while adding review' });
  }
};

// Edit a review
exports.editReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { user_id, photo_url, comment, rating } = req.body; // Get user_id from the request body

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if the user is the owner of the review
    if (review.user_id.toString() !== user_id) { // Compare with user_id from the request body
      return res.status(403).json({ message: 'Not authorized to edit this review' });
    }

    review.photo_url = photo_url || review.photo_url; // Update only if provided
    review.comment = comment || review.comment;
    review.rating = rating || review.rating;

    await review.save();
    res.json({ message: 'Review updated successfully', review });
  } catch (error) {
    console.error('Error editing review:', error);
    res.status(500).json({ message: 'Server error while editing review' });
  }
};

// Admin block a review
exports.blockReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.is_active = false; // Block the review
    await review.save();

    res.json({ message: 'Review blocked successfully', review });
  } catch (error) {
    console.error('Error blocking review:', error);
    res.status(500).json({ message: 'Server error while blocking review' });
  }
};