// Debug the exact frontend conditions
console.log('🔍 Debugging Frontend Link Generation Conditions');
console.log('');

// Simulate what might be in localStorage after user login and plan selection
const localStorage_simulation = {
  userPhone: '+1234567890', // User completed OTP
  user: null, // This might be missing!
  paymentDetails: JSON.stringify({
    orderId: 'free_1756570698930',
    amount: 0,
    planName: 'Pro',
    customerId: '+1234567890',
    phone: '+1234567890',
    duration: 30,
    originalDuration: 'month',
    planId: '68afef7d064116a45bc90a34'
  }),
  telegramLink: null,
  paymentCompleted: 'true' // Auto-set since payment not required
};

// Simulate window.currentBundleData
const window_currentBundleData = {
  id: '68b18784332382f6ec9df2e4',
  name: 'first group',
  featureToggles: { 
    enableESign: false, 
    enableKYC: false, 
    enablePayment: false 
  }
};

console.log('📋 Simulated localStorage:', localStorage_simulation);
console.log('📋 Simulated window.currentBundleData:', window_currentBundleData);
console.log('');

// Parse the data like the frontend does
let user = {};
let planData = {};

try {
  user = localStorage_simulation.user ? JSON.parse(localStorage_simulation.user) : {};
  planData = localStorage_simulation.paymentDetails ? JSON.parse(localStorage_simulation.paymentDetails) : {};
} catch (parseError) {
  console.error('❌ Error parsing stored data:', parseError);
}

const userId = user?._id || user?.id;
const bundleData = window_currentBundleData;
const bundleId = bundleData?.id || bundleData?._id;

console.log('🔍 Parsed Values:');
console.log('   userId:', userId, '(type:', typeof userId, ')');
console.log('   bundleId:', bundleId, '(type:', typeof bundleId, ')');
console.log('   planData.originalDuration:', planData.originalDuration, '(type:', typeof planData.originalDuration, ')');
console.log('');

// Check the conditions
const condition1 = bundleId && userId && planData.originalDuration;
const condition2 = userId && planData.originalDuration;

console.log('🎯 Condition Analysis:');
console.log('   bundleId exists:', !!bundleId);
console.log('   userId exists:', !!userId);
console.log('   originalDuration exists:', !!planData.originalDuration);
console.log('');
console.log('   Condition 1 (bundle-specific):', condition1);
console.log('   Condition 2 (user-specific):', condition2);
console.log('');

if (condition1) {
  console.log('✅ Would use bundle-specific endpoint: /api/invite/channel-bundle-links');
  console.log('📡 Request body would be:', {
    userId: userId,
    groupId: bundleId,
    duration: planData.originalDuration,
    paymentLinkId: localStorage_simulation.currentOrderId || null,
    planId: planData.orderId || planData.planId
  });
} else if (condition2) {
  console.log('⚠️  Would use user-specific endpoint: /api/invite/invite-link');
  console.log('📡 Request body would be:', {
    telegramUserId: userId,
    duration: planData.originalDuration
  });
} else {
  console.log('❌ Would use fallback generic endpoint');
  console.log('💡 Issue: Missing required data for plan-specific link generation');
  
  if (!bundleId) console.log('   - Missing bundle ID');
  if (!userId) console.log('   - Missing user ID');
  if (!planData.originalDuration) console.log('   - Missing plan duration');
}

console.log('');
console.log('🔧 Potential fixes:');
if (!userId) {
  console.log('   1. Fix user ID storage during login process');
  console.log('   2. Ensure user object is saved to localStorage after OTP verification');
}
if (!bundleId) {
  console.log('   1. Ensure window.currentBundleData is properly set');
  console.log('   2. Check that PublicGroup component loads bundle data correctly');
}
if (!planData.originalDuration) {
  console.log('   1. Fix plan selection storage in Card component');
  console.log('   2. Ensure originalDuration is included in paymentDetails');
}
