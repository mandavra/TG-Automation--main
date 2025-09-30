const axios = require('axios');

async function testFeatureToggles() {
  console.log('🧪 Testing Feature Toggle API Endpoints...\n');
  
  try {
    // Test 1: first-group (all features disabled)
    console.log('🔸 Testing first-group bundle (all features disabled):');
    const firstGroupResponse = await axios.get('http://localhost:4000/api/groups/by-route/first-group');
    const firstGroup = firstGroupResponse.data;
    
    console.log('   Success:', firstGroup.success);
    console.log('   Bundle name:', firstGroup.group?.name);
    console.log('   Custom route:', firstGroup.group?.customRoute);
    console.log('   Feature toggles:', firstGroup.group?.featureToggles);
    console.log('   Expected: all false ✓\n');
    
    // Test 2: abcpremium (all features enabled)
    console.log('🔸 Testing abcpremium bundle (all features enabled):');
    const premiumResponse = await axios.get('http://localhost:4000/api/groups/by-route/abcpremium');
    const premiumGroup = premiumResponse.data;
    
    console.log('   Success:', premiumGroup.success);
    console.log('   Bundle name:', premiumGroup.group?.name);
    console.log('   Custom route:', premiumGroup.group?.customRoute);
    console.log('   Feature toggles:', premiumGroup.group?.featureToggles);
    console.log('   Expected: all true ✓\n');
    
    // Test 3: Check if feature toggles are different
    const firstToggles = firstGroup.group?.featureToggles;
    const premiumToggles = premiumGroup.group?.featureToggles;
    
    console.log('🔸 Comparing feature toggles:');
    console.log('   first-group enablePayment:', firstToggles?.enablePayment);
    console.log('   abcpremium enablePayment:', premiumToggles?.enablePayment);
    console.log('   Different payment settings:', firstToggles?.enablePayment !== premiumToggles?.enablePayment ? '✅' : '❌');
    
    console.log('   first-group enableKYC:', firstToggles?.enableKYC);
    console.log('   abcpremium enableKYC:', premiumToggles?.enableKYC);
    console.log('   Different KYC settings:', firstToggles?.enableKYC !== premiumToggles?.enableKYC ? '✅' : '❌');
    
    console.log('   first-group enableESign:', firstToggles?.enableESign);
    console.log('   abcpremium enableESign:', premiumToggles?.enableESign);
    console.log('   Different E-Sign settings:', firstToggles?.enableESign !== premiumToggles?.enableESign ? '✅' : '❌');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testFeatureToggles();
