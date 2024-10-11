const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    // Check for token in headers
    const token = req.headers['authorization']?.split(' ')[1]; // We'll prioritize the Authorization header

    if (!token) {
        return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    try {
        // Use JWT_ACCESS_SECRET for verifying access tokens
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'fallback_access_secret');
        req.user = decoded; // Attach user info to request
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = authenticate;