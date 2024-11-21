const nodemailer = require('nodemailer'); // Import Nodemailer
const Newsletter = require('../models/Newsletter');

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your email service
  auth: {
    user: process.env.EMAIL_USER, // Your email from .env
    pass: process.env.EMAIL_PASS  // Your email password from .env
  }
});

const subscribeToNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email already exists
    const existingSubscription = await Newsletter.findOne({ email });
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'This email is already subscribed to our newsletter'
      });
    }

    // Create new subscription
    const subscription = await Newsletter.create({ email });

    // Send confirmation email
    const unsubscribeLink = `http://localhost:5000/api/newsletter/unsubscribe/${encodeURIComponent(email)}`; // Update with your domain
    const emailTemplate = {
      from: process.env.EMAIL_USER, // Sender address
      to: email, // List of recipients
      subject: 'Welcome to Our Newsletter!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Thank you for subscribing!</h2>
          <p>Welcome to our newsletter! You'll now receive the latest beauty tips and updates straight to your inbox.</p>
          <p>We're excited to have you join our community!</p>
          <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5;">
            <p style="margin: 0;">If you didn't subscribe to our newsletter, please ignore this email.</p>
            <p style="margin: 0;">To unsubscribe, click <a href="${unsubscribeLink}">here</a>.</p>
          </div>
        </div>
      `
    };

    // Send email using Nodemailer
    await transporter.sendMail(emailTemplate);

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      data: subscription
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to newsletter',
      error: error.message
    });
  }
};

const unsubscribeFromNewsletter = async (req, res) => {
  try {
    const { email } = req.params; // Get email from URL parameters

    const subscription = await Newsletter.findOne({ email });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Delete the subscription
    await Newsletter.deleteOne({ email });

    // Send a response with a redirect link
    res.status(200).send(`
      <html>
        <head>
          <title>Unsubscribed</title>
          <meta http-equiv="refresh" content="5;url=https://mail.google.com/" />
        </head>
        <body>
          <h1>Successfully Unsubscribed</h1>
          <p>You have been successfully unsubscribed from our newsletter.</p>
          <p>You will be redirected to your Gmail inbox in 5 seconds.</p>
          <p>If you are not redirected, <a href="https://mail.google.com/">click here</a>.</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe from newsletter',
      error: error.message
    });
  }
};


module.exports = {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
};