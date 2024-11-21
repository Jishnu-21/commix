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

    let updateData = { ...req.body };

    // Remove email from updateData to prevent duplicate email issues
    delete updateData.email;

    if (req.file) {
      const base64String = req.file.buffer.toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${base64String}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        resource_type: 'auto',
        folder: 'profile_pictures'
      });
      updateData.profile_picture = result.secure_url;
    }

    // Remove username and email from updateData to prevent editing
    delete updateData.username;

    // Handle address update
    if (updateData.address && typeof updateData.address === 'string') {
      try {
        updateData.address = [JSON.parse(updateData.address)];
      } catch (error) {
        console.error('Error parsing address:', error);
      }
    }

    // Remove null or undefined values from updateData
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === 'null' || updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    cache.del(`user_${userId}`); // Clear the user cache

    res.status(200).json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    // Handle specific error cases
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email address is already in use',
        error: 'Duplicate email address'
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Error updating user', 
      error: error.message 
    });
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


const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;
    const updatedAddressData = req.body;

    // Validate required fields if they're being updated
    const requiredFields = [
      'street', 'state', 'house', 'postcode', 
      'location', 'country', 'phone_number',
      'firstName', 'lastName'
    ];

    const providedFields = Object.keys(updatedAddressData);
    const invalidFields = providedFields.filter(field => 
      updatedAddressData[field] === '' && requiredFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `These fields cannot be empty: ${invalidFields.join(', ')}`
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = user.address.id(addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    // Format phone number if it's being updated
    if (updatedAddressData.phone_number) {
      updatedAddressData.phone_number = updatedAddressData.phone_number.replace(/\D/g, '');
    }

    Object.assign(address, updatedAddressData);
    await user.save();

    // Clear the cache
    cache.del(`user_${userId}`);
    cache.del(`user_addresses_${userId}`);

    res.status(200).json({ 
      success: true, 
      message: 'Address updated successfully',
      user: user // Return the full user object
    });

  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating address', 
      error: error.message 
    });
  }
};


const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const newAddressData = req.body;

    console.log('Received address data:', newAddressData);

    // Validate required fields
    const requiredFields = [
      'street', 'state', 'house', 'postcode', 
      'location', 'country', 'phone_number'
    ];

    const missingFields = requiredFields.filter(field => !newAddressData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate address_name
    if (newAddressData.address_name && 
        !['Home', 'Work', 'Office', 'Other'].includes(newAddressData.address_name)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address_name. Must be one of: Home, Work, Office, Other'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Set default address_name if not provided
    if (!newAddressData.address_name) {
      newAddressData.address_name = 'Home';
    }

    // Format phone number
    if (newAddressData.phone_number) {
      newAddressData.phone_number = newAddressData.phone_number.replace(/\D/g, '');
      
      // Validate phone number format
      if (!/^\d{10}$/.test(newAddressData.phone_number)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be 10 digits'
        });
      }
    }

    // Add the address to the user's addresses array
    if (!user.address) {
      user.address = [];
    }
    
    user.address.push(newAddressData);
    await user.save();

    // Clear the cache
    cache.del(`user_${userId}`);
    cache.del(`user_addresses_${userId}`);

    // Return the full user object
    res.status(201).json({ 
      success: true, 
      message: 'Address added successfully',
      user: user // Return the full user object
    });

  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding address', 
      error: error.message 
    });
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

    // Clear the cache
    cache.del(`user_${userId}`);
    cache.del(`user_addresses_${userId}`);

    // Return the updated user object
    res.status(200).json({ 
      success: true, 
      message: 'Address deleted successfully',
      user: user  // Add this line to return the updated user
    });

  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ success: false, message: 'Error deleting address', error: error.message });
  }
};


const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Try to get from cache first
    const cacheKey = `user_addresses_${userId}`;
    const cachedAddresses = cache.get(cacheKey);
    
    if (cachedAddresses) {
      return res.status(200).json({
        success: true,
        addresses: cachedAddresses
      });
    }

    // If not in cache, fetch from database
    const user = await User.findById(userId).select('address');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store in cache for future requests
    cache.set(cacheKey, user.address);

    res.status(200).json({
      success: true,
      addresses: user.address
    });

  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching addresses',
      error: error.message
    });
  }
};

module.exports = {
  getUserDetails,
  updateUser,
  getAllUsersForAdmin,
  updateAddress,
  addAddress,
  deleteAddress,
  getAddresses,
};
