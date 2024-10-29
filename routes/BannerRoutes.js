const express = require('express');
const bannerController = require('../controller/BannerController'); // Check path
const authenticate = require('../middleware/Adminauth');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = express.Router();

// Route to create a banner
router.post('/add', upload.single('image'), bannerController.createBanner);

// Route to get all banners
router.get('/', bannerController.getBanners);

// Route to get a single banner by ID            
router.get('/:id', bannerController.getBannerById);

// Route to update a banner by ID
router.put('/:id', upload.single('image'), bannerController.updateBanner);

// Route to delete a banner by ID              
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;        
