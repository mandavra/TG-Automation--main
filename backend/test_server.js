const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Fixed check-purchase endpoint
app.get('/api/user/check-purchase/:phone/:bundleId', async (req, res) => {
  try {
    const { phone, bundleId } = req.params;
    console.log(`🔍 Checking purchase for phone: ${phone}, bundle: ${bundleId}`);

    // Find ALL users with this phone number (to handle duplicate accounts)
    const phoneFormats = [phone];
    if (phone.startsWith('+')) {
      phoneFormats.push(phone.substring(1));
    } else {
      phoneFormats.push('+' + phone);
    }
    
    const allUsers = await User.find({ phone: { $in: phoneFormats } });
    console.log(`📱 Found ${allUsers.length} users with phone formats:`, phoneFormats);
    
    if (allUsers.length === 0) {
      console.log(`❌ No users found for phone: ${phone}`);
      return res.json({
        success: true,
        hasPurchased: false,
        message: 'User not found',
        debug: {
          searchedPhone: phone,
          searchedFormats: phoneFormats
        }
      });
    }

    // Check for successful payments across ALL users with this phone number
    const allUserIds = allUsers.map(u => u._id);
    const successfulPayment = await PaymentLink.findOne({
      userid: { $in: allUserIds },
      groupId: bundleId,
      status: 'SUCCESS'
    }).sort({ createdAt: -1 });
    
    // Get the user associated with the payment (if found)
    const user = successfulPayment ? allUsers.find(u => u._id.toString() === successfulPayment.userid.toString()) : allUsers[0];

    if (successfulPayment) {
      console.log(`✅ Found payment for user ${user._id}: Amount ${successfulPayment.amount}`);
      
      // Check if subscription is still active
      const now = new Date();
      const isActive = successfulPayment.expiry_date > now;
      
      return res.json({
        success: true,
        hasPurchased: true,
        isActive: isActive,
        subscription: {
          id: successfulPayment._id,
          planName: successfulPayment.plan_name,
          amount: successfulPayment.amount,
          purchaseDate: successfulPayment.createdAt,
          expiryDate: successfulPayment.expiry_date,
          status: isActive ? 'active' : 'expired'
        }
      });
    }

    res.json({
      success: true,
      hasPurchased: false,
      message: 'No purchase found for this bundle',
      debug: {
        usersFound: allUsers.length,
        searchedUserIds: allUserIds.map(id => id.toString())
      }
    });

  } catch (error) {
    console.error('❌ Check purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking purchase status',
      error: error.message
    });
  }
});

// Start server on a different port
const PORT = 4002;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});