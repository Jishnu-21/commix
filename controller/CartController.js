const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');

// Add to Cart
exports.addToCart = async (req, res) => {
  try {
    const { user_id, product_id, quantity } = req.body;

    // Check if the product exists and get its price
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find or create a cart for the user
    let cart = await Cart.findOne({ user_id });
    if (!cart) {
      cart = new Cart({ user_id });
      await cart.save();
    }

    // Check if the product already exists in the cart
    let cartItem = await CartItem.findOne({ cart_id: cart._id, product_id });

    console.log(product.price)

    if (cartItem) {
      // If it exists, update the quantity and recalculate the total price
      cartItem.quantity += quantity;
      cartItem.total_price = cartItem.quantity * product.price;
      await cartItem.save();
    } else {
      cartItem = new CartItem({
        cart_id: cart._id,
        product_id,
        quantity,
        price: product.price,
        total_price: quantity * product.price
      });
      await cartItem.save();
    }

    console.log(cartItem)

    res.status(200).json({ message: 'Product added to cart successfully', cartItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add product to cart', error });
  }
};

// Remove from Cart
exports.removeFromCart = async (req, res) => {
  try {
    const { user_id, product_id } = req.body;

    // Find the user's cart
    const cart = await Cart.findOne({ user_id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find the cart item
    const cartItem = await CartItem.findOneAndDelete({ cart_id: cart._id, product_id });
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
    const cartItems = await CartItem.find({ cart_id: cart._id }).populate('product_id');

    res.status(200).json({ cart, cartItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get cart contents', error });
  }
};