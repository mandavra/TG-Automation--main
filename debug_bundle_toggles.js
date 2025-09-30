// Debug script to test bundle feature toggles
// Run this in browser console on a bundle page

console.log('=== BUNDLE DEBUG INFORMATION ===');

// Check current bundle data
console.log('1. window.currentBundleData:', window.currentBundleData);

// Check localStorage for bundle-specific values
const getCurrentBundleId = () => {
  const bundleData = window.currentBundleData;
  if (bundleData?._id) {
    return bundleData._id;
  }
  
  const path = window.location.pathname;
  if (path.startsWith('/pc/')) {
    const route = path.split('/pc/')[1];
    return `route_${route}`;
  }
  
  return 'default';
};

const bundleId = getCurrentBundleId();
console.log('2. Current bundle ID:', bundleId);

// Check feature toggles
const featureToggles = window.currentBundleData?.featureToggles;
console.log('3. Feature toggles from bundle:', featureToggles);

// Check bundle-specific localStorage values
const paymentKey = `paymentCompleted_${bundleId}`;
const kycKey = `kycCompleted_${bundleId}`;
const digioKey = `digioCompleted_${bundleId}`;

console.log('4. Bundle-specific localStorage keys:');
console.log('   Payment key:', paymentKey, '=', localStorage.getItem(paymentKey));
console.log('   KYC key:', kycKey, '=', localStorage.getItem(kycKey));
console.log('   Digio key:', digioKey, '=', localStorage.getItem(digioKey));

// Check global localStorage values (these should not be used anymore)
console.log('5. Global localStorage values (should be ignored):');
console.log('   paymentCompleted:', localStorage.getItem('paymentCompleted'));
console.log('   kycCompleted:', localStorage.getItem('kycCompleted'));
console.log('   digioCompleted:', localStorage.getItem('digioCompleted'));

// Test feature toggle functions
try {
  // Import the functions (this might not work in console, but shows the concept)
  console.log('6. Feature toggle function results (if available):');
  console.log('   URL path:', window.location.pathname);
  console.log('   Should show payment step:', featureToggles?.enablePayment);
  console.log('   Should show KYC step:', featureToggles?.enableKYC);
  console.log('   Should show e-sign step:', featureToggles?.enableESign);
} catch (e) {
  console.log('   Feature toggle functions not available in console');
}

console.log('=== END DEBUG ===');
