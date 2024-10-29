const Order = require('../models/Order');
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Payment = require('../models/Payment');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

const createOrderFromCart = async (req, res) => {
  const { user_id } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const cart = await Cart.findOne({ user_id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const cartItems = await CartItem.find({ cart_id: cart._id }).populate('product_id');
    if (!cartItems.length) {
      return res.status(404).json({ success: false, message: 'No items in cart' });
    }

    let totalAmount = 0;
    const orderItems = cartItems.map(item => {
      const itemTotal = item.product_id.price * item.quantity;
      totalAmount += itemTotal;
      return {
        product_id: item.product_id._id,
        product_name: item.product_id.name,
        quantity: item.quantity,
        price: item.product_id.price,
        total_price: itemTotal
      };
    });

    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create a payment order
    const paymentOptions = {
      amount: totalAmount * 100, // Amount in paise
      currency: 'INR',
      receipt: `RECEIPT-${Date.now()}`,
      payment_capture: 1, // Auto capture
    };

    const paymentOrder = await razorpay.orders.create(paymentOptions);

    res.status(201).json({
      success: true,
      payment_order_id: paymentOrder.id,
      amount: totalAmount,
      currency: 'INR',
    });
  } catch (error) {
    console.error('Error creating order from cart:', error);
    res.status(500).json({ success: false, message: 'Error creating order', error: error.message });
  }
};

const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const user_id = req.user.id; // Assuming you have user authentication middleware

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const isValidSignature = razorpay.validateWebhookSignature(
      JSON.stringify(req.body),
      razorpay_signature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValidSignature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== 'captured') {
      return res.status(400).json({ success: false, message: 'Payment not captured' });
    }

    // Create order
    const cart = await Cart.findOne({ user_id });
    const cartItems = await CartItem.find({ cart_id: cart._id }).populate('product_id');

    const orderItems = cartItems.map(item => ({
      product_id: item.product_id._id,
      product_name: item.product_id.name,
      quantity: item.quantity,
      price: item.product_id.price,
      total_price: item.product_id.price * item.quantity
    }));

    const order = new Order({
      user_id,
      order_no: `ORD-${Date.now()}`,
      order_status: 'Paid',
      total_amount: payment.amount / 100, // Convert back from paise to rupees
      items: orderItems
    });

    const savedOrder = await order.save();

    // Save payment details
    const paymentRecord = new Payment({
      user_id,
      order_id: savedOrder._id,
      razorpay_order_id,
      razorpay_payment_id,
      amount: payment.amount / 100,
      currency: payment.currency,
      payment_status: 'Successful',
      payment_method: 'Razorpay',
    });

    await paymentRecord.save();

    // Clear the cart
    await CartItem.deleteMany({ cart_id: cart._id });
    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified and order created successfully',
      order_id: savedOrder._id
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Error verifying payment', error: error.message });
  }
};

const getOrderHistory = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const orders = await Order.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'items.product_id',
        select: 'name image image_urls price'
      });

    // Change this part to return an empty array instead of a 404 error
    if (!orders.length) {
      return res.status(200).json({ success: true, orders: [] }); // Return success with empty orders
    }

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      order_no: order.order_no,
      order_status: order.order_status,
      total_amount: order.total_amount,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        _id: item._id,
        product: {
          _id: item.product_id._id,
          name: item.product_id.name,
          image: item.product_id.image_urls ? item.product_id.image_urls[0] : item.product_id.image,
          price: item.product_id.price
        },
        quantity: item.quantity,
        price: item.price,
        total_price: item.total_price
      }))
    }));

    res.status(200).json({
      success: true,
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ success: false, message: 'Error fetching order history', error: error.message });
  }
};



const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'user_id',
        select: 'name email username'
      })
      .populate({
        path: 'items.product_id',
        select: 'name image image_urls price'
      });

    const totalOrders = await Order.countDocuments();

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      order_no: order.order_no,
      order_status: order.order_status,
      total_amount: order.total_amount,
      createdAt: order.createdAt,
      user: order.user_id ? {
        _id: order.user_id._id,
        name: order.user_id.name,
        email: order.user_id.email,
        username: order.user_id.username
      } : null,
      items: order.items.map(item => ({
        _id: item._id,
        product: item.product_id ? {
          _id: item.product_id._id,
          name: item.product_id.name,
          image: item.product_id.image_urls ? item.product_id.image_urls[0] : item.product_id.image,
          price: item.product_id.price
        } : null,
        quantity: item.quantity,
        price: item.price,
        total_price: item.total_price
      }))
    }));

    res.status(200).json({
      success: true,
      orders: formattedOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching all orders', error: error.message });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate({
        path: 'user_id',
        select: 'name email username'
      })
      .populate({
        path: 'items.product_id',
        select: 'name price'
      });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const doc = new PDFDocument();
    const filename = `invoice-${order.order_no}.pdf`;

    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order Number: ${order.order_no}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.text(`Customer: ${order.user_id ? order.user_id.username : 'N/A'}`);
    doc.moveDown();

    // Add table headers
    doc.text('Product', 100, 200);
    doc.text('Quantity', 300, 200);
    doc.text('Price', 400, 200);
    doc.text('Total', 500, 200);

    let y = 220;
    order.items.forEach(item => {
      doc.text(item.product_id ? item.product_id.name : 'N/A', 100, y);
      doc.text(item.quantity.toString(), 300, y);
      doc.text(`$${item.price.toFixed(2)}`, 400, y);
      doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 500, y);
      y += 20;
    });

    doc.moveDown();
    doc.text(`Total Amount: $${order.total_amount.toFixed(2)}`, { align: 'right' });

    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ success: false, message: 'Error generating invoice', error: error.message });
  }
};

module.exports = {
  createOrderFromCart,
  verifyPayment,
  getOrderHistory,
  getAllOrders,
  downloadInvoice
};