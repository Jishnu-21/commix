const express = require('express');
const { 
    verifyToken,
    adminLogin,
    googleLogin,
    userLogin,
    signup,
    logout,
    refreshToken,
    validateToken,
    verifyOtp,
    resendOtp,
    forgotPassword,
    resetPassword
} = require('../controller/authController');
const authenticate = require('../middleware/userAuth');
const { body } = require('express-validator');

const router = express.Router();

// Protected routes
router.post('/verify-token', authenticate, (req, res) => {
    res.json({ user: req.user });
});

// User authentication routes
router.post('/signup', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('username').notEmpty().withMessage('Username is required')
], signup);

router.post('/login', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
], userLogin);

router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);
router.post('/validate-token', validateToken);

// OTP verification routes
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google authentication
router.post('/google', googleLogin);

// Admin routes
router.post('/admin/login', adminLogin);

module.exports = router;