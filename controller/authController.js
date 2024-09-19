const { validationResult } = require('express-validator');
const User = require('../models/User'); // Import the user model
const Admin = require('../models/Admin'); // Import the user model
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // For sending OTP emails
const temporaryStore = new Map(); // Temporary storage for OTPs
const jwt = require('jsonwebtoken'); // Ensure this is imported

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

// Sign-up function
exports.signup = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
        })),
      });
    }

    const { username, email, password, phone_number } = req.body;

    console.log('Signup request received:', { username, email });

    // Check if the user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email.',
      });
    }

    // Generate OTP and set expiration
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 2 * 60 * 1000; // OTP expires in 2 minutes

    // Store user details temporarily
    temporaryStore.set(email, {
      username,
      password: await bcrypt.hash(password, 10),
      phone_number,
      otp,
      otpExpires,
    });

    // Send OTP email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. It is valid for 2 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP email. Please try again later.',
        });
      }
      console.log('OTP sent:', info.response);
      res.status(201).json({
        success: true,
        message: 'OTP sent to email.',
        email,
      });
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};

// OTP verification function
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('Verifying OTP:', { email, otp });

    // Retrieve temporary user data
    const tempUser = temporaryStore.get(email);
    if (!tempUser) {
      return res.status(404).json({ message: 'OTP not found or expired' });
    }

    // Check OTP validity
    if (tempUser.otp !== otp || Date.now() > tempUser.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Create new user instance
    const user = new User({
      username: tempUser.username,
      email,
      password: tempUser.password,
      phone_number: tempUser.phone_number,
      isVerified: true,
    });

    // Save user to the database
    await user.save();
    temporaryStore.delete(email); // Remove temp data

    // Generate JWT tokens
    const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, email },
    });
  } catch (error) {
    console.error('Error during OTP verification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.userLogin = async (req, res) => {
    try {
      // Validate the request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const { email, password } = req.body;
  
      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      // Compare the provided password with the hashed password in the database
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      // Generate a JWT token for the user
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      // Send back the token and user information
      res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('Error during user login:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  exports.adminLogin = async (req, res) => {
    try {
      // Validate the request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const { email, password } = req.body;
  
      // Find the admin by email
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      // Compare the provided password with the hashed password in the database
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      // Generate a JWT token for the admin
      const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      // Send back the token and admin information
      res.json({
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
        },
      });
    } catch (error) {
      console.error('Error during admin login:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };