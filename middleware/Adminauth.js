const Admin = require('../models/Admin'); // Ensure this is correct
const jwt = require('jsonwebtoken'); // Ensure this is imported

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    const admin = await Admin.findById(decoded.id); // Use Admin here instead of User
    
    if (!admin) {
      console.log('Admin not found');
      return res.status(401).json({ message: 'Admin not found' });
    }

    req.user = admin; 
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authenticate;
