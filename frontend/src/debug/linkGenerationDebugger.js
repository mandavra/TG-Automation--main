// Paste this into browser console to debug link generation issues
// window.debugLinkGeneration()

window.debugLinkGeneration = function() {
  console.log('🔍 === TELEGRAM LINK GENERATION DEBUGGER ===');
  console.log('');
  
  // Check localStorage data
  console.log('📋 LocalStorage Data:');
  console.log('   userPhone:', localStorage.getItem('userPhone'));
  console.log('   user:', localStorage.getItem('user'));
  console.log('   paymentDetails:', localStorage.getItem('paymentDetails'));
  console.log('   telegramLink:', localStorage.getItem('telegramLink'));
  console.log('   paymentCompleted:', localStorage.getItem('paymentCompleted'));
  console.log('   kycCompleted:', localStorage.getItem('kycCompleted'));
  console.log('   digioCompleted:', localStorage.getItem('digioCompleted'));
  console.log('');
  
  // Check window data
  console.log('🌐 Window Data:');
  console.log('   currentBundleData:', window.currentBundleData);
  console.log('   Bundle ID:', window.currentBundleData?.id);
  console.log('   Feature toggles:', window.currentBundleData?.featureToggles);
  console.log('');
  
  // Parse and analyze data
  let user = {};
  let planData = {};
  
  try {
    const userData = localStorage.getItem('user');
    const paymentDetails = localStorage.getItem('paymentDetails');
    
    user = userData ? JSON.parse(userData) : {};
    planData = paymentDetails ? JSON.parse(paymentDetails) : {};
    
    console.log('✅ Parsed Data:');
    console.log('   User object:', user);
    console.log('   Plan data:', planData);
  } catch (error) {
    console.error('❌ Error parsing data:', error);
  }
  
  // Check link generation conditions
  const userPhone = localStorage.getItem('userPhone');
  const userId = user?._id || user?.id || userPhone || 'anonymous';
  const bundleId = window.currentBundleData?.id || window.currentBundleData?._id;
  
  console.log('🎯 Link Generation Analysis:');
  console.log('   Final userId:', userId);
  console.log('   Final bundleId:', bundleId);
  console.log('   Original duration:', planData.originalDuration);
  console.log('   Plan ID:', planData.planId);
  console.log('');
  
  // Check conditions
  const hasBundleData = !!(bundleId && userId && planData.originalDuration);
  const hasUserData = !!(userId && planData.originalDuration);
  
  console.log('🔍 Condition Check:');
  console.log('   Bundle-specific possible:', hasBundleData);
  console.log('   User-specific possible:', hasUserData);
  console.log('   Would use endpoint:', 
    hasBundleData ? '/api/invite/channel-bundle-links' :
    hasUserData ? '/api/invite/invite-link' :
    'Generic fallback'
  );
  
  if (hasBundleData) {
    const requestBody = {
      userId: userId,
      groupId: bundleId,
      duration: planData.originalDuration,
      paymentLinkId: localStorage.getItem('currentOrderId'),
      planId: planData.orderId || planData.planId
    };
    console.log('📡 Would send request body:', requestBody);
  }
  
  console.log('');
  console.log('🔧 Quick Fixes:');
  
  if (!userId || userId === 'anonymous') {
    console.log('❌ Missing user ID');
    console.log('   Fix: Ensure OTP verification stores user data properly');
  }
  
  if (!bundleId) {
    console.log('❌ Missing bundle ID');
    console.log('   Fix: Ensure you\'re on /pc/first-group URL');
    console.log('   Current URL should be: http://localhost:5173/pc/first-group');
  }
  
  if (!planData.originalDuration) {
    console.log('❌ Missing plan duration');
    console.log('   Fix: Select a plan to store duration data');
  }
  
  if (localStorage.getItem('telegramLink')) {
    console.log('ℹ️  Link already exists in localStorage:', localStorage.getItem('telegramLink'));
    console.log('   To regenerate, run: localStorage.removeItem("telegramLink"); location.reload();');
  }
  
  console.log('');
  console.log('=== END DEBUGGER ===');
};

// Also add a quick fix function
window.fixLinkGeneration = function() {
  console.log('🔧 Running Quick Fix...');
  
  // Clear existing link to force regeneration
  localStorage.removeItem('telegramLink');
  
  // Ensure we have basic user data
  const userPhone = localStorage.getItem('userPhone');
  if (userPhone && !localStorage.getItem('user')) {
    const userData = {
      _id: `phone_${userPhone.replace(/\D/g, '')}`,
      phone: userPhone,
      isTemporary: true
    };
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('✅ Created fallback user data:', userData);
  }
  
  // Ensure we have plan data if we're on a bundle page
  if (window.currentBundleData && !localStorage.getItem('paymentDetails')) {
    const bundlePlans = window.currentBundleData.subscriptionPlans;
    if (bundlePlans && bundlePlans.length > 0) {
      const defaultPlan = bundlePlans[0]; // Use first plan as default
      const planDetails = {
        orderId: `free_${Date.now()}`,
        amount: 0,
        planName: defaultPlan.type,
        customerId: userPhone,
        phone: userPhone,
        expiryDate: new Date(Date.now() + (defaultPlan.duration === 'year' ? 365 : defaultPlan.duration === 'month' ? 30 : 7) * 24 * 60 * 60 * 1000).toISOString(),
        duration: defaultPlan.duration === 'year' ? 365 : defaultPlan.duration === 'month' ? 30 : 7,
        originalDuration: defaultPlan.duration,
        planId: defaultPlan._id || defaultPlan.id
      };
      localStorage.setItem('paymentDetails', JSON.stringify(planDetails));
      console.log('✅ Created fallback plan data:', planDetails);
    }
  }
  
  console.log('✅ Quick fix completed! Refresh the page to try link generation again.');
  console.log('   Or run: location.reload();');
};
