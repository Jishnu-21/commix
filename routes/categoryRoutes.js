const express = require('express');
const router = express.Router();
const categoryController = require('../controller/CategoryController');
const authenticate = require('../middleware/Adminauth');
// Route to add a category
router.post('/add',authenticate, categoryController.addCategory);

// Route to edit a category
router.put('/:id',authenticate, categoryController.editCategory);

// Route to delete a category
router.delete('/:id',authenticate, categoryController.deleteCategory);

module.exports = router;
