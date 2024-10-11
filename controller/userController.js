const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const jwt = require('jsonwebtoken');

const getUserDetails = async (req, res) => {
  try {
    // The user ID is extracted from the JWT token
    const userId = req.user.id;

    // Find the user by ID and exclude the password field
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Return all user details (excluding password)
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        googleId: user.googleId,
        name: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        address: user.address,
        phone_number: user.phone_number,
        profile_picture: user.profile_picture,
        isBlocked: user.isBlocked,
        referral_code: user.referral_code,
        referral_balance: user.referral_balance,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ success: false, message: 'Error fetching user details', error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
      const userId = req.user.id;
      console.log('Received body:', req.body);
      console.log('Received file:', req.file);

      let updateData = req.body;

      if (req.file) {
          const base64String = req.file.buffer.toString('base64');
          const dataURI = `data:${req.file.mimetype};base64,${base64String}`;
          
          const result = await cloudinary.uploader.upload(dataURI, {
              resource_type: 'auto',
              folder: 'profile_pictures'
          });
          updateData.profile_picture = result.secure_url;
      }

      // Remove username from updateData to prevent editing
      delete updateData.username;

      // Handle address update
      if (updateData.address && typeof updateData.address === 'string') {
          try {
              updateData.address = [JSON.parse(updateData.address)];
          } catch (error) {
              console.error('Error parsing address:', error);
          }
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

      if (!updatedUser) {
          return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
  }
};

const getAllUsersForAdmin = async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users, including sensitive data if needed
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Error fetching all users for admin:', error);
    res.status(500).json({ success: false, message: 'Error fetching all users for admin', error: error.message });
  }
};


module.exports = {
  getUserDetails,
  updateUser,
  getAllUsersForAdmin,
};