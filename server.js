require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xssClean = require('xss-clean');
const cookieParser = require('cookie-parser');
const winston = require('winston');
const path = require('path');

// Route imports
const authRoutes = require('./routes/authRoutes');  
const prodRoutes = require('./routes/ProdRoutes');
const catRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const favoriteRoutes = require('./routes/favRoutes');
const bannerRoutes = require('./routes/BannerRoutes');
const reviewRoutes = require('./routes/ReviewRoutes');
const offerRoutes = require('./routes/OfferRoutes');
const reportRoutes = require('./routes/ReportRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const newsletterRoutes = require('./routes/newsletterRoute');
const careerRoutes = require('./routes/careerRoutes');
const Razorpay = require('razorpay');

const app = express();

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Security Middleware
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(xssClean());

// CORS Configuration
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting Configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // increased limit to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting only to auth routes
app.use('/api/auth', authLimiter);

// MongoDB connection with retry logic
async function connectWithRetry() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:<db_password>@cluster0.qlrgl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const MAX_RETRIES = 5;
  const RETRY_INTERVAL = 5000; // 5 seconds
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info('Successfully connected to MongoDB Atlas');
      break;
    } catch (err) {
      retries++;
      logger.error(`MongoDB connection attempt ${retries} failed: ${err.message}`);
      if (retries === MAX_RETRIES) {
        logger.error('Max retries reached. Could not connect to MongoDB');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
    }
  }
}

connectWithRetry();
// Razorpay configuration
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', prodRoutes);
app.use('/api/categories', catRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/careers', careerRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

module.exports = app;
