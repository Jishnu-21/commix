require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing admin if exists
    await Admin.deleteOne({ email: 'admin@comix.com' });
    console.log('Cleared existing admin user');

    // Create admin user with bcryptjs
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    const admin = new Admin({
      username: 'admin',
      email: 'admin@comix.com',
      password: hashedPassword
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Admin credentials:');
    console.log('Email: admin@comix.com');
    console.log('Password: admin123');
    console.log('Hashed password:', hashedPassword);

  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedAdmin();
