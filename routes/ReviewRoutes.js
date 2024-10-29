const express = require('express');
const { addReview, editReview, blockReview, getProductReviews } = require('../controller/ReviewController');
const authenticate = require('../middleware/Adminauth');
const multer = require('multer');
const router = express.Router();

// Configure multer for handling file uploads
const upload = multer({ 
  dest: 'uploads/', // Temporary storage
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Route for adding a review with multiple photos
router.post('/add', upload.array('photos', 5), addReview);

// Route for editing a review with multiple photos
router.put('/:reviewId', upload.array('photos', 5), editReview);

router.delete('/:reviewId/block', blockReview);

// Route for getting product reviews
router.get('/product/:productId/reviews', getProductReviews);

module.exports = router;
