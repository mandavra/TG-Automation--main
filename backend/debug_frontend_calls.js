const mongoose = require('mongoose');
const Group = require('./models/group.model');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

async function debugFrontendCalls() {
  console.log('\n🔍 DEBUGGING FRONTEND API CALLS');
  console.log('=' .repeat(70));

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to cloud database');

    const targetPhone = '+917020025010';
    const frontendRoute = 'maintest'; // What the frontend URL shows

    console.log(`📱 Frontend URL: localhost:4173/pc/${frontendRoute}`);
    console.log(`👤 Login Phone: ${targetPhone}`);

    // Step 1: Check what bundle the frontend will find
    console.log('\n1️⃣ FRONTEND BUNDLE RESOLUTION');
    console.log('-'.repeat(50));
    
    console.log(`🔍 Frontend looking for bundle with route: "${frontendRoute}"`);
    
    // This mimics the frontend Group.findOne query
    const frontendBundle = await Group.findOne({
      $or: [
        { customRoute: frontendRoute },
        { route: frontendRoute },
        { publicRoute: frontendRoute },
        { slug: frontendRoute }
      ]
    });

    if (!frontendBundle) {
      console.log(`❌ PROBLEM FOUND: No bundle found with route "${frontendRoute}"`);
      
      // Show what bundles actually exist
      const allBundles = await Group.find({}).select('_id name customRoute route publicRoute slug');
      console.log('\n📦 Available bundles in cloud database:');
      allBundles.forEach((bundle, i) => {
        console.log(`   ${i + 1}. ${bundle.name} (${bundle._id})`);
        console.log(`      customRoute: ${bundle.customRoute || 'undefined'}`);
        console.log(`      route: ${bundle.route || 'undefined'}`);
        console.log(`      publicRoute: ${bundle.publicRoute || 'undefined'}`);
        console.log(`      slug: ${bundle.slug || 'undefined'}`);
      });
      
      console.log('\n🔧 SOLUTION: Update bundle to have correct route');
      
      // Find the bundle that has the user's payment
      const user = await User.findOne({ phone: targetPhone });
      if (user) {
        const userPayments = await PaymentLink.find({ userid: user._id }).populate('groupId');
        if (userPayments.length > 0) {
          const paymentBundle = userPayments[0].groupId;
          console.log(`\n💡 User has payment for bundle: ${paymentBundle.name} (${paymentBundle._id})`);
          console.log(`   Current customRoute: ${paymentBundle.customRoute}`);
          console.log(`   Should be: ${frontendRoute}`);
          
          // Fix the bundle route
          await Group.findByIdAndUpdate(paymentBundle._id, {
            customRoute: frontendRoute
          });
          console.log(`   ✅ Fixed: Updated customRoute to "${frontendRoute}"`);
          
          // Re-test the bundle resolution
          const fixedBundle = await Group.findOne({
            $or: [
              { customRoute: frontendRoute },
              { route: frontendRoute },
              { publicRoute: frontendRoute },
              { slug: frontendRoute }
            ]
          });
          
          if (fixedBundle) {
            console.log(`   ✅ SUCCESS: Frontend will now find bundle ${fixedBundle._id}`);
            
            // Test the API call that frontend will make
            console.log('\n2️⃣ TESTING FRONTEND API CALL');
            console.log('-'.repeat(50));
            
            console.log(`📡 Frontend will call: /api/user/check-purchase/${targetPhone}/${fixedBundle._id}`);
            
            // Simulate the API logic
            const phoneFormats = [targetPhone];
            if (targetPhone.startsWith('+')) {
              phoneFormats.push(targetPhone.substring(1));
            } else {
              phoneFormats.push('+' + targetPhone);
            }
            
            const allUsers = await User.find({ phone: { $in: phoneFormats } });
            console.log(`👤 Found ${allUsers.length} users with phone formats: ${phoneFormats.join(', ')}`);
            
            if (allUsers.length > 0) {
              const allUserIds = allUsers.map(u => u._id);
              const successfulPayment = await PaymentLink.findOne({
                userid: { $in: allUserIds },
                groupId: fixedBundle._id,
                status: 'SUCCESS'
              }).sort({ createdAt: -1 });
              
              if (successfulPayment) {
                console.log(`✅ API will find payment: ₹${successfulPayment.amount} - ${successfulPayment.status}`);
                console.log(`✅ API will return: hasPurchased: true`);
                
                const now = new Date();
                const isActive = successfulPayment.expiry_date > now;
                console.log(`✅ Subscription active: ${isActive ? 'Yes' : 'Expired'}`);
                
                console.log('\n🎯 EXPECTED FRONTEND BEHAVIOR:');
                console.log('- BundleCard will detect existing subscription ✅');
                console.log('- Will show subscription status section ✅');
                console.log('- Will hide "Subscribe Now" buttons ✅');
                console.log(`- Will show "${isActive ? 'Extend' : 'Renew'} Subscription" button ✅`);
                console.log('- Will restore localStorage step completion ✅');
                
              } else {
                console.log(`❌ API will NOT find payment for this bundle`);
              }
            } else {
              console.log(`❌ API will not find any users`);
            }
          }
        }
      }
    } else {
      console.log(`✅ Frontend will find bundle: ${frontendBundle.name} (${frontendBundle._id})`);
      
      // Test if this bundle has user's payment
      const user = await User.findOne({ phone: targetPhone });
      if (user) {
        const hasPayment = await PaymentLink.findOne({
          userid: user._id,
          groupId: frontendBundle._id,
          status: 'SUCCESS'
        });
        
        if (hasPayment) {
          console.log(`✅ Bundle has user's payment - frontend should work!`);
        } else {
          console.log(`❌ Bundle does NOT have user's payment - that's the problem!`);
          
          // Show which bundle has the payment
          const userPayments = await PaymentLink.find({ userid: user._id }).populate('groupId');
          console.log(`💳 User's payments are in:`);
          userPayments.forEach(payment => {
            console.log(`   - Bundle: ${payment.groupId?.name} (${payment.groupId?._id})`);
            console.log(`     Route: ${payment.groupId?.customRoute}`);
          });
        }
      }
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugFrontendCalls();
