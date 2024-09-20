const express = require('express');
const { addReview, editReview, blockReview } = require('../controller/ReviewController');
const authenticate = require('../middleware/Adminauth');
const router = express.Router();

router.post('/add', addReview);
router.put('/:reviewId', editReview);
router.delete('/:reviewId/block', authenticate, blockReview);

module.exports = router;