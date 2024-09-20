const express = require('express');
const { addOffer, editOffer, deleteOffer } = require('../controller/OfferController');
const { body } = require('express-validator');
const authenticate = require('../middleware/Adminauth');
const router = express.Router();

// Validation middleware
const offerValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('discount_percentage').isFloat({ min: 0, max: 100 }).withMessage('Discount percentage must be between 0 and 100'),
  body('start_date').isISO8601().toDate().withMessage('Invalid start date'),
  body('end_date').isISO8601().toDate().withMessage('Invalid end date'),
  body('product_id').isMongoId().withMessage('Invalid product ID'),
  body('image_url').optional().isURL().withMessage('Invalid image URL')
];

router.post('/add', authenticate, offerValidation, addOffer);
router.put('/:offerId', authenticate, offerValidation, editOffer);
router.delete('/:offerId', authenticate, deleteOffer);

module.exports = router;