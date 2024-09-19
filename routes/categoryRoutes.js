const express = require('express');
const router = express.Router();
const categoryController = require('../controller/CategoryController');

// Route to add a category
router.post('/add', categoryController.addCategory);

// Route to edit a category
router.put('/:id', categoryController.editCategory);

// Route to delete a category
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
