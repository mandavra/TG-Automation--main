const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import models
const Admin = require('../models/admin.model');

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tg-automation');
    console.log('Connected to MongoDB');

    const email = 'abc@abc.com';
    const password = 'testpassword123'; // We'll set this password

    console.log('\n=== Step 1: Reset Password for abc@abc.com ===');
    
    // Reset password to a known value
    const hashedPassword = await bcrypt.hash(password, 10);
    const updateResult = await Admin.findOneAndUpdate(
      { email: email },
      { password: hashedPassword },
      { new: true }
    );
    
    if (updateResult) {
      console.log('✅ Password updated successfully');
    } else {
      console.log('❌ Failed to update password');
      return;
    }

    console.log('\n=== Step 2: Simulate Login Process ===');
    
    // Simulate the login controller logic
    const normalizedEmail = String(email).trim().toLowerCase();
    const admin = await Admin.findOne({ email: normalizedEmail, isActive: true });
    
    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }
    
    console.log('✅ Admin found:', admin.email);
    
    // Test password comparison
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log('❌ Password does not match');
      return;
    }
    
    console.log('✅ Password matches');
    
    // Test JWT token creation
    try {
      const token = jwt.sign(
        { id: admin._id, email: admin.email, role: admin.role },
        process.env.ADMIN_JWT_SECRET || 'admin_jwt_secret',
        { expiresIn: '7d' }
      );
      
      console.log('✅ JWT token created successfully');
      console.log('Token preview:', token.substring(0, 50) + '...');
      
      // Verify token
      const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'admin_jwt_secret');
      console.log('✅ Token verification successful');
      
    } catch (jwtError) {
      console.log('❌ JWT Error:', jwtError.message);
      return;
    }
    
    console.log('\n=== Step 3: Login Test Result ===');
    console.log('🎉 All login steps completed successfully!');
    console.log('\n📋 Test credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('\nYou can now login with these credentials.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run test if called directly
if (require.main === module) {
  testLogin();
}

module.exports = { testLogin };