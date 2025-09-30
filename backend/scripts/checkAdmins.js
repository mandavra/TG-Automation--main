const mongoose = require('mongoose');
const Admin = require('../models/admin.model');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function checkAdmins() {
  try {
    console.log('🔍 Checking existing admins in database...\n');

    const admins = await Admin.find({}).select('_id email username role createdAt');
    
    if (admins.length === 0) {
      console.log('❌ No admins found in the database!');
      console.log('💡 You need to create an admin first.');
    } else {
      console.log(`✅ Found ${admins.length} admin(s):\n`);
      
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. Admin ID: ${admin._id}`);
        console.log(`   Email: ${admin.email || 'N/A'}`);
        console.log(`   Username: ${admin.username || 'N/A'}`);
        console.log(`   Role: ${admin.role || 'admin'}`);
        console.log(`   Created: ${admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}`);
        console.log('');
      });

      console.log('💡 Use one of these Admin IDs to update the test data!');
    }

  } catch (error) {
    console.error('❌ Error checking admins:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
checkAdmins();