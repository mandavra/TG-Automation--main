// Test script to verify BundleCard subscription check fix
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-automation';

async function verifyFix() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(uri);
    console.log('✅ Connected to database');

    const testPhone = '917020025010';
    const bundleId = '68c2620ddb378c8123cad634'; // From PublicGroup logs
    
    console.log('\n🔍 Testing the corrected API call that BundleCard should now make:');
    console.log(`📞 GET /api/user/check-purchase/${testPhone}/${bundleId}`);
    
    const response = await fetch(`http://localhost:4000/api/user/check-purchase/${testPhone}/${bundleId}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ API Response:');
      console.log('- success:', data.success);
      console.log('- hasPurchased:', data.hasPurchased);
      console.log('- isActive:', data.isActive);
      console.log('- subscription status:', data.subscription?.status);
      
      // Simulate what BundleCard will do now
      const subscriptionData = data.success && data.hasPurchased ? {
        ...data.subscription,
        completionStatus: data.completionStatus,
        canContinueFlow: data.canContinueFlow,
        flowStatus: data.flowStatus,
        isActive: data.isActive
      } : null;
      
      console.log('\n📊 BundleCard userSubscription will be set to:');
      console.log(subscriptionData ? 'Valid subscription object' : 'null');
      
      if (subscriptionData) {
        const hasActiveSubscription = subscriptionData && (
          subscriptionData.subscription?.status === 'active' || 
          subscriptionData.isActive === true
        );
        
        console.log('\n🎭 Button logic result:');
        console.log('- hasActiveSubscription:', hasActiveSubscription);
        console.log('- Expected button text:', hasActiveSubscription ? 'Extend Subscription' : 'Other');
      }
      
      console.log('\n🎯 EXPECTED RESULT:');
      console.log('- BundleCard should now make the API call');
      console.log('- userSubscription should not be null');
      console.log('- hasActiveSubscription should be true');
      console.log('- Button text should be "Extend Subscription"');
      console.log('- localStorage should be populated with bundle-specific keys');
      
    } else {
      console.log('❌ API call failed:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

console.log('🛠️ BUNDLECARD FIX VERIFICATION');
console.log('===============================');
console.log('Fixed issues:');
console.log('1. bundleData._id → bundleData.id (correct property name)');
console.log('2. Added debug logging to track API calls');
console.log('3. Fixed bundle route to use customRoute property');
console.log('4. Added proper error logging');
console.log('');

verifyFix();
