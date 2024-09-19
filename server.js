require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const authRoutes = require('./routes/authRoutes');  
const prodRoutes = require('./routes/ProdRoutes');
const catRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');


const Razorpay = require('razorpay');



const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes); // Use the authentication routes
app.use('/api/product',prodRoutes ); // Use the products routes
app.use('/api/categories',catRoutes ); // Use the categories routes
app.use('/api/cart',cartRoutes ); // Use the cart routes
app.use('/api/payment',paymentRoutes ); // Use the payment routes
app.use('/api/orders',orderRoutes ); // Use the orders routes


app.get('/', (req, res) => {
  res.send('Server Running');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
