// controllers/productController.js
const cloudinary = require('../config/cloudinary');
const Product = require('../models/Product'); // Make sure to import your Product model
const ProductVisit = require('../models/ProductVisit'); // Assuming the model is in 'models/ProductVisit'




const addProduct = async (req, res) => {
  try {
    const { name, description, price, stock_quantity, category_id, brand, discount_percentage } = req.body;

    console.log('Request body:', req.body);
    console.log('Files:', req.files);

    const imageUrls = [];

    // Check if files are present
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { resource_type: 'auto', folder: 'products' },
              (error, result) => {
                if (error) {
                  console.error('Cloudinary upload error:', error);
                  reject(error);
                } else {
                  console.log('Cloudinary upload result:', result);
                  resolve(result);
                }
              }
            );
            uploadStream.end(file.buffer);
          });
          imageUrls.push(result.secure_url);
        } catch (uploadError) {
          console.error('Error uploading file to Cloudinary:', uploadError);
        }
      }
      console.log('Uploaded image URLs:', imageUrls);
    } else {
      console.log('No files were uploaded');
      return res.status(400).json({ message: 'No images uploaded' });
    }

    if (imageUrls.length === 0) {
      return res.status(500).json({ message: 'Failed to upload images' });
    }

    const product = new Product({
      name,
      description,
      price,
      stock_quantity,
      category_id,
      brand,
      image_urls: imageUrls, // Make sure this matches your schema
      discount_percentage,
    });

    const savedProduct = await product.save();
    console.log('Saved product:', savedProduct);

    res.status(201).json({ message: 'Product added successfully', product: savedProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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

const getProductDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find(); // Fetch all products from the database

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getProductDetailsBySlug = async (req, res) => {
  const { slug } = req.params;

  try {
    // Find the product by slug
    const product = await Product.findOne({ slug });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const trackProductVisit = async (req, res) => {
  const { productId, productName, userId } = req.body;
  const userIp = req.ip;
  const userAgent = req.headers['user-agent'];

  try {
    const visit = {
      userIp,
      userAgent,
      visitedAt: new Date()
    };

    const updatedProductVisit = await ProductVisit.findOneAndUpdate(
      { productId, userId },
      { $push: { visits: visit }, productName },
      { new: true, upsert: true }
    );

    res.status(201).json({ message: 'Product visit tracked successfully', productVisit: updatedProductVisit });
  } catch (error) {
    console.error('Error tracking product visit:', error);
    res.status(500).json({ message: 'Error tracking product visit', error: error.message });
  }
};



module.exports = {
  addProduct,
  blockProduct,
  editProduct,
  getProductDetails,
  getAllProducts,
  getProductDetailsBySlug,
  trackProductVisit
};
