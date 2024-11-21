const { validationResult } = require('express-validator');
const User = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const cookieParser = require('cookie-parser');
const Offer = require('../models/Offer');

const temporaryStore = new Map(); // Define temporaryStore

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
  return { accessToken, refreshToken };
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, picture, given_name, family_name, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Update user information
      user.googleId = googleId;
      user.username = name;
      user.email = email;
      user.profile_picture = picture;
      user.first_name = given_name;
      user.last_name = family_name;
      user.isVerified = true;
    } else {
      // Create a new user
      user = new User({
        googleId,
        username: name,
        email,
        isVerified: true,
        profile_picture: picture,
        first_name: given_name,
        last_name: family_name,
      });
    }

    await user.save();

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken,
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
      password,
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

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const tempUser = temporaryStore.get(email);
    if (!tempUser) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found. Please start the signup process again.' 
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 2 * 60 * 1000;

    temporaryStore.set(email, {
      ...tempUser,
      otp,
      otpExpires,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your New OTP Code',
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
      res.status(200).json({
        success: true,
        message: 'New OTP sent successfully.',
        email,
      });
    });

  } catch (error) {
    console.error('Error during OTP resending:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.' 
    });
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
      password:tempUser.password,  // Use the hashed password
      phone_number: tempUser.phone_number,
      isVerified: true,
    });

    await user.save();
    temporaryStore.delete(email);

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken,
      user: { id: user.id, username: user.username, email },
    });
  } catch (error) {
    console.error('Error during OTP verification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(403).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(403).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });

  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.'
    });
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

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken,
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
  const refreshToken = req.cookies.refreshToken;
  console.log('Refresh Token:', refreshToken);

  if (!refreshToken) {
    return res.status(403).json({ message: 'Refresh token not provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret');
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id);
    
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ accessToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(403).json({ message: 'Invalid user' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};

exports.validateToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        // Add any other user fields you want to return
      }
    });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ success: false, message: 'Error validating token', error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  let user;
  try {
    const { email } = req.body;

    user = await User.findOne({ 
      email,
      googleId: { $exists: false },
      password: { $exists: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address, or this account uses Google Sign-In'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000;

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = resetTokenExpiry;

    await user.save({ 
      validateModifiedOnly: true
    });

    const resetUrl = `http://localhost:3000/login?token=${resetToken}`;

    const mailOptions = {
      from: 'Comix <' + process.env.EMAIL_USER + '>',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333333;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #ffffff;
              border-radius: 10px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 2px solid #f0f0f0;
            }
            .logo {
              max-width: 150px;
              height: auto;
            }
            .title {
              color: #2C3E50;
              font-size: 24px;
              font-weight: bold;
              margin: 20px 0;
            }
            .content {
              padding: 20px 0;
            }
            .reset-button {
              background-color: #000000;
              color: #ffffff !important;
              padding: 12px 30px;
              text-decoration: none !important;
              border-radius: 5px;
              display: inline-block;
              margin: 20px 0;
              font-weight: bold;
              text-align: center;
              transition: background-color 0.3s;
              border: none;
            }
            .reset-button:hover {
              background-color: #333333;
            }
            .notice {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              border-left: 4px solid #000000;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 2px solid #f0f0f0;
              font-size: 12px;
              color: #666666;
            }
            .google-signin-notice {
              background-color: #f8f9fa;
              border-left: 4px solid #000000;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <img src="https://imgur.com/NjAG33k.gif" 
                   alt="Comix Logo" 
                   class="logo"
                   style="width: 150px; height: auto; margin-bottom: 20px;">
              <h1 class="title">Password Reset Request</h1>
            </div>
            
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password for your Comix account. Don't worry, we're here to help!</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" 
                   class="reset-button" 
                   style="background-color: #000000; 
                          color: #ffffff !important; 
                          text-decoration: none !important; 
                          padding: 12px 30px; 
                          border-radius: 5px; 
                          display: inline-block; 
                          margin: 20px 0; 
                          font-weight: bold;">
                  Reset Your Password
                </a>
              </div>
              
              <div class="notice">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>For security, this link can only be used once</li>
                </ul>
              </div>

              <div class="google-signin-notice">
                <strong>📱 Using Google Sign-In?</strong>
                <p>If you normally sign in with Google, please continue to use the Google Sign-In option instead of resetting your password.</p>
              </div>
            </div>
            
            <div class="footer">
              <p>This email was sent by Comix</p>
              <p>If you have any questions, please contact our support team</p>
              <p>&copy; ${new Date().getFullYear()} Comix. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to email'
    });

  } catch (error) {
    console.error('Forgot password error:', error);

    if (user) {
      try {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateModifiedOnly: true });
      } catch (saveError) {
        console.error('Error clearing reset token:', saveError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error sending reset email',
      error: error.message
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ 
      validateModifiedOnly: true,
      validateBeforeSave: false
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Successful',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333333;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #ffffff;
              border-radius: 10px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 2px solid #f0f0f0;
            }
            .content {
              padding: 20px;
              text-align: center;
            }
            .logo {
              width: 150px;
              height: auto;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <img src="https://i.imgur.com/DFVUt0m.png" 
                   alt="Comix Logo" 
                   class="logo"
                   style="width: 150px; height: auto; margin-bottom: 20px;">
              <h1 style="color: #2C3E50; margin: 0;">Password Reset Successful</h1>
            </div>
            <div class="content">
              <p>Your password has been successfully reset.</p>
              <p style="color: #e74c3c;">If you didn't make this change, please contact our support team immediately.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};

exports.applyOffer = async (req, res) => {
  try {
    const { code } = req.body;
    
    // Check if offer exists
    const offer = await Offer.findOne({ code: code });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or expired'
      });
    }

    // Check if offer is active
    if (!offer.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This offer is no longer active'
      });
    }

    // Check if offer has expired
    if (offer.expiryDate && new Date(offer.expiryDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This offer has expired'
      });
    }

    res.status(200).json({
      success: true,
      offer: {
        code: offer.code,
        discount: offer.discount,
        type: offer.type
      }
    });

  } catch (error) {
    console.error('Error applying offer:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying offer. Please try again.'
    });
  }
};

