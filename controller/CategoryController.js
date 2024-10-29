const Category = require('../models/Category');

// Add a new category
exports.addCategory = async (req, res) => {
  try {
    const { name, description, subcategories } = req.body;

    const newCategory = new Category({
      name,
      description,
      subcategories
    });

    await newCategory.save();
    res.status(201).json({ message: 'Category added successfully', category: newCategory });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Edit an existing category
exports.editCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const { name, description, subcategories } = req.body;

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description, subcategories },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category updated successfully', category: updatedCategory });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get a specific category by ID
exports.getCategoryById = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.status(200).json({ success: true, category });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Add a new subcategory to a category
exports.addSubcategory = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.subcategories.push({ name, description });
    await category.save();

    res.status(201).json({ message: 'Subcategory added successfully', category });
  } catch (error) {
    console.error('Error adding subcategory:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Edit a subcategory
exports.editSubcategory = async (req, res) => {
  const { categoryId, subcategoryId } = req.params;
  const { name, description } = req.body;

  try {
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const subcategory = category.subcategories.id(subcategoryId);

    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    subcategory.name = name;
    subcategory.description = description;

    await category.save();

    res.json({ message: 'Subcategory updated successfully', category });
  } catch (error) {
    console.error('Error updating subcategory:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a subcategory
exports.deleteSubcategory = async (req, res) => {
  const { categoryId, subcategoryId } = req.params;

  try {
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.subcategories.id(subcategoryId).remove();
    await category.save();

    res.json({ message: 'Subcategory deleted successfully', category });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update the exports at the bottom of the file
module.exports = {
  addCategory: exports.addCategory,
  editCategory: exports.editCategory,
  deleteCategory: exports.deleteCategory,
  getAllCategories: exports.getAllCategories,
  getCategoryById: exports.getCategoryById,
  addSubcategory: exports.addSubcategory,
  editSubcategory: exports.editSubcategory,
  deleteSubcategory: exports.deleteSubcategory
};
