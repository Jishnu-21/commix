const User = require('../models/User');

const getAllUsersForAdmin = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude password from the response
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Error fetching all users for admin:', error);
    res.status(500).json({ success: false, message: 'Error fetching all users for admin', error: error.message });
  }
};

const getUserDetailsById = async (req, res) => {
  try {
    const { id } = req.params; // Get the user ID from the request parameters
    const user = await User.findById(id).select('-password'); // Exclude password from the response

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
const blockUser = async (req, res) => {
    try {
      const { id } = req.params;
      let { isBlocked } = req.body;
  
      // If isBlocked is not provided, toggle the current status
      if (typeof isBlocked !== 'boolean') {
        const user = await User.findById(id);
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        isBlocked = !user.isBlocked;
      }
  
      const user = await User.findByIdAndUpdate(
        id,
        { isBlocked },
        { new: true, runValidators: true }
      ).select('-password');
  
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      const action = isBlocked ? 'blocked' : 'unblocked';
      res.status(200).json({ 
        success: true, 
        message: `User successfully ${action}`,
        user 
      });
    } catch (error) {
      console.error('Error blocking/unblocking user:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  };

module.exports = {
  getAllUsersForAdmin,
  getUserDetailsById,
  blockUser, // Add this new function to the exports
};