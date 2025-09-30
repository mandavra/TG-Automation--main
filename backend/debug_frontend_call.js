const axios = require('axios');

async function debugFrontendCall() {
  try {
    console.log('🔍 Debugging Frontend API Call Simulation');
    console.log('');
    
    // This simulates what happens when user is on /pc/first-group
    console.log('📋 Step 1: Get bundle data (what frontend receives)');
    const bundleResponse = await axios.get('http://localhost:4000/pc/first-group');
    const bundleData = bundleResponse.data.group;
    
    console.log('✅ Bundle Data:', {
      id: bundleData.id,
      name: bundleData.name,
      featureToggles: bundleData.featureToggles,
      plans: bundleData.subscriptionPlans?.length
    });
    
    // This simulates what happens when user selects a plan
    console.log('\n📋 Step 2: Simulate plan selection (what gets stored in localStorage)');
    
    // Get the Pro plan (₹33/month) from the bundle
    const proPlan = bundleData.subscriptionPlans?.find(plan => plan.type === 'Pro');
    if (!proPlan) {
      console.error('❌ Pro plan not found in bundle');
      return;
    }
    
    console.log('✅ Selected Plan:', {
      id: proPlan._id,
      type: proPlan.type,
      mrp: proPlan.mrp,
      duration: proPlan.duration
    });
    
    // This simulates what the Card component stores in localStorage
    const paymentDetails = {
      orderId: `free_${Date.now()}`, // Since payment is disabled
      amount: 0,
      planName: proPlan.type,
      customerId: 'test_user_phone',
      phone: 'test_user_phone',
      duration: proPlan.duration === 'year' ? 365 : proPlan.duration === 'month' ? 30 : 7,
      originalDuration: proPlan.duration,
      planId: proPlan._id
    };
    
    console.log('✅ PaymentDetails (what gets stored):', paymentDetails);
    
    // This simulates what the Steps component should send to the API
    console.log('\n📋 Step 3: Simulate Steps component API call');
    
    const userData = { _id: 'test_user_123' };
    const apiRequestBody = {
      userId: userData._id,
      groupId: bundleData.id, // This should be the bundle ID
      duration: paymentDetails.originalDuration,
      paymentLinkId: paymentDetails.orderId,
      planId: paymentDetails.planId
    };
    
    console.log('✅ API Request Body:', apiRequestBody);
    
    // Make the actual API call
    console.log('\n📋 Step 4: Make actual API call');
    const linkResponse = await axios.post('http://localhost:4000/api/invite/channel-bundle-links', apiRequestBody);
    
    console.log('✅ API Response:', {
      success: linkResponse.data.success,
      link: linkResponse.data.link,
      bundleName: linkResponse.data.bundleInfo?.name,
      successCount: linkResponse.data.summary?.successCount,
      errors: linkResponse.data.errors
    });
    
    console.log('');
    console.log('🎉 Frontend simulation SUCCESSFUL!');
    console.log('🔗 Generated Telegram Link:', linkResponse.data.link);
    console.log('');
    console.log('🔍 If user is still seeing "Error loading link", check:');
    console.log('   1. Browser console for JavaScript errors');
    console.log('   2. Network tab for failed requests');
    console.log('   3. localStorage for missing/incorrect data');
    
  } catch (error) {
    console.error('❌ Frontend simulation FAILED:', error.message);
    if (error.response?.data) {
      console.error('   API Error Response:', error.response.data);
    }
  }
}

debugFrontendCall();
