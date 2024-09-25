const { validationResult } = require('express-validator');
const User = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const AppleAuth = require('apple-auth');

const temporaryStore = new Map();
const refreshTokens = new Set(); // Store for valid refresh tokens

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID, // Ensure this matches your Google Client ID
    });
    const { email, name, picture, given_name, family_name, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      // Create a new user if they don't exist
      user = new User({
        username: name,
        email,
        isVerified: true,
        profile_picture: picture,
        first_name: given_name,
        last_name: family_name,
        googleId,
      });
      await user.save();
    } else {
      // Update existing user's information
      user.username = name;
      user.first_name = given_name;
      user.last_name = family_name;
      user.googleId = googleId; // Update Google ID if necessary
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (error) {
    console.error('Error during Google login:', error);
    res.status(400).json({ message: 'Invalid token or user not found' }); // Provide a clearer error message
  }
  
  exports.googleLogin = async (req, res) => {
    try {
      const { token } = req.body;
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID, // Ensure this matches your Google Client ID
      });
      const { email, name, picture, given_name, family_name, sub: googleId } = ticket.getPayload();
  
      let user = await User.findOne({ email });
  
      if (user && !user.googleId) {
        // User has signed up using email/password, so don't overwrite
        return res.status(400).json({ message: 'User signed up with email/password. Please use email login.' });
      }
  
      if (!user) {
        // Create a new user if they don't exist
        user = new User({
          username: name,
          email,
          isVerified: true,
          profile_picture: picture,
          first_name: given_name,
          last_name: family_name,
          googleId,
        });
        await user.save();
      } else {
        // Update existing user's information if they previously used Google login
        if (user.googleId === googleId) {
          user.username = name;
          user.profile_picture = picture;
          user.first_name = given_name;
          user.last_name = family_name;
          await user.save();
        } else {
          return res.status(400).json({ message: 'User signed up with email/password. Please use email login.' });
        }
      }
  
      const { accessToken, refreshToken } = generateTokens(user.id);
  
      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile_picture: user.profile_picture,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      });
    } catch (error) {
      console.error('Error during Google login:', error);
      res.status(400).json({ message: 'Invalid token or user not found' });
    }
  };
  
};

// Helper function to generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET || 'fallback_access_secret',
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
    { expiresIn: '7d' }
  );
  refreshTokens.add(refreshToken);
  return { accessToken, refreshToken };
};

exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({ field: err.param, message: err.msg })),
      });
    }

    const { username, email, password, phone_number } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email.',
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 2 * 60 * 1000;

    temporaryStore.set(email, {
      username,
      password: await bcrypt.hash(password, 10),
      phone_number,
      otp,
      otpExpires,
    });

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

// Function to generate a new OTP and send it via email
const generateAndSendOtp = (email, username) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
  const otpExpires = Date.now() + 2 * 60 * 1000; // Set OTP expiration to 2 minutes

  // Store the OTP and its expiration time in the temporary store
  temporaryStore.set(email, { otp, otpExpires, username });

  // Send the OTP via email (implement your email sending logic here)
  sendOtpEmail(email, otp);
};
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const tempUser = temporaryStore.get(email);
    if (!tempUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a new OTP and update the temporary store
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 2 * 60 * 1000; // Set new expiration time

    temporaryStore.set(email, {
      ...tempUser,
      otp,
      otpExpires,
    });

    // Send the new OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your new OTP code is ${otp}. It is valid for 2 minutes.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP email. Please try again later.',
        });
      }
      res.json({ message: 'OTP resent successfully' });
    });
  } catch (error) {
    console.error('Error during OTP resending:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const tempUser = temporaryStore.get(email);
    if (!tempUser) {
      return res.status(404).json({ message: 'OTP not found or expired' });
    }

    if (tempUser.otp !== otp || Date.now() > tempUser.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = new User({
      username: tempUser.username,
      email,
      password: tempUser.password,
      phone_number: tempUser.phone_number,
      isVerified: true,
    });

    await user.save();
    temporaryStore.delete(email);

    const { accessToken, refreshToken } = generateTokens(user.id);

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      accessToken,
      refreshToken,
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(admin.id);

    res.json({
      accessToken,
      refreshToken,
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

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret');
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id);
    
    // Remove old refresh token and add new one
    refreshTokens.delete(refreshToken);
    refreshTokens.add(newRefreshToken);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};

exports.logout = (req, res) => {
  const { refreshToken } = req.body;
  refreshTokens.delete(refreshToken);
  res.json({ message: 'Logged out successfully' });
};