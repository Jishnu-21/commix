const express = require('express');
const { addReport, changeReportStatus } = require('../controller/ReportController');
const { body } = require('express-validator');
const authenticate = require('../middleware/Adminauth');

const router = express.Router();

// Validation middleware
const reportValidation = [
  body('user_id').isMongoId().withMessage('Invalid user ID'),
  body('product_id').isMongoId().withMessage('Invalid product ID'),
  body('reason').notEmpty().withMessage('Reason is required')
];

const statusValidation = [
  body('status').isIn(['Pending', 'Reviewed', 'Resolved']).withMessage('Invalid status')
];

router.post('/add', reportValidation, addReport);
router.put('/:reportId/status', authenticate, statusValidation, changeReportStatus);

module.exports = router;