require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

async function verifyAndCreateAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Admin credentials
        const adminData = {
            username: 'admin',
            email: 'admin@comix.com',
            password: 'Admin@123'
        };

        // Check if admin exists
        let admin = await Admin.findOne({ email: adminData.email });
        
        if (admin) {
            console.log('Found existing admin user:');
            console.log('Email:', admin.email);
            console.log('Username:', admin.username);
            
            // Update password
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            admin.password = hashedPassword;
            await admin.save();
            console.log('Admin password updated');
        } else {
            // Create new admin
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            admin = new Admin({
                username: adminData.username,
                email: adminData.email,
                password: hashedPassword
            });
            await admin.save();
            console.log('New admin user created');
        }

        console.log('\nAdmin credentials:');
        console.log('Email:', adminData.email);
        console.log('Password:', adminData.password);

        // Verify password works
        const isValidPassword = await bcrypt.compare(adminData.password, admin.password);
        console.log('\nPassword verification:', isValidPassword ? 'SUCCESS' : 'FAILED');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

verifyAndCreateAdmin();
