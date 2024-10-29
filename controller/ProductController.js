// controllers/productController.js
const cloudinary = require('../config/cloudinary');
const Product = require('../models/Product');
const ProductVisit = require('../models/ProductVisit');
const mongoose = require('mongoose');
const Category = require('../models/Category');

const VARIANT_SIZES = ['50ml', '150ml', '250ml'];

const addProduct = async (req, res) => {
  try {
    const { 
      name, description, category_id, subcategory_id, 
      ingredients, hero_ingredients, functions, taglines
    } = req.body;

    let variants;
    try {
      variants = JSON.parse(req.body.variants);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid variants data' });
    }

    console.log('Request body:', req.body);
    console.log('Files:', req.files);
    console.log('Parsed variants:', variants);

    // Validate variants
    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ message: 'At least one variant is required' });
    }

    for (const variant of variants) {
      if (!VARIANT_SIZES.includes(variant.name)) {
        return res.status(400).json({ message: `Invalid variant size: ${variant.name}` });
      }
      if (typeof variant.price !== 'number' || variant.price < 0) {
        return res.status(400).json({ message: 'Invalid variant price' });
      }
      if (typeof variant.stock_quantity !== 'number' || variant.stock_quantity < 0) {
        return res.status(400).json({ message: 'Invalid variant stock quantity' });
      }
    }

    // Validate hero ingredients
    if (hero_ingredients && Array.isArray(hero_ingredients)) {
      const invalidHeroIngredients = hero_ingredients.filter(
        hero => !ingredients.includes(hero)
      );
      
      if (invalidHeroIngredients.length > 0) {
        return res.status(400).json({ 
          message: `Hero ingredients must be part of the main ingredients list. Invalid ingredients: ${invalidHeroIngredients.join(', ')}`
        });
      }
    }

    const imageUrls = [];

    // Image upload logic
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

    // Validate category and subcategory
    const category = await Category.findById(category_id);
    if (!category) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    if (subcategory_id) {
      const subcategory = category.subcategories.id(subcategory_id);
      if (!subcategory) {
        return res.status(400).json({ message: 'Invalid subcategory for the given category' });
      }
    }

    // Create new product with all fields
    const product = new Product({
      name,
      description,
      category_id,
      subcategory_id,
      image_urls: imageUrls,
      ingredients,
      taglines,
      hero_ingredients,
      functions,
      variants
    });

    const savedProduct = await product.save();

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

    product.isBlocked = true;
    await product.save();

    return res.status(200).json({ success: true, message: 'Product blocked successfully', product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const editProduct = async (req, res) => {
  const { id } = req.params;
  const { 
    name, description, category_id, subcategory_id, 
    ingredients, hero_ingredients, functions, variants,taglines 
  } = req.body;

  try {
    // Validate variants
    if (variants) {
      if (!Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({ message: 'At least one variant is required' });
      }

      for (const variant of variants) {
        if (!VARIANT_SIZES.includes(variant.name)) {
          return res.status(400).json({ message: `Invalid variant size: ${variant.name}` });
        }
      }
    }

    // Validate category and subcategory
    if (category_id) {
      const category = await Category.findById(category_id);
      if (!category) {
        return res.status(400).json({ message: 'Invalid category' });
      }

      if (subcategory_id) {
        const subcategory = category.subcategories.id(subcategory_id);
        if (!subcategory) {
          return res.status(400).json({ message: 'Invalid subcategory for the given category' });
        }
      }
    }

    // Validate hero ingredients if they're being updated
    if (hero_ingredients && Array.isArray(hero_ingredients)) {
      const invalidHeroIngredients = hero_ingredients.filter(
        hero => !ingredients.includes(hero)
      );
      
      if (invalidHeroIngredients.length > 0) {
        return res.status(400).json({ 
          message: `Hero ingredients must be part of the main ingredients list. Invalid ingredients: ${invalidHeroIngredients.join(', ')}`
        });
      }
    }

    const updateData = {
      name,
      description,
      category_id,
      subcategory_id,
      ingredients,
      taglines,
      hero_ingredients,
      functions,
      variants
    };

    // Image upload logic (if new images are provided)
    if (req.files && req.files.length > 0) {
      const imageUrls = [];
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'products' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              throw error;
            }
            imageUrls.push(result.secure_url);
          }
        ).end(file.buffer);
      }
      updateData.image_urls = imageUrls;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getProductDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id)
      .populate('category_id')
      .lean();  // Convert to plain JavaScript object

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Manually populate subcategory information
    if (product.subcategory_id && product.category_id) {
      const category = await Category.findById(product.category_id);
      if (category) {
        product.subcategory = category.subcategories.id(product.subcategory_id);
      }
    }

    return res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('category_id')
      .lean();  // Convert to plain JavaScript objects

    // Manually populate subcategory information
    for (let product of products) {
      if (product.subcategory_id && product.category_id) {
        const category = await Category.findById(product.category_id);
        if (category) {
          product.subcategory = category.subcategories.id(product.subcategory_id);
        }
      }
    }

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getProductDetailsBySlug = async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({ success: false, message: 'Slug is required' });
  }

  try {
    const product = await Product.findOne({ slug })
      .populate('category_id')
      .lean();  // Convert to plain JavaScript object

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Manually populate subcategory information
    if (product.subcategory_id && product.category_id) {
      const category = await Category.findById(product.category_id);
      if (category) {
        product.subcategory = category.subcategories.id(product.subcategory_id);
      }
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

    let updatedProductVisit = await ProductVisit.findOne({ productId, userId });

    if (!updatedProductVisit) {
      updatedProductVisit = new ProductVisit({
        productId,
        userId,
        productName,
        visits: [visit]
      });
    } else {
      updatedProductVisit.visits.push(visit);
    }

    await updatedProductVisit.save();

    res.status(201).json({ message: 'Product visit tracked successfully', productVisit: updatedProductVisit });
  } catch (error) {
    console.error('Error tracking product visit:', error);
    res.status(500).json({ message: 'Error tracking product visit', error: error.message });
  }
};

const getRecentlyVisitedProducts = async (req, res) => {
  const { userId } = req.params;

  try {
    const productVisits = await ProductVisit.find({ userId }).populate('productId');
    res.status(200).json({ message: 'Recently visited products retrieved successfully', productVisits });
  } catch (error) {
    console.error('Error retrieving recently visited products:', error);
    res.status(500).json({ message: 'Error retrieving recently visited products', error: error.message });
  }
};

module.exports = {
  addProduct,
  blockProduct,
  editProduct,
  getProductDetails,
  getAllProducts,
  getProductDetailsBySlug,
  trackProductVisit,
  getRecentlyVisitedProducts
};
