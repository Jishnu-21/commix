const express = require('express');
const authController = require('../controller/authController');

const router = express.Router();

router.post('/signup', authController.signup); // Signup route
router.post('/verify-otp', authController.verifyOtp); // Verify OTP route                   
router.get('/login', authController.userLogin); // User login route
router.get('/admin-login', authController.adminLogin); // Admin login route
router.post('/logout', authController.logout); // Logout route
router.post('/refresh-token', authController.refreshToken); // Refresh token route
router.post('/google-login', authController.googleLogin);

module.exports = router;