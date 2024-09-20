const express = require('express');
const bannerController = require('../controller/BannerController'); // Check path
const authenticate = require('../middleware/Adminauth');
const router = express.Router();

// Route to create a banner
router.post('/add',authenticate, bannerController.createBanner);

// Route to get all banners
router.get('/', bannerController.getBanners);

// Route to get a single banner by ID            
router.get('/:id', bannerController.getBannerById);

// Route to update a banner by ID
router.put('/:id',authenticate, bannerController.updateBanner);

// Route to delete a banner by ID              
router.delete('/:id',authenticate, bannerController.deleteBanner);

module.exports = router;        