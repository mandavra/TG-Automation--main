const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const Admin = require('../models/admin.model');

async function checkAdminLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tg-automation');
    console.log('Connected to MongoDB');

    // Check if abc@abc.com admin exists
    const targetAdmin = await Admin.findOne({ email: 'abc@abc.com' });
    
    console.log('\n=== Admin Check Results ===');
    if (targetAdmin) {
      console.log('✅ Admin found:', {
        id: targetAdmin._id,
        email: targetAdmin.email,
        role: targetAdmin.role,
        isActive: targetAdmin.isActive,
        createdAt: targetAdmin.createdAt
      });
    } else {
      console.log('❌ Admin abc@abc.com not found');
      
      // Show all admins for reference
      const allAdmins = await Admin.find({}).select('email role isActive createdAt');
      console.log('\n📋 All existing admins:');
      allAdmins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email} - ${admin.role} - Active: ${admin.isActive}`);
      });
      
      // Create the missing admin
      console.log('\n🔧 Creating abc@abc.com admin...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newAdmin = await Admin.create({
        email: 'abc@abc.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      console.log('✅ Admin created successfully:', newAdmin.email);
    }

    // Test password validation
    if (targetAdmin) {
      console.log('\n=== Password Test ===');
      // Test common passwords
      const testPasswords = ['password', 'password123', 'abc123', '123456'];
      
      for (const testPassword of testPasswords) {
        const isMatch = await bcrypt.compare(testPassword, targetAdmin.password);
        console.log(`Password "${testPassword}": ${isMatch ? '✅ Match' : '❌ No match'}`);
        if (isMatch) break;
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run check if called directly
if (require.main === module) {
  checkAdminLogin();
}

module.exports = { checkAdminLogin };