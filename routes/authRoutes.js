const express = require('express');
const authController = require('../controller/authController');

const router = express.Router();

router.post('/signup', authController.signup); // Signup route
router.post('/verify-otp', authController.verifyOtp); // Verify OTP route                   
router.get('/login', authController.userLogin); // User login route
router.get('/admin-login', authController.adminLogin); // Admin login route


module.exports = router;