const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const jwt = require('jsonwebtoken');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

const getUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = `user_${userId}`;
    const cachedUser = cache.get(cacheKey);

    if (cachedUser) {
      return res.status(200).json({ success: true, user: cachedUser });
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userDetails = {
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
    };

    cache.set(cacheKey, userDetails);

    res.status(200).json({ success: true, user: userDetails });
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

    cache.del(`user_${userId}`); // Clear the user cache

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

// ... existing code ...

const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;
    const updatedAddressData = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = user.address.id(addressId);

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    Object.assign(address, updatedAddressData);

    await user.save();

    res.status(200).json({ success: true, message: 'Address updated successfully', address: address });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ success: false, message: 'Error updating address', error: error.message });
  }
};

const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const newAddressData = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.address.push(newAddressData);

    await user.save();

    const newAddress = user.address[user.address.length - 1];

    res.status(201).json({ success: true, message: 'Address added successfully', address: newAddress });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ success: false, message: 'Error adding address', error: error.message });
  }
};


const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find the index of the address to remove
    const addressIndex = user.address.findIndex(addr => addr._id.toString() === addressId);

    if (addressIndex === -1) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    // Remove the address from the array
    user.address.splice(addressIndex, 1);

    await user.save();

    res.status(200).json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ success: false, message: 'Error deleting address', error: error.message });
  }
};



module.exports = {
  getUserDetails,
  updateUser,
  getAllUsersForAdmin,
  updateAddress,
  addAddress,
  deleteAddress,
};
