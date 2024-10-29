const express = require('express');
const { getAllUsersForAdmin, getUserDetailsById, blockUser,getDashboardData } = require('../controller/adminController');
const authenticate = require('../middleware/Adminauth'); // Assuming you have admin authentication middleware
const { adminLogin } = require('../controller/authController');
const router = express.Router();
const { body } = require('express-validator');
const { getSalesData } = require('../controller/adminController');

// Route for admin to get all users
router.get('/users', getAllUsersForAdmin);
router.get('/users/:id', getUserDetailsById);

// Route for blocking/unblocking a user
router.patch('/users/:id/block', blockUser);

router.post('/login', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ], adminLogin);

  router.get('/dashboard',getDashboardData);

  router.get('/sales',getSalesData)


module.exports = router;