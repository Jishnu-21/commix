// controllers/productController.js
const Product = require('../models/Product'); // Adjust path if necessary
const cloudinary = require('../config/cloudinary'); // Import Cloudinary config

const addProduct = async (req, res) => {
  try {
    const { name, description, price, stock_quantity, category_id, brand, discount_percentage } = req.body;

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'products' },
        (error, image) => {
          if (error) {
            return reject(error);
          }
          resolve(image);
        }
      ).end(req.file.buffer);
    });

    // Save product to the database
    const product = new Product({
      name,
      description,
      price,
      stock_quantity,
      category_id,
      brand,
      image_url: result.secure_url,
      discount_percentage,      
    });

    const savedProduct = await product.save();

    res.status(201).json({ message: 'Product added successfully', product: savedProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Server error' });
  }
}


const blockProduct = async (req, res) => {
    const { id } = req.params;
  
    try {
      const product = await Product.findById(id);
  
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      // Block the product by setting isBlocked to true
      product.isBlocked = true;
      await product.save();
  
      return res.status(200).json({ success: true, message: 'Product blocked successfully', product });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };
  
// Edit product controller
const editProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock_quantity, category_id, brand, discount_percentage } = req.body;

  try {
    const updateData = {
      name,
      description,
      price,
      stock_quantity,
      category_id,
      brand,
      discount_percentage,
    };

    // Check if an image is uploaded
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      updateData.image_url = result.secure_url; // Update image URL
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({ success: true, product: updatedProduct });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  addProduct,
  blockProduct,
  editProduct
};
