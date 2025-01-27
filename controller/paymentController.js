const Order = require('../models/Order');
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const moment = require('moment');
const User = require('../models/User'); // Add this import


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createRazorpayOrder = async (req, res) => {
  const { user_id, amount, currency } = req.body;

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

    const paymentOptions = {
      amount: amount * 100, // Amount in paise
      currency: currency || 'INR',
      receipt: `RECEIPT-${Date.now()}`,
      payment_capture: 1, // Auto capture
    };

    const paymentOrder = await razorpay.orders.create(paymentOptions);

    res.status(201).json({
      success: true,
      order_id: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, message: 'Error creating order', error: error.message });
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

    // Verify signature
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

    // Process items
    const processedItems = order_details.items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name || item.name,
      variant_name: item.variant_name || '50ml',
      quantity: Number(item.quantity),
      price: Number(item.price),
      total_price: Number(item.price * item.quantity)
    }));

    // Create order data with razorpay_order_id
    const orderData = {
      order_no: `ORD${Date.now()}${Math.random().toString(36).substring(2, 5)}`,
      user_id: user_id,
      items: processedItems,
      total_amount: order_details.total_amount,
      shipping_address: order_details.shipping_address,
      payment_status: 'completed',
      order_status: 'confirmed',
      payment_method: 'razorpay',
      razorpay_order_id: razorpay_order_id, // Add this field
      payment_details: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_date: new Date()
      }
    };

    console.log('Creating order with data:', JSON.stringify(orderData, null, 2));

    // Create and save the order
    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();

    // Clear cart after successful order
    if (user_id) {
      const cart = await Cart.findOne({ user_id });
      if (cart) {
        await CartItem.deleteMany({ cart_id: cart._id });
      }
    }

    // Send email confirmation
    const user = await User.findById(user_id);
    if (user && user.email) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Format currency
      const formatPrice = (price) => `₹${parseFloat(price).toFixed(2)}`;

      // Format items for email
      const itemsList = savedOrder.items.map(item => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd;">${item.variant_name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">${formatPrice(item.price)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">${formatPrice(item.total_price)}</td>
        </tr>
      `).join('');

      const emailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px;">
            <h1 style="color: #333; margin: 0;">Order Confirmed!</h1>
            <p style="color: #666; margin-top: 10px;">Thank you for shopping with us, ${user.first_name || user.username}!</p>
          </div>

          <div style="margin-top: 30px;">
            <h2 style="color: #333; border-bottom: 2px solid #f8f9fa; padding-bottom: 10px;">Order Details</h2>
            <p><strong>Order Number:</strong> ${savedOrder.order_no}</p>
            <p><strong>Order Date:</strong> ${moment(savedOrder.createdAt).format('MMMM Do YYYY, h:mm a')}</p>
            <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
          </div>

          <div style="margin-top: 30px;">
            <h3 style="color: #333; margin-bottom: 15px;">Items Ordered</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 12px; text-align: left;">Product</th>
                  <th style="padding: 12px; text-align: left;">Variant</th>
                  <th style="padding: 12px; text-align: center;">Qty</th>
                  <th style="padding: 12px; text-align: right;">Price</th>
                  <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 30px; background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h3 style="color: #333; margin-top: 0;">Order Summary</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0;">Subtotal:</td>
                <td style="text-align: right;">${formatPrice(savedOrder.total_amount)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;">Shipping:</td>
                <td style="text-align: right;">${formatPrice(103.50)}</td>
              </tr>
              <tr style="font-weight: bold;">
                <td style="padding: 5px 0; border-top: 2px solid #ddd;">Total:</td>
                <td style="text-align: right; border-top: 2px solid #ddd;">${formatPrice(savedOrder.total_amount + 103.50)}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 30px;">
            <h3 style="color: #333;">Shipping Address</h3>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
              ${savedOrder.shipping_address.firstName} ${savedOrder.shipping_address.lastName}<br>
              ${savedOrder.shipping_address.house}<br>
              ${savedOrder.shipping_address.street}<br>
              ${savedOrder.shipping_address.location}, ${savedOrder.shipping_address.state} ${savedOrder.shipping_address.postcode}<br>
              ${savedOrder.shipping_address.country}<br>
              Phone: ${savedOrder.shipping_address.phone_number}
            </div>
          </div>

          <div style="margin-top: 30px; text-align: center; color: #666;">
            <p>If you have any questions about your order, please contact our customer service.</p>
            <p style="color: #333; font-weight: bold;">Thank you for shopping with us!</p>
          </div>

          <div style="margin-top: 30px; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0; color: #666;">&copy; ${new Date().getFullYear()} Comix. All rights reserved.</p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: `"Comix" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `Order Confirmed - ${savedOrder.order_no}`,
        html: emailTemplate
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log('Order confirmation email sent to:', user.email);
      } catch (emailError) {
        console.error('Error sending order confirmation email:', emailError);
        // Don't throw error here, just log it
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
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


const createGuestOrder = async (req, res) => {
  try {
    const { items, guest_info, shipping_address, total_amount } = req.body;
    console.log('Received guest order data:', req.body);

    // Create Razorpay order
    const paymentOrder = await razorpay.orders.create({
      amount: Math.round(parseFloat(total_amount) * 100),
      currency: 'INR',
      receipt: `GUEST-${Date.now()}`
    });

    // Prepare order data
    const orderData = {
      order_no: `GUEST-${Date.now()}`,
      is_guest: true,
      guest_info: {
        firstName: guest_info.firstName,
        lastName: guest_info.lastName,
        email: guest_info.email,
        phone: guest_info.phone
      },
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        variant_name: item.variant_name || '50ml', // Default to 50ml if not specified
        quantity: item.quantity,
        price: item.price,
        total_price: item.total_price
      })),
      shipping_address,
      total_amount,
      payment_method: 'razorpay',
      payment_status: 'pending',
      order_status: 'pending',
      razorpay_order_id: paymentOrder.id
    };

    console.log('Creating order with data:', orderData);
    const tempOrder = new Order(orderData);
    await tempOrder.save();

    return res.status(201).json({
      success: true,
      payment_order_id: paymentOrder.id,
      amount: total_amount,
      currency: 'INR'
    });
  } catch (error) {
    console.error('Error creating guest order:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

const verifyGuestPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      guest_info,
      shipping_address
    } = req.body;

    console.log('Verifying guest payment for order:', razorpay_order_id);

    // Verify signature
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

    // Find the pending order - log the query for debugging
    console.log('Searching for order with razorpay_order_id:', razorpay_order_id);
    const existingOrder = await Order.findOne({ razorpay_order_id });
    
    console.log('Found order:', existingOrder);

    if (!existingOrder) {
      console.error('No order found with razorpay_order_id:', razorpay_order_id);
      return res.status(404).json({
        success: false,
        message: 'No order found'
      });
    }

    // Update the order status
    existingOrder.payment_status = 'completed';
    existingOrder.order_status = 'confirmed';
    existingOrder.payment_details = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_date: new Date()
    };

    const savedOrder = await existingOrder.save();
    console.log('Order updated successfully:', savedOrder._id);

    // Send confirmation email
    if (savedOrder.guest_info?.email) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const emailTemplate = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="text-align: center; padding: 20px;">
            <h1 style="color: #333;">Order Confirmation</h1>
            <p style="color: #666;">Thank you for your order!</p>
          </div>

          <div style="padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <h2 style="color: #333;">Order Details</h2>
            <p style="margin: 5px 0;">Order Number: ${savedOrder.order_no}</p>
            <p style="margin: 5px 0;">Date: ${moment(savedOrder.createdAt).format('MMMM D, YYYY')}</p>
          </div>

          <div style="margin-top: 20px;">
            <h3 style="color: #333;">Items Ordered</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: right;">Quantity</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
              ${savedOrder.items.map(item => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                    ${item.product_name}<br>
                    <small style="color: #666;">${item.variant_name}</small>
                  </td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">
                    ${item.quantity}
                  </td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">
                    ₹${item.total_price.toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </table>

            <table style="width: 100%; margin-top: 20px;">
              <tr>
                <td style="padding: 5px 0;">Subtotal:</td>
                <td style="text-align: right;">₹${savedOrder.total_amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;">Shipping:</td>
                <td style="text-align: right;">₹103.50</td>
              </tr>
              <tr style="font-weight: bold;">
                <td style="padding: 5px 0; border-top: 2px solid #ddd;">Total:</td>
                <td style="text-align: right; border-top: 2px solid #ddd;">
                  ₹${(savedOrder.total_amount + 103.50).toFixed(2)}
                </td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 30px;">
            <h3 style="color: #333;">Shipping Address</h3>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
              ${guest_info.firstName} ${guest_info.lastName}<br>
              ${shipping_address.house}<br>
              ${shipping_address.street}<br>
              ${shipping_address.location}, ${shipping_address.state} ${shipping_address.postcode}<br>
              ${shipping_address.country}<br>
              Phone: ${shipping_address.phone_number}
            </div>
          </div>

          <div style="margin-top: 30px; text-align: center; color: #666;">
            <p>If you have any questions about your order, please contact our customer service.</p>
            <p style="color: #333; font-weight: bold;">Thank you for shopping with us!</p>
          </div>

          <div style="margin-top: 30px; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0; color: #666;">&copy; ${new Date().getFullYear()} Comix. All rights reserved.</p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: `"Comix" <${process.env.EMAIL_USER}>`,
        to: savedOrder.guest_info.email,
        subject: `Order Confirmed - ${savedOrder.order_no}`,
        html: emailTemplate
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log('Order confirmation email sent to guest:', savedOrder.guest_info.email);
      } catch (emailError) {
        console.error('Error sending order confirmation email:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      order: savedOrder
    });

  } catch (error) {
    console.error('Error verifying guest payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  createGuestOrder,
  verifyGuestPayment,
};
