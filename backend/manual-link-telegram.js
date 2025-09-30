const mongoose = require('mongoose');
const User = require('./models/user.model');
require('dotenv').config();

async function linkTelegramAccount(phone, telegramUserId) {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/automation');
      console.log('📊 Connected to MongoDB');
    }

    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) {
      console.log(`❌ User not found with phone: ${phone}`);
      return false;
    }

    // Check if Telegram ID is already linked to another account
    const existingTelegramUser = await User.findOne({ telegramUserId });
    if (existingTelegramUser && existingTelegramUser._id.toString() !== user._id.toString()) {
      console.log(`❌ Telegram ID ${telegramUserId} is already linked to another user: ${existingTelegramUser.firstName} ${existingTelegramUser.lastName} (${existingTelegramUser.phone})`);
      return false;
    }

    // Update user with Telegram ID
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { 
        telegramUserId,
        telegramJoinStatus: 'pending'
      },
      { new: true }
    );

    console.log(`✅ Successfully linked Telegram ID ${telegramUserId} to user ${updatedUser.firstName} ${updatedUser.lastName} (${updatedUser.phone})`);

    // Try to retry pending payments
    try {
      const paymentRecoveryService = require('./services/paymentRecoveryService');
      const retryResult = await paymentRecoveryService.retryPendingTelegramLinkPayments(updatedUser._id);
      
      if (retryResult.processed > 0) {
        console.log(`🔄 Processed ${retryResult.processed} pending payments: ${retryResult.successful} successful, ${retryResult.failed} failed`);
      }
    } catch (error) {
      console.error('Error retrying pending payments:', error);
    }

    return true;

  } catch (error) {
    console.error('Error linking Telegram account:', error);
    return false;
  }
}

async function linkMultipleAccounts(accountMappings) {
  console.log('🚀 Starting manual Telegram account linking...\n');

  let successful = 0;
  let failed = 0;

  for (const { phone, telegramUserId } of accountMappings) {
    console.log(`\n📱 Linking phone ${phone} to Telegram ID ${telegramUserId}...`);
    
    const result = await linkTelegramAccount(phone, telegramUserId);
    if (result) {
      successful++;
    } else {
      failed++;
    }
    
    // Small delay between operations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 Manual linking completed:`);
  console.log(`✅ Successfully linked: ${successful}`);
  console.log(`❌ Failed to link: ${failed}`);
}

// Example usage - based on the error messages from the server
const accountMappings = [
  // Add actual mappings here based on your failed payments
  // { phone: '+919624165190', telegramUserId: 'ACTUAL_TELEGRAM_USER_ID' },
  // { phone: '+917202025010', telegramUserId: 'ACTUAL_TELEGRAM_USER_ID' },
  // { phone: '9999999999', telegramUserId: 'ACTUAL_TELEGRAM_USER_ID' },
  // { phone: '9875224245', telegramUserId: 'ACTUAL_TELEGRAM_USER_ID' },
  // { phone: '8320608731', telegramUserId: 'ACTUAL_TELEGRAM_USER_ID' },
  // { phone: '8200905232', telegramUserId: 'ACTUAL_TELEGRAM_USER_ID' },
];

// Function to get list of users without Telegram IDs who have successful payments
async function getUsersNeedingTelegramLink() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/automation');
      console.log('📊 Connected to MongoDB');
    }

    const PaymentLink = require('./models/paymentLinkModel');

    // Find users with successful payments but no telegram ID
    const usersNeedingLink = await PaymentLink.find({
      status: 'SUCCESS',
      $or: [
        { link_delivered: { $ne: true } },
        { delivery_status: 'pending_telegram_link' }
      ]
    })
    .populate('userid', 'firstName lastName phone telegramUserId email')
    .sort({ purchase_datetime: -1 });

    console.log('\n📋 Users who need Telegram account linking:');
    console.log('='.repeat(60));

    const uniqueUsers = new Map();
    
    usersNeedingLink.forEach(payment => {
      if (payment.userid && !payment.userid.telegramUserId) {
        const key = payment.userid.phone;
        if (!uniqueUsers.has(key)) {
          uniqueUsers.set(key, {
            name: `${payment.userid.firstName || ''} ${payment.userid.lastName || ''}`.trim(),
            phone: payment.userid.phone,
            email: payment.userid.email,
            paymentsCount: 1
          });
        } else {
          uniqueUsers.get(key).paymentsCount++;
        }
      }
    });

    uniqueUsers.forEach((user, phone) => {
      console.log(`📱 ${user.name || 'Unknown'} (${phone}) - ${user.paymentsCount} payment(s) pending`);
      if (user.email) {
        console.log(`   📧 Email: ${user.email}`);
      }
      console.log(`   💻 Add to script: { phone: '${phone}', telegramUserId: 'ACTUAL_TELEGRAM_ID' },`);
      console.log();
    });

    console.log(`\nTotal users needing Telegram linking: ${uniqueUsers.size}`);

  } catch (error) {
    console.error('Error getting users needing Telegram link:', error);
  }
}

// Export functions for use
module.exports = {
  linkTelegramAccount,
  linkMultipleAccounts,
  getUsersNeedingTelegramLink
};

// If run directly, show users needing linking
if (require.main === module) {
  getUsersNeedingTelegramLink().then(() => {
    console.log('\n🔗 To link accounts, update the accountMappings array in this file and run:');
    console.log('node manual-link-telegram.js link');
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

// Handle command line arguments
const command = process.argv[2];
if (command === 'link') {
  if (accountMappings.length === 0) {
    console.log('❌ No account mappings defined. Please update the accountMappings array first.');
    process.exit(1);
  }
  
  linkMultipleAccounts(accountMappings).then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}