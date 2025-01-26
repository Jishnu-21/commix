const Admin = require('../models/Admin'); 
const jwt = require('jsonwebtoken'); 

const adminAuthenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Check if token is for admin role
      if (!decoded.role || decoded.role !== 'admin') {
        return res.status(403).json({ 
          success: false,
          message: 'Access denied: Admin privileges required' 
        });
      }

      // Find admin by ID
      const admin = await Admin.findById(decoded.userId);
      if (!admin) {
        return res.status(401).json({ 
          success: false,
          message: 'Admin not found' 
        });
      }

      // Attach admin info to request
      req.admin = admin;
      req.user = { id: admin._id, email: admin.email, role: 'admin' };
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          expired: true
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(401).json({ 
      success: false,
      message: 'Authentication failed' 
    });
  }
};

module.exports = adminAuthenticate;
