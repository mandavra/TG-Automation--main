const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin.model');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tg_automation');

async function createTestAdmins() {
  try {
    console.log('=== Creating Test Admins ===\n');
    
    // Check if admins already exist
    const existingCount = await Admin.countDocuments();
    if (existingCount > 0) {
      console.log('❌ Admins already exist. Skipping creation.');
      const admins = await Admin.find({}, 'email role');
      console.log('Existing admins:', admins);
      return;
    }
    
    // Create superadmin
    const superAdminPassword = await bcrypt.hash('SuperAdmin@12345', 10);
    const superAdmin = new Admin({
      email: 'superadmin@tg.local',
      password: superAdminPassword,
      role: 'superadmin'
    });
    await superAdmin.save();
    console.log('✅ Created superadmin: superadmin@tg.local');
    
    // Create regular admin
    const adminPassword = await bcrypt.hash('testpassword123', 10);
    const admin = new Admin({
      email: 'abc@abc.com',
      password: adminPassword,
      role: 'admin'
    });
    await admin.save();
    console.log('✅ Created admin: abc@abc.com');
    
    // Create another regular admin
    const admin2Password = await bcrypt.hash('testpass456', 10);
    const admin2 = new Admin({
      email: 'test@test.com',
      password: admin2Password,
      role: 'admin'
    });
    await admin2.save();
    console.log('✅ Created admin: test@test.com');
    
    console.log('\n=== Test Admins Created Successfully ===');
    console.log('You can now login with:');
    console.log('1. Superadmin: superadmin@tg.local / SuperAdmin@12345');
    console.log('2. Admin: abc@abc.com / testpassword123');
    console.log('3. Admin: test@test.com / testpass456');
    
  } catch (error) {
    console.error('❌ Error creating admins:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

createTestAdmins();