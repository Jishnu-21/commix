const express = require('express');
const { 
    googleLogin, 
    signup, 
    verifyOtp, 
    userLogin, 
    adminLogin, 
    refreshToken, 
    logout, 
    resendOtp,
    validateToken
} = require('../controller/authController'); // Adjust the path as necessary
const authenticate = require('../middleware/userAuth');

const router = express.Router();

// Define your routes
router.post('/google', googleLogin);
router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', userLogin);
router.post('/admin-login', adminLogin);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/validate-token', authenticate,validateToken);


module.exports = router;