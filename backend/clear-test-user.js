const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
const InviteLink = require('./models/InviteLink');
const ChannelMember = require('./models/ChannelMember');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tg_automation', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const clearTestUserData = async () => {
  try {
    const testPhone = '+917202025010';
    console.log(`🧹 Clearing all data for test user: ${testPhone}`);

    // Find the user first
    const user = await User.findOne({ phone: testPhone });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`👤 Found user: ${user.firstName} ${user.lastName} (ID: ${user._id})`);

    // Clear payment links (subscriptions)
    const paymentDeleteResult = await PaymentLink.deleteMany({ userid: user._id });
    console.log(`💳 Deleted ${paymentDeleteResult.deletedCount} payment records`);

    // Clear invite links
    const inviteDeleteResult = await InviteLink.deleteMany({ userId: user._id });
    console.log(`🔗 Deleted ${inviteDeleteResult.deletedCount} invite links`);

    // Clear channel memberships
    const membershipDeleteResult = await ChannelMember.deleteMany({ 
      telegramUserId: user.telegramUserId 
    });
    console.log(`📺 Deleted ${membershipDeleteResult.deletedCount} channel memberships`);

    // Clear the user record itself
    const userDeleteResult = await User.deleteOne({ _id: user._id });
    console.log(`👤 Deleted user record: ${userDeleteResult.deletedCount} user removed`);

    console.log('✅ Test user data cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing test user data:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the cleanup
clearTestUserData();
