const express = require('express');
const { 
    googleLogin, 
    signup, 
    verifyOtp, 
    userLogin, 
    adminLogin, 
    refreshToken, 
    logout 
} = require('../controller/authController'); // Adjust the path as necessary

const router = express.Router();

// Define your routes
router.post('/google', googleLogin);
router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/login', userLogin);
router.post('/admin-login', adminLogin);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

module.exports = router;