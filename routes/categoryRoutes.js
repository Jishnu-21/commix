const express = require('express');
const router = express.Router();
const categoryController = require('../controller/CategoryController');

// Route to add a category
router.post('/add', categoryController.addCategory);

// Route to edit a category
router.put('/:id', categoryController.editCategory);

// Route to delete a category
router.delete('/:id', categoryController.deleteCategory);

// Get all categories
router.get('/', categoryController.getAllCategories);

// Get a specific category by ID
router.get('/:id', categoryController.getCategoryById);


router.post('/categories/:id/subcategories', categoryController.addSubcategory);


router.put('/categories/:categoryId/subcategories/:subcategoryId', categoryController.editSubcategory);


router.delete('/categories/:categoryId/subcategories/:subcategoryId', categoryController.deleteSubcategory);

module.exports = router;
