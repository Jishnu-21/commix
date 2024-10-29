const express = require('express');
const favoriteController = require('../controller/FavoriteController'); // Check path

const router = express.Router();

// Route to create a favorite
router.post('/add', favoriteController.createFavorite);

// Route to delete a favorite
router.delete('/delete', favoriteController.deleteFavorite);

router.get('/check', favoriteController.checkFavorite);

router.get('/', favoriteController.getFavorites); // Adjust the path as needed

router.post('/batch', favoriteController.getProductsByIds);


module.exports = router;
