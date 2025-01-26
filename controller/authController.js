const { validationResult } = require('express-validator');
const User = require('../models/User');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateTokens = (userId, email, role = 'user') => {
  const accessToken = jwt.sign(
    { userId, email, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );
  const refreshToken = jwt.sign(
    { userId, email, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    // Find or create user
    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = new User({
        email: payload.email,
        username: payload.name || payload.email.split('@')[0],
        googleId: payload.sub,
        emailVerified: payload.email_verified,
        profile_picture: payload.picture || ''
      });
      await user.save();
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.email);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ 
      user, 
      accessToken
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, username, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    user = new User({
      email,
      username,
      password: hashedPassword,
      emailVerified: false
    });
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.email);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({ 
      user, 
      accessToken
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account is blocked' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.email);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ 
      user, 
      accessToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    console.log('Admin login attempt:', { email: req.body.email });
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing credentials:', { email: !!email, password: !!password });
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log('Admin not found:', { email });
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Verify password using bcryptjs
    const isValidPassword = await bcrypt.compare(password, admin.password);
    console.log('Password verification:', { 
      email,
      inputPassword: password,
      hashedPassword: admin.password,
      isValid: isValidPassword 
    });

    if (!isValidPassword) {
      console.log('Invalid password for admin:', { email });
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    console.log('Admin login successful:', { email, adminId: admin._id });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(admin._id, admin.email, 'admin');

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Send response
    res.json({
      success: true,
      accessToken,
      admin: {
        id: admin._id,
        email: admin.email,
        username: admin.username
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Refresh token not found' 
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      decoded.userId,
      decoded.email,
      decoded.role
    );

    // Set new refresh token in cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Send new access token
    res.json({
      success: true,
      accessToken,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ 
      success: false,
      message: 'Invalid refresh token' 
    });
  }
};

exports.validateToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = decoded.role === 'admin' 
        ? await Admin.findById(decoded.userId)
        : await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      res.json({ 
        valid: true,
        user: {
          id: user._id,
          email: user.email,
          role: decoded.role
        }
      });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      throw err;
    }
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

exports.logout = async (req, res) => {
  // Clear refresh token cookie
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};

exports.verifyToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Find or create user in our database
    let user = await User.findOne({ _id: decodedToken.userId });
    
    if (!user) {
      user = new User({
        email: decodedToken.email,
        username: decodedToken.email.split('@')[0],
        emailVerified: true
      });
      await user.save();
    }

    // Update user information if needed
    if (decodedToken.email && user.email !== decodedToken.email) {
      user.email = decodedToken.email;
      await user.save();
    }

    return res.json({ user });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found. Please start the signup process again.' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'New OTP sent successfully.',
      email,
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'OTP not found or expired' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id, user.email);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error during OTP verification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 3 
  });
  
  await rateLimiter(req, res);
  
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
            .content {
              padding: 20px;
              text-align: center;
            }
            .logo {
              width: 150px;
              height: auto;
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
              <h1 style="color: #2C3E50; margin: 0;">Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password for your Comix account. Don't worry, we're here to help!</p>
　
　
              <div style="text-align: center;">
                <a href="${resetUrl}" 
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
　
　
              <div style="background-color: #f8f9fa; 
                          padding: 15px; 
                          border-radius: 5px; 
                          margin: 20px 0; 
                          border-left: 4px solid #000000;">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>For security, this link can only be used once</li>
                </ul>
              </div>

              <div style="background-color: #f8f9fa; 
                          border-left: 4px solid #000000; 
                          padding: 15px; 
                          margin: 20px 0; 
                          border-radius: 5px;">
                <strong>📱 Using Google Sign-In?</strong>
                <p>If you normally sign in with Google, please continue to use the Google Sign-In option instead of resetting your password.</p>
              </div>
            </div>
            
            <div style="text-align: center; 
                        padding-top: 20px; 
                        border-top: 2px solid #f0f0f0; 
                        font-size: 12px; 
                        color: #666666;">
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

    user.password = await bcrypt.hash(newPassword, 10);
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
    
    const offer = await Offer.findOne({ code: code });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or expired'
      });
    }

    if (!offer.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This offer is no longer active'
      });
    }

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