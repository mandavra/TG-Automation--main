// Debug script to simulate BundleCard's subscription check API call
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-automation';

async function testBundleSubscriptionAPI() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(uri);
    console.log('✅ Connected to database');

    // Test phone and bundle ID from browser logs
    const testPhone = '917020025010';
    const bundleId = '68c2620ddb378c8123cad634';
    
    console.log(`\n🔍 Testing API endpoint: /api/user/check-purchase/${testPhone}/${bundleId}`);
    console.log('This is what BundleCard component calls at line 65');
    
    // Simulate the API call that BundleCard makes
    const response = await fetch(`http://localhost:4000/api/user/check-purchase/${testPhone}/${bundleId}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ BundleCard API Response:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n🔍 BundleCard subscription detection logic:');
      console.log('- data.success:', data.success);
      console.log('- data.hasPurchased:', data.hasPurchased);
      console.log('- data.subscription:', data.subscription);
      console.log('- data.isActive:', data.isActive);
      
      // Simulate BundleCard's userSubscription state logic (line 70-76)
      const subscriptionData = data.success && data.hasPurchased ? {
        ...data.subscription,
        completionStatus: data.completionStatus,
        canContinueFlow: data.canContinueFlow,
        flowStatus: data.flowStatus,
        isActive: data.isActive
      } : null;
      
      console.log('\n📊 BundleCard userSubscription state would be:');
      console.log(subscriptionData ? JSON.stringify(subscriptionData, null, 2) : 'null');
      
      if (subscriptionData) {
        // Simulate button text determination logic (line 532-566)
        const hasActiveSubscription = subscriptionData && (
          subscriptionData.subscription?.status === 'active' || 
          subscriptionData.isActive === true
        );
        const hasExpiredSubscription = subscriptionData && (
          subscriptionData.subscription?.status === 'expired' || 
          (subscriptionData.isActive === false && subscriptionData.completionStatus !== 'payment_only')
        );
        
        console.log('\n🎯 BundleCard button logic:');
        console.log('- hasActiveSubscription:', hasActiveSubscription);
        console.log('- hasExpiredSubscription:', hasExpiredSubscription);
        console.log('- subscriptionData.completionStatus:', subscriptionData.completionStatus);
        console.log('- subscriptionData.canContinueFlow:', subscriptionData.canContinueFlow);
        
        let buttonText = "Subscribe Now";
        if (hasActiveSubscription) {
          buttonText = "Extend Subscription";
        } else if (hasExpiredSubscription) {
          buttonText = "Renew Subscription";
        } else if (subscriptionData.completionStatus === 'payment_only' || subscriptionData.completionStatus === 'paid_not_joined') {
          buttonText = "Continue Flow";
        } else if (subscriptionData.canContinueFlow) {
          buttonText = "Complete Steps";
        }
        
        console.log('🎭 Expected button text:', buttonText);
      }
    } else {
      console.log('❌ API call failed:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

testBundleSubscriptionAPI();
