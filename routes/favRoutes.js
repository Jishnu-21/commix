const express = require('express');
const favoriteController = require('../controller/FavoriteController'); // Check path

const router = express.Router();

// Route to create a favorite
router.post('/add', favoriteController.createFavorite);

// Route to delete a favorite
router.delete('/delete', favoriteController.deleteFavorite);

module.exports = router;
