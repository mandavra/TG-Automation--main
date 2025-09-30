const mongoose = require('mongoose');
const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const Plan = require('../models/plan');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function updateTestDataAdmin() {
  try {
    console.log('🔄 Updating test data with correct admin ID...\n');

    // Available admin IDs from the database
    const availableAdmins = [
      { id: '68a452f71c0eaf936f8737d3', email: 'superadmin@tg.local', role: 'superadmin' },
      { id: '68a453a1e9567a85f9442013', email: 'mandavra12@gmail.com', role: 'admin' },
      { id: '68a45bac198057d88c55cb9e', email: 'mandavra1212@gmail.com', role: 'admin' },
      { id: '68b18640332382f6ec9df28b', email: 'abc@abc.com', role: 'admin' }
    ];

    console.log('Available admins:');
    availableAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.email} (${admin.role}) - ID: ${admin.id}`);
    });
    console.log('');

    // Use the first admin (superadmin) as default - you can change this
    const selectedAdminId = availableAdmins[0].id; // Using superadmin by default
    console.log(`🎯 Using admin: ${availableAdmins[0].email} (${availableAdmins[0].role})`);
    console.log(`Admin ID: ${selectedAdminId}\n`);

    const adminObjectId = new mongoose.Types.ObjectId(selectedAdminId);

    // Update Users
    console.log('📝 Updating test users...');
    const userUpdate = await User.updateMany(
      { email: { $in: ['john.doe@example.com', 'jane.smith@example.com', 'bob.wilson@example.com'] } },
      { $set: { adminId: adminObjectId } }
    );
    console.log(`✅ Updated ${userUpdate.modifiedCount} users`);

    // Update Plans
    console.log('📝 Updating test plans...');
    const planUpdate = await Plan.updateMany(
      { type: { $in: ['Base', 'Pro'] } },
      { $set: { adminId: adminObjectId } }
    );
    console.log(`✅ Updated ${planUpdate.modifiedCount} plans`);

    // Update Payments
    console.log('📝 Updating test payments...');
    const paymentUpdate = await PaymentLink.updateMany(
      { link_id: { $in: ['pl_test_success_123', 'pl_test_pending_456', 'pl_test_failed_789'] } },
      { $set: { adminId: adminObjectId } }
    );
    console.log(`✅ Updated ${paymentUpdate.modifiedCount} payments`);

    // Get the updated payment IDs
    console.log('\n🔍 Fetching updated payment IDs...');
    const payments = await PaymentLink.find({
      link_id: { $in: ['pl_test_success_123', 'pl_test_pending_456', 'pl_test_failed_789'] }
    }).select('_id link_id status plan_name');

    console.log('\n🎉 Test data successfully updated!\n');
    console.log(`👤 All test data is now assigned to: ${availableAdmins[0].email}`);
    console.log('\n💡 Updated Test Payment IDs you can use:');
    payments.forEach(payment => {
      console.log(`   ${payment._id} - ${payment.status} payment for ${payment.plan_name}`);
    });

    console.log('\n🌐 You can now log in as this admin and test the payment details functionality!');

  } catch (error) {
    console.error('❌ Error updating test data:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
updateTestDataAdmin();