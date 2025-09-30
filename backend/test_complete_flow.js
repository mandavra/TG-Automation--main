// Test complete flow simulation
const axios = require('axios');

async function testCompleteFlow() {
  try {
    console.log('🎯 Testing Complete Plan-Specific Link Generation Flow');
    console.log('');
    
    // Step 1: User accesses bundle page
    console.log('📋 Step 1: User accesses /pc/first-group');
    const bundleResponse = await axios.get('http://localhost:4000/pc/first-group');
    const bundleData = bundleResponse.data.group;
    
    console.log(`✅ Bundle loaded: ${bundleData.name} (ID: ${bundleData.id})`);
    console.log(`📊 Plans available: ${bundleData.subscriptionPlans?.length || 0}`);
    console.log(`🎛️  Feature toggles:`, bundleData.featureToggles);
    
    // Step 2: User selects a plan (simulate)
    console.log('\n📋 Step 2: User selects a plan');
    const selectedPlan = {
      originalDuration: 'month',
      planId: 'sample_plan_id',
      orderId: 'sample_order_123'
    };
    console.log('✅ Plan selected:', selectedPlan);
    
    // Step 3: Generate invite link with plan context
    console.log('\n📋 Step 3: Generate invite link with plan context');
    const linkResponse = await axios.post('http://localhost:4000/api/invite/channel-bundle-links', {
      userId: 'test_user_123',
      groupId: bundleData.id,
      duration: selectedPlan.originalDuration,
      planId: selectedPlan.planId,
      paymentLinkId: selectedPlan.orderId
    });
    
    console.log('✅ Link generation response:', {
      success: linkResponse.data.success,
      link: linkResponse.data.link,
      bundleName: linkResponse.data.bundleInfo.name,
      successCount: linkResponse.data.summary.successCount
    });
    
    console.log('');
    console.log('🎉 Complete flow test PASSED!');
    console.log('📝 User should access: http://localhost:5173/pc/first-group');
    console.log('🔗 Generated link:', linkResponse.data.link);
    
  } catch (error) {
    console.error('❌ Complete flow test FAILED:', error.message);
    if (error.response?.data) {
      console.error('   Response error:', error.response.data);
    }
  }
}

testCompleteFlow();
