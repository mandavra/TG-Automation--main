const mongoose = require('mongoose');
const Group = require('./models/group.model');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

async function finalFixBundlePayment() {
  console.log('\n🔧 FINAL FIX: LINKING USER PAYMENT TO CORRECT BUNDLE');
  console.log('=' .repeat(70));

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to cloud database');

    const targetPhone = '+917020025010';
    const targetRoute = 'maintest';

    // Step 1: Find the current situation
    console.log('\n1️⃣ CURRENT SITUATION ANALYSIS');
    console.log('-'.repeat(50));
    
    const frontendBundle = await Group.findOne({
      $or: [
        { customRoute: targetRoute },
        { route: targetRoute },
        { publicRoute: targetRoute },
        { slug: targetRoute }
      ]
    });
    
    const user = await User.findOne({ phone: targetPhone });
    const userPayments = await PaymentLink.find({ userid: user._id }).populate('groupId');
    
    console.log(`🔍 Frontend looks for route: "${targetRoute}"`);
    console.log(`📦 Frontend finds bundle: ${frontendBundle?.name} (${frontendBundle?._id})`);
    console.log(`👤 User: ${user?.phone} (${user?._id})`);
    console.log(`💳 User payments:`);
    userPayments.forEach(payment => {
      console.log(`   - ₹${payment.amount} in bundle: ${payment.groupId?.name} (${payment.groupId?._id})`);
      console.log(`     Route: ${payment.groupId?.customRoute}`);
    });

    // Step 2: Choose the best fix strategy
    console.log('\n2️⃣ FIX STRATEGY');
    console.log('-'.repeat(50));
    
    const paymentBundle = userPayments[0]?.groupId; // Bundle that has user's payment
    
    if (!paymentBundle) {
      console.log('❌ No payment bundle found');
      return;
    }

    if (!frontendBundle) {
      // Case 1: No bundle with maintest route exists - rename payment bundle
      console.log('📝 Strategy: Rename payment bundle to have maintest route');
      
      await Group.findByIdAndUpdate(paymentBundle._id, {
        customRoute: targetRoute
      });
      console.log(`✅ Updated bundle "${paymentBundle.name}" customRoute to "${targetRoute}"`);
      
    } else if (frontendBundle._id.toString() !== paymentBundle._id.toString()) {
      // Case 2: Different bundles - move user's payment to the maintest bundle
      console.log('📝 Strategy: Move user payment to maintest bundle');
      
      console.log(`🔄 Moving payment from "${paymentBundle.name}" to "${frontendBundle.name}"`);
      
      await PaymentLink.findByIdAndUpdate(userPayments[0]._id, {
        groupId: frontendBundle._id
      });
      console.log(`✅ Updated payment to point to bundle "${frontendBundle.name}" (${frontendBundle._id})`);
    } else {
      console.log('✅ Payment is already in the correct bundle');
    }

    // Step 3: Verify the fix
    console.log('\n3️⃣ VERIFICATION');
    console.log('-'.repeat(50));
    
    // Re-check the frontend bundle resolution
    const verifyBundle = await Group.findOne({
      $or: [
        { customRoute: targetRoute },
        { route: targetRoute },
        { publicRoute: targetRoute },
        { slug: targetRoute }
      ]
    });
    
    if (verifyBundle) {
      console.log(`📦 Frontend will find: ${verifyBundle.name} (${verifyBundle._id})`);
      
      // Check if this bundle now has user's payment
      const verifyPayment = await PaymentLink.findOne({
        userid: user._id,
        groupId: verifyBundle._id,
        status: 'SUCCESS'
      });
      
      if (verifyPayment) {
        console.log(`✅ Bundle has user's payment: ₹${verifyPayment.amount}`);
        console.log(`📡 Frontend API call will be: /api/user/check-purchase/${targetPhone}/${verifyBundle._id}`);
        
        // Test the API response
        const phoneFormats = [targetPhone, targetPhone.substring(1)];
        const allUsers = await User.find({ phone: { $in: phoneFormats } });
        const allUserIds = allUsers.map(u => u._id);
        
        const apiPayment = await PaymentLink.findOne({
          userid: { $in: allUserIds },
          groupId: verifyBundle._id,
          status: 'SUCCESS'
        });
        
        if (apiPayment) {
          const now = new Date();
          const isActive = apiPayment.expiry_date > now;
          
          console.log(`✅ API will return:`);
          console.log(`   hasPurchased: true`);
          console.log(`   amount: ₹${apiPayment.amount}`);
          console.log(`   isActive: ${isActive}`);
          console.log(`   status: ${apiPayment.status}`);
          
          console.log('\n🎉 SUCCESS! FRONTEND SHOULD NOW WORK!');
          console.log('\n📋 Expected behavior:');
          console.log('1. Visit localhost:4173/pc/maintest');
          console.log('2. Login with +917020025010');
          console.log('3. See subscription status instead of Subscribe buttons');
          console.log('4. See "Extend Subscription" button');
          console.log('5. Steps restored from database');
          
        } else {
          console.log('❌ API will still not find payment');
        }
      } else {
        console.log(`❌ Bundle still does not have user's payment`);
      }
    } else {
      console.log('❌ Frontend still cannot find bundle with maintest route');
    }

    await mongoose.connection.close();
    console.log('\n✅ Fix completed!');

  } catch (error) {
    console.error('❌ Fix error:', error);
  }
}

finalFixBundlePayment();
