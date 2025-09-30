// Debug script to help verify frontend cache and localStorage
console.log(`
🔍 FRONTEND DEBUGGING INSTRUCTIONS

Please open your browser's developer console on the bundle page and run these commands:

1. Check localStorage for bundle-specific data:
   console.log('Auth status:', localStorage.getItem('isAuthenticated'));
   console.log('User phone:', localStorage.getItem('userPhone'));
   console.log('Payment completed (maintest):', localStorage.getItem('paymentCompleted_maintest'));
   console.log('Telegram link (maintest):', localStorage.getItem('telegramLink_maintest'));
   console.log('KYC completed (maintest):', localStorage.getItem('kycCompleted_maintest'));
   console.log('Digio completed (maintest):', localStorage.getItem('digioCompleted_maintest'));

2. Check sessionStorage for subscription cache:
   console.log('Subscription cache:', sessionStorage.getItem('subscription_68c2620ddb378c8123cad634_917020025010'));

3. Check if BundleCard component has correct userSubscription state:
   // This will be available if you add a temporary debug log in BundleCard

4. Clear all caches and force fresh data:
   localStorage.clear();
   sessionStorage.clear();
   location.reload(true);

5. Check if the subscription API is being called by monitoring Network tab for:
   - /api/user/check-purchase/917020025010/68c2620ddb378c8123cad634

6. Check current bundle data:
   console.log('Current bundle data:', window.currentBundleData);

The issue appears to be that BundleCard component isn't updating its button text even though:
- API returns correct subscription data (hasActiveSubscription: true)
- Expected button text should be "Extend Subscription"
- But UI shows "Subscribe Now"

This suggests either:
- Component state not updating after API call
- API call not being made due to missing auth/phone data
- Race condition where render happens before subscription check completes
- Browser cache serving stale component code
`);

// Also create a simple server endpoint tester
console.log('\n🌐 Testing server endpoints...');

async function testEndpoints() {
  const endpoints = [
    'http://localhost:4000/api/user/check-purchase/917020025010/68c2620ddb378c8123cad634',
    'http://localhost:4000/api/public/group/maintest'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      console.log(`✅ ${endpoint.split('/').pop()}: ${response.status} ${response.ok ? '✓' : '✗'}`);
      if (!response.ok) {
        console.log('   Error:', data);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.split('/').pop()}: ${error.message}`);
    }
  }
}

testEndpoints();
