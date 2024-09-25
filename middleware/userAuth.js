const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    // Check for token in headers
    const token = req.cookies.refreshToken || req.headers['authorization']?.split(' ')[1]; // Adjust based on your setup

    if (!token) {
        return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret');
        req.user = decoded; // Attach user info to request
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = authenticate;