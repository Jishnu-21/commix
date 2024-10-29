const Review = require('../models/Review');
const { validationResult } = require('express-validator');
const cloudinary = require('../config/cloudinary'); // Assume Cloudinary is configured in this file
const mongoose = require('mongoose');
// Add a review
exports.addReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, product_id, comment, rating } = req.body;
    let photo_urls = [];

    // Upload photos to Cloudinary if provided
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path);
        photo_urls.push(result.secure_url);
      }
    }

    const review = new Review({
      user_id,
      product_id,
      photo_urls,
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
    const { user_id, comment, rating } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if the user is the owner of the review
    if (review.user_id.toString() !== user_id) {
      return res.status(403).json({ message: 'Not authorized to edit this review' });
    }

    // Upload new photo to Cloudinary if provided
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      review.photo_url = result.secure_url;
    }

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



exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      populate: { 
        path: 'user_id', 
        select: 'name'
      },
    };

    const reviews = await Review.paginate({ product_id: productId, is_active: true }, options);

    const reviewsWithUserNames = reviews.docs.map(review => ({
      _id: review._id,
      user_id: review.user_id._id,
      user_name: review.user_id.name,
      product_id: review.product_id,
      photo_urls: review.photo_urls,
      comment: review.comment,
      rating: review.rating,
      is_active: review.is_active,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    }));

    res.json({
      reviews: reviewsWithUserNames,
      totalPages: reviews.totalPages,
      currentPage: reviews.page,
      totalReviews: reviews.totalDocs,
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ message: 'Server error while fetching product reviews' });
  }
};