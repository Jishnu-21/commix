const Category = require('../models/Category');

// Add a new category
exports.addCategory = async (req, res) => {
  try {
    const { name, description, parent_category_id } = req.body;

    const newCategory = new Category({
      name,
      description,
      parent_category_id,
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
  const { id } = req.params; // Get category ID from request parameters

  try {
    const { name, description, parent_category_id } = req.body;

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description, parent_category_id },
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
  const { id } = req.params; // Get category ID from request parameters

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
