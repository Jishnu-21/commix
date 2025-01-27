// controllers/productController.js
const cloudinary = require('../config/cloudinary');
const Product = require('../models/Product');
const ProductVisit = require('../models/ProductVisit');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const HeroIngredient = require('../models/HeroIngredient');


const addProduct = async (req, res) => {
  try {
    const { 
      name, description, category_id, subcategory_id, 
      ingredients, hero_ingredients, how_to_use,
      functions, taglines, faqs, additional_info
    } = req.body;

    // Parse JSON strings if they are strings
    let parsedHeroIngredients;
    let parsedFaqs;
    let variants;

    try {
      parsedHeroIngredients = typeof hero_ingredients === 'string' ? 
        JSON.parse(hero_ingredients) : hero_ingredients;
      
      parsedFaqs = typeof faqs === 'string' ? 
        JSON.parse(faqs) : faqs;
      
      variants = typeof req.body.variants === 'string' ? 
        JSON.parse(req.body.variants) : req.body.variants;
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid JSON data in request' 
      });
    }

    // Validate variants
    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one variant is required' 
      });
    }

    // Validate hero ingredients
    if (!Array.isArray(parsedHeroIngredients) || parsedHeroIngredients.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one hero ingredient is required' 
      });
    }

    // Upload images to Cloudinary
    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        stream.end(file.buffer);
      });
    });

    const image_urls = await Promise.all(uploadPromises);

    // Create new product
    const product = new Product({
      name,
      description,
      category_id,
      subcategory_id,
      ingredients,
      hero_ingredients: parsedHeroIngredients,
      how_to_use,
      functions,
      taglines,
      faqs: parsedFaqs || [],
      additional_info,
      variants,
      image_urls
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding product',
      error: error.message
    });
  }
};

const editProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, description, category_id, subcategory_id, 
      ingredients, hero_ingredients, how_to_use,
      functions, taglines, faqs, additional_info,
      variants: rawVariants,
      existing_images
    } = req.body;

    // Parse JSON strings if they are strings
    let parsedHeroIngredients;
    let parsedFaqs;
    let variants;
    let existingImages;

    try {
      parsedHeroIngredients = typeof hero_ingredients === 'string' ? 
        JSON.parse(hero_ingredients) : hero_ingredients;
      
      parsedFaqs = typeof faqs === 'string' ? 
        JSON.parse(faqs) : faqs;
      
      variants = typeof rawVariants === 'string' ? 
        JSON.parse(rawVariants) : rawVariants;

      existingImages = typeof existing_images === 'string' ? 
        JSON.parse(existing_images) : existing_images;
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid JSON data in request' 
      });
    }

    // Handle new image uploads
    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          stream.end(file.buffer);
        });
      });
      newImageUrls = await Promise.all(uploadPromises);
    }

    // Combine existing and new images
    const image_urls = [...(existingImages || []), ...newImageUrls];

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        name,
        description,
        category_id,
        subcategory_id,
        ingredients,
        hero_ingredients: parsedHeroIngredients,
        how_to_use,
        functions,
        taglines,
        faqs: parsedFaqs || [],
        additional_info,
        variants,
        image_urls
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

const blockProduct = async (req, res) => {
  const { id } = req.params;
  let { isBlocked } = req.body;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // If isBlocked is not provided, toggle the current status
    if (typeof isBlocked !== 'boolean') {
      isBlocked = !product.isBlocked;
    }

    product.isBlocked = isBlocked;
    await product.save();

    const action = isBlocked ? 'blocked' : 'unblocked';
    return res.status(200).json({ 
      success: true, 
      message: `Product successfully ${action}`, 
      product 
    });
  } catch (error) {
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
    const products = await Product.find({ isBlocked: false })  // Only get unblocked products
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
      .populate({
        path: 'hero_ingredients.ingredient',
        model: 'HeroIngredient',
        select: 'name image_url description'
      })
      .lean();  // Convert to plain JavaScript object

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Transform hero ingredients to match the admin view format
    if (product.hero_ingredients) {
      product.hero_ingredients = product.hero_ingredients.map(hi => ({
        name: hi.ingredient.name,
        image_url: hi.ingredient.image_url,
        description: hi.description || hi.ingredient.description
      }));
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
  const userAgent = req.headers['user-agent']

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
    const productVisits = await ProductVisit.find({ userId })
      .populate('productId')
      .lean();  // Convert to plain JavaScript objects

    // Filter out visits where productId is null (deleted products)
    const validProductVisits = productVisits.filter(visit => visit.productId != null);

    res.status(200).json({ 
      message: 'Recently visited products retrieved successfully', 
      productVisits: validProductVisits 
    });
  } catch (error) {
    console.error('Error retrieving recently visited products:', error);
    res.status(500).json({ message: 'Error retrieving recently visited products', error: error.message });
  }
};

const getProductsBySubcategory = async (req, res) => {
  try {
    const { subcategoryId } = req.params;
    
    const products = await Product.find({
      subcategory_id: subcategoryId,
      isBlocked: false
    }).select('name slug price image_urls');

    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error fetching products by subcategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
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
  getRecentlyVisitedProducts,
  getProductsBySubcategory
};
