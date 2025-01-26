const express = require('express');
const productController = require('../controller/ProductController');
const authenticate = require('../middleware/Adminauth');
const multer = require('multer');

// Use memory storage for multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });

const router = express.Router();

// Routes
router.post('/add', upload.array('files', 7), productController.addProduct); // Use 'files' to match the keyrouter.patch('/block/:id', authenticate, productController.blockProduct);
router.put('/edit/:id', upload.array('images', 10), productController.editProduct); // Also support multiple images for edit
router.get('/:id', productController.getProductDetails); // Fetch product details by ID
router.get('/details/:slug', productController.getProductDetailsBySlug);
router.get('/', productController.getAllProducts); // Fetch all products
router.post('/trackProduct', productController.trackProductVisit);
router.patch('/block/:id',productController.blockProduct)
router.get('/recentlyVisited/:userId', productController.getRecentlyVisitedProducts);

module.exports = router;
