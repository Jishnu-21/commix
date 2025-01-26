const express = require('express');
const { 
    getAllUsersForAdmin, 
    getUserDetailsById, 
    blockUser,
    getDashboardData,
    getAllProductsForAdmin,
    getAllOrdersForAdmin,
    getOrderDetailsForAdmin,
    updateOrderStatus,
    downloadOrderInvoice,
    getSalesData 
} = require('../controller/adminController');
const authenticate = require('../middleware/adminAuth'); 
const { adminLogin, refreshToken } = require('../controller/authController');
const router = express.Router();
const { body } = require('express-validator');
const productController = require('../controller/productController');

// Admin login route (unprotected)
router.post('/login', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
], adminLogin);

// Token refresh route (unprotected)
router.post('/refresh-token', refreshToken);

// Apply authentication middleware to all routes below this line
router.use(authenticate);

// User management routes
router.get('/users', getAllUsersForAdmin);
router.get('/users/:id', getUserDetailsById);
router.patch('/users/:id/block', blockUser);

// Order management routes
router.get('/orders', getAllOrdersForAdmin);
router.get('/orders/:id', getOrderDetailsForAdmin);
router.patch('/orders/:id/status', updateOrderStatus);
router.get('/orders/:id/invoice', downloadOrderInvoice);

// Dashboard and analytics routes
router.get('/dashboard', getDashboardData);
router.get('/sales', getSalesData);

// Product management routes
router.get('/products', getAllProductsForAdmin);
router.get('/products/:id', productController.getProductDetails);

module.exports = router;