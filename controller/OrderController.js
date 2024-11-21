const Order = require('../models/Order');
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Payment = require('../models/Payment');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});

const cleanupPendingOrders = async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const result = await Order.deleteMany({
      payment_status: 'pending',
      createdAt: { $lt: tenMinutesAgo }
    });

    console.log(`Cleaned up ${result.deletedCount} pending orders`);
  } catch (error) {
    console.error('Error cleaning up pending orders:', error);
  }
};

cron.schedule('* * * * *', cleanupPendingOrders);

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
    cartItems.forEach(item => {
      totalAmount += item.product_id.price * item.quantity;
    });

    // Create Razorpay payment order
    const paymentOptions = {
      amount: totalAmount * 100,
      currency: 'INR',
      receipt: `RECEIPT-${Date.now()}`,
      payment_capture: 1
    };

    const paymentOrder = await razorpay.orders.create(paymentOptions);

    // Set expiry time for cleanup
    setTimeout(async () => {
      try {
        await Order.deleteOne({
          razorpay_order_id: paymentOrder.id,
          payment_status: 'pending'
        });
      } catch (error) {
        console.error('Error cleaning up specific pending order:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    res.status(201).json({
      success: true,
      payment_order_id: paymentOrder.id,
      amount: totalAmount,
      currency: 'INR',
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating Razorpay order', 
      error: error.message 
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      user_id,
      order_details
    } = req.body;

    console.log('Received payment verification data:', req.body);

    // Check if RAZORPAY_KEY_SECRET exists
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('RAZORPAY_KEY_SECRET is not defined in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Payment verification configuration error'
      });
    }

    // Verify payment signature using RAZORPAY_KEY_SECRET
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Process items with proper product_name
    const processedItems = order_details.items.map(item => ({
      product_id: item.product_id?._id || item.product_id,
      product_name: item.name || item.product_name || 'Unknown Product',
      variant_name: item.variant_name || '50ml',
      quantity: Number(item.quantity),
      price: Number(item.price),
      total_price: Number(item.price * item.quantity)
    }));

    // Create order data with completed status
    const orderData = {
      order_no: 'ORD' + Date.now() + Math.random().toString(36).substring(7),
      user_id: user_id,
      items: processedItems,
      total_amount: Number(order_details.total_amount),
      shipping_address: order_details.shipping_address,
      payment_status: 'completed', // Always set as completed for Razorpay
      order_status: 'confirmed',
      payment_method: 'razorpay',
      payment_details: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_date: new Date()
      }
    };

    // Create and save the order
    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();

    // Clear the user's cart after successful order
    if (user_id) {
      try {
        const cart = await Cart.findOne({ user_id });
        if (cart) {
          await CartItem.deleteMany({ cart_id: cart._id });
          await Cart.findOneAndDelete({ user_id });
        }
      } catch (error) {
        console.error('Error clearing cart:', error);
        // Don't fail the order if cart clearing fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and order created successfully',
      order: savedOrder
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
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

    if (!orders.length) {
      return res.status(200).json({ success: true, orders: [] });
    }

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      order_no: order.order_no,
      is_guest: order.is_guest,
      guest_info: order.is_guest ? {
        name: order.guest_info.name,
        email: order.guest_info.email,
        phone: order.guest_info.phone
      } : null,
      order_status: order.order_status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      total_amount: order.total_amount,
      shipping_address: {
        street: order.shipping_address.street,
        state: order.shipping_address.state,
        house: order.shipping_address.house,
        postcode: order.shipping_address.postcode,
        location: order.shipping_address.location,
        country: order.shipping_address.country,
        phone_number: order.shipping_address.phone_number,
        address_name: order.shipping_address.address_name
      },
      items: order.items.map(item => ({
        _id: item._id,
        product: {
          _id: item.product_id._id,
          name: item.product_id.name,
          image: item.product_id.image_urls ? item.product_id.image_urls[0] : item.product_id.image,
          price: item.product_id.price
        },
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        total_price: item.total_price,
        variant_name: item.variant_name,
        return_status: item.return_status || 'none',
        return_details: item.return_details ? {
          request_type: item.return_details.request_type,
          reason: item.return_details.reason,
          description: item.return_details.description,
          request_date: item.return_details.request_date,
          status_update_date: item.return_details.status_update_date
        } : null
      })),
      tracking_number: order.tracking_number || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
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

const createGuestOrder = async (req, res) => {
  try {
    const {
      items,
      total_amount
    } = req.body;

    if (!items || !total_amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // For Razorpay, only create the payment order without storing in DB
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total_amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `GUEST-${Date.now()}`,
      payment_capture: 1
    });

    return res.status(200).json({
      success: true,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      }
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating Razorpay order',
      error: error.message
    });
  }
};

const verifyGuestPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      shipping_address,
      guest_info,
      total_amount
    } = req.body;

    // Verify Razorpay signature first
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(sign)
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Only create order after payment verification is successful
    const orderData = {
      order_no: 'GO-' + Date.now() + '-' + Math.random().toString(36).substring(7),
      is_guest: true,
      guest_info,
      items,
      shipping_address,
      total_amount,
      payment_method: 'razorpay',
      payment_status: 'completed', // Set as completed since payment is verified
      order_status: 'confirmed',
      payment_details: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_date: new Date()
      }
    };

    const order = new Order(orderData);
    const savedOrder = await order.save();

    return res.status(200).json({
      success: true,
      message: 'Payment verified and order created successfully',
      order: savedOrder
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

// Create return request
const createReturnRequest = async (req, res) => {
  try {
    const { orderId, itemId, reason, description, returnType } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderItem = order.items.id(itemId);
    if (!orderItem) {
      return res.status(404).json({ message: 'Order item not found' });
    }

    // Update the item's return status and details
    orderItem.return_status = 'requested';
    orderItem.return_details = {
      request_type: returnType,
      reason: reason,
      description: description,
      request_date: new Date(),
      status_update_date: new Date()
    };

    await order.save();
    res.status(200).json({ message: 'Return request created successfully', order });

  } catch (error) {
    console.error('Create return request error:', error);
    res.status(500).json({ message: 'Error creating return request', error: error.message });
  }
};

// Update return request status (for admin)
const updateReturnRequestStatus = async (req, res) => {
  try {
    const { orderId, itemId, status } = req.body;
    
    if (!['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderItem = order.items.id(itemId);
    if (!orderItem) {
      return res.status(404).json({ message: 'Order item not found' });
    }

    orderItem.return_status = status;
    orderItem.return_details.status_update_date = new Date();

    await order.save();
    res.status(200).json({ message: 'Return request status updated successfully', order });

  } catch (error) {
    console.error('Update return request status error:', error);
    res.status(500).json({ message: 'Error updating return request status', error: error.message });
  }
};

// Get return requests (can be filtered by status)
const getReturnRequests = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {
      'items.return_status': { $ne: 'none' }
    };

    if (status) {
      query = {
        'items.return_status': status
      };
    }

    const orders = await Order.find(query)
      .populate('user_id', 'name email')
      .select('order_no items shipping_address createdAt');

    res.status(200).json(orders);

  } catch (error) {
    console.error('Get return requests error:', error);
    res.status(500).json({ message: 'Error fetching return requests', error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

    // Save hashed token to user
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = resetTokenExpiry;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send email
    await nodemailer.sendMail({
      from: 'your-email@example.com',
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Please go to this link to reset your password: ${resetUrl}`
    });

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to email'
    });

  } catch (error) {
    console.error('Forgot password error:', error);

    // Clear reset token fields on error
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
    }

    res.status(500).json({
      success: false,
      message: 'Error sending reset email',
      error: error.message
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Hash token to compare with stored hash
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};

const createCodOrder = async (req, res) => {
  try {
    console.log('Received COD order request:', req.body);
    
    const { user_id, items, shipping_address, total_amount, guest_info } = req.body;

    // Log the received data
    console.log('Parsed request data:', {
      user_id,
      itemsLength: items?.length,
      shipping_address,
      total_amount,
      guest_info
    });

    // Validate required fields
    if (!items || !shipping_address || !total_amount) {
      console.log('Missing required fields:', {
        hasItems: !!items,
        hasShippingAddress: !!shipping_address,
        hasTotalAmount: !!total_amount
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    try {
      // Process items with proper structure
      const processedItems = items.map(item => {
        console.log('Processing item:', item);
        return {
          product_id: item.product_id?._id || item.product_id,
          product_name: item.product_name || item._display?.name || 'Unknown Product',
          variant_name: item.variant_name || '50ml',
          quantity: Number(item.quantity),
          price: Number(item.price),
          total_price: Number(item.price * item.quantity)
        };
      });

      console.log('Processed items:', processedItems);

      // Create order data
      const orderData = {
        order_no: 'COD-' + Date.now() + '-' + Math.random().toString(36).substring(7),
        user_id: user_id || null,
        is_guest: !user_id,
        guest_info: !user_id ? guest_info : null,
        items: processedItems,
        shipping_address,
        total_amount: Number(total_amount),
        payment_method: 'cod',
        payment_status: 'pending',
        order_status: 'confirmed',
        payment_details: {
          payment_date: new Date()
        }
      };

      console.log('Order data to be saved:', orderData);

      // Create and save the order
      const order = new Order(orderData);
      const savedOrder = await order.save();

      console.log('Order saved successfully:', savedOrder);

      // If user is logged in, clear their cart
      if (user_id) {
        try {
          console.log('Attempting to clear cart for user:', user_id);
          const cart = await Cart.findOne({ user_id });
          if (cart) {
            await CartItem.deleteMany({ cart_id: cart._id });
            await Cart.findOneAndDelete({ user_id });
            console.log('Cart cleared successfully');
          } else {
            console.log('No cart found for user');
          }
        } catch (cartError) {
          console.error('Error clearing cart:', cartError);
          // Don't fail the order if cart clearing fails
        }
      }

      return res.status(200).json({
        success: true,
        message: 'COD order created successfully',
        order: savedOrder
      });

    } catch (processingError) {
      console.error('Error processing order data:', processingError);
      throw processingError; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    console.error('Error creating COD order:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message,
      details: error.stack
    });
  }
};

const createCodOrderLoggedIn = async (req, res) => {
  try {
    const {
      user_id,
      items,
      total_amount,
      shipping_address,
      payment_method,
      payment_status,
      order_status
    } = req.body;

    // Validate required fields
    if (!user_id || !items || !total_amount || !shipping_address) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Generate a unique order number
    const orderNo = `COD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Process items with proper structure
    const processedItems = items.map(item => ({
      product_id: item.product_id?._id || item.product_id,
      product_name: item.product_name || item._display?.name || 'Unknown Product',
      variant_name: item.variant_name || '50ml',
      quantity: Number(item.quantity),
      price: Number(item.price),
      total_price: Number(item.price * item.quantity)
    }));

    const newOrder = new Order({
      order_no: orderNo,
      user_id,
      items: processedItems,
      total_amount: Number(total_amount),
      shipping_address,
      payment_method: 'cod',
      payment_status: 'pending',
      order_status: 'confirmed',
      razorpay_order_id: orderNo
    });

    const savedOrder = await newOrder.save();

    // Clear user's cart after successful order creation
    try {
      const cart = await Cart.findOne({ user_id });
      if (cart) {
        await CartItem.deleteMany({ cart_id: cart._id });
        await Cart.findOneAndDelete({ user_id });
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      // Don't fail the order if cart clearing fails
    }

    res.status(200).json({
      success: true,
      message: 'COD order created successfully',
      order: savedOrder
    });
  } catch (error) {
    console.error('Error creating COD order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create COD order',
      error: error.message
    });
  }
};

const createGuestCodOrder = async (req, res) => {
  try {
    const {
      items,
      guest_info,
      total_amount,
      shipping_address,
      payment_method,
      payment_status,
      order_status
    } = req.body;

    // Validate required fields
    if (!items || !guest_info || !total_amount || !shipping_address) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Generate a unique order number
    const orderNo = `GUESTCOD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Process items with proper structure
    const processedItems = items.map(item => ({
      product_id: item.product_id?._id || item.product_id,
      product_name: item.product_name || item._display?.name || 'Unknown Product',
      variant_name: item.variant_name || '50ml',
      quantity: Number(item.quantity),
      price: Number(item.price),
      total_price: Number(item.price * item.quantity)
    }));

    const newOrder = new Order({
      order_no: orderNo,
      is_guest: true,
      guest_info,
      items: processedItems,
      total_amount: Number(total_amount),
      shipping_address,
      payment_method: 'cod',
      payment_status: 'pending',
      order_status: 'confirmed',
      razorpay_order_id: orderNo
    });

    const savedOrder = await newOrder.save();

    res.status(200).json({
      success: true,
      message: 'Guest COD order created successfully',
      order: savedOrder
    });
  } catch (error) {
    console.error('Error creating guest COD order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guest COD order',
      error: error.message
    });
  }
};

module.exports = {
  createOrderFromCart,
  verifyPayment,
  getOrderHistory,
  getAllOrders,
  downloadInvoice,
  createGuestOrder,
  createReturnRequest,
  updateReturnRequestStatus,
  getReturnRequests,
  verifyGuestPayment,
  forgotPassword,
  resetPassword,
  createCodOrder,
  createCodOrderLoggedIn,
  createGuestCodOrder
};