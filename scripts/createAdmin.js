require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

async function createAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        // Admin credentials
        const adminData = {
            username: 'admin',
            email: 'admin@comix.com',
            password: 'Admin@123' // This will be hashed before saving
        };

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        // Create new admin
        const admin = new Admin({
            username: adminData.username,
            email: adminData.email,
            password: hashedPassword
        });

        await admin.save();
        console.log('Admin user created successfully');
        console.log('Email:', adminData.email);
        console.log('Password:', adminData.password);

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await mongoose.connection.close();
    }
}

createAdminUser();
