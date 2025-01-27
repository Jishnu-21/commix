const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    addHeroIngredient,
    getAllHeroIngredients,
    updateHeroIngredient,
    deleteHeroIngredient,
    getHeroIngredientById
} = require('../controller/HeroIngredientController');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Routes with file upload middleware
router.post('/add', upload.single('image'), addHeroIngredient);
router.put('/:id', upload.single('image'), updateHeroIngredient);

// Other routes
router.get('/', getAllHeroIngredients);
router.get('/:id', getHeroIngredientById);
router.delete('/:id', deleteHeroIngredient);

module.exports = router;
