const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');

// Add to Cart
exports.addToCart = async (req, res) => {
  try {
    const { user_id, product_id, quantity, variant_name } = req.body;

    // Validate required fields
    if (!user_id || !product_id || !quantity || !variant_name) {
      return res.status(400).json({ 
        message: 'Missing required fields. Need user_id, product_id, quantity, and variant_name' 
      });
    }

    // Validate quantity
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum < 1) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    // Check if the product exists and get its price
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the correct variant and its price
    const variant = product.variants.find(v => v.name === variant_name);
    if (!variant) {
      return res.status(404).json({ 
        message: `Variant ${variant_name} not found for this product` 
      });
    }

    // Check if there's enough stock
    if (variant.stock_quantity < quantityNum) {
      return res.status(400).json({ 
        message: 'Not enough stock available',
        available_stock: variant.stock_quantity 
      });
    }

    // Find or create a cart for the user
    let cart = await Cart.findOne({ user_id });
    if (!cart) {
      cart = new Cart({ user_id });
      await cart.save();
    }

    // Check if the product already exists in the cart with the same variant
    let cartItem = await CartItem.findOne({ 
      cart_id: cart._id, 
      product_id, 
      variant_name // Include variant_name in the query
    });

    if (cartItem) {
      // Update existing cart item
      cartItem.quantity = quantityNum;
      cartItem.price = variant.price;
      cartItem.total_price = quantityNum * variant.price;
      cartItem.variant_name = variant_name; // Ensure variant_name is updated
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = new CartItem({
        cart_id: cart._id,
        product_id,
        variant_name, // Include variant_name
        quantity: quantityNum,
        price: variant.price,
        total_price: quantityNum * variant.price
      });
      await cartItem.save();
    }

    // Return updated cart item with product details
    const updatedCartItem = await CartItem.findById(cartItem._id)
      .populate({
        path: 'product_id',
        select: 'name image_urls variants' // Include any other fields you need
      });

    res.status(200).json({ 
      message: 'Cart updated successfully', 
      cartItem: updatedCartItem 
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ 
      message: 'Failed to update cart', 
      error: error.message 
    });
  }
};
// Remove from Cart
exports.removeFromCart = async (req, res) => {
  try {
    const { user_id, product_id, variant_name } = req.body; // Include variant_name

    // Find the user's cart
    const cart = await Cart.findOne({ user_id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find the cart item with the specific variant
    const cartItem = await CartItem.findOneAndDelete({ 
      cart_id: cart._id, 
      product_id, 
      variant_name // Include variant_name in the query
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    res.status(200).json({ message: 'Product removed from cart successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to remove product from cart', error });
  }
};

// Delete Cart (remove all items)
exports.deleteCart = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Find the user's cart
    const cart = await Cart.findOne({ user_id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Remove all cart items associated with this cart
    await CartItem.deleteMany({ cart_id: cart._id });

    // Optionally, delete the cart itself
    await Cart.findByIdAndDelete(cart._id);

    res.status(200).json({ message: 'Cart deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete cart', error });
  }
};

// New function to get cart contents
exports.getCart = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Find the user's cart
    const cart = await Cart.findOne({ user_id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Get all cart items with product details
    const cartItems = await CartItem.find({ cart_id: cart._id })
      .populate({
        path: 'product_id',
        select: 'name image_urls variants description' // Include description in the selected fields
      });

    // Calculate cart totals
    const cartTotal = cartItems.reduce((total, item) => total + item.total_price, 0);
    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    res.status(200).json({ 
      cart: {
        ...cart.toObject(),
        total: cartTotal,
        itemCount
      }, 
      cartItems 
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Failed to get cart contents', error: error.message });
  }
};
exports.updateCartItemQuantity = async (req, res) => {
  try {
    const { product_id, variant_name, quantity } = req.body;

    // Validate quantity
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum < 1) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    // Find the product first
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the variant
    const variant = product.variants.find(v => v.name === variant_name);
    if (!variant) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    // Check stock availability
    if (variant.stock_quantity < quantityNum) {
      return res.status(400).json({ 
        message: 'Not enough stock available',
        available_stock: variant.stock_quantity
      });
    }

    // Find and update cart item
    const cartItem = await CartItem.findOne({ 
      product_id: product_id,
      variant_name: variant_name
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    // Update quantity and prices
    cartItem.quantity = quantityNum;
    cartItem.price = variant.price;
    cartItem.total_price = quantityNum * variant.price;
    await cartItem.save();

    // Get updated cart item with product details
    const updatedCartItem = await CartItem.findById(cartItem._id)
      .populate({
        path: 'product_id',
        select: 'name image_urls variants rating description'
      });

    res.status(200).json({ 
      message: 'Cart item quantity updated successfully',
      cartItem: updatedCartItem
    });

  } catch (error) {
    console.error('Update quantity error:', error);
    res.status(500).json({ 
      message: 'Failed to update quantity', 
      error: error.message 
    });
  }
};
