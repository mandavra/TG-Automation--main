const mongoose = require('mongoose');
const Admin = require('../models/admin.model');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tg_automation');

async function listAdmins() {
  try {
    console.log('=== Listing All Admins ===\n');
    
    const admins = await Admin.find({}, 'email role _id');
    
    console.log(`Found ${admins.length} admins:`);
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. Email: ${admin.email}, Role: ${admin.role}, ID: ${admin._id}`);
    });
    
    console.log('\n=== Admin List Complete ===');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

listAdmins();