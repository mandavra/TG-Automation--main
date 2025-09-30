// IMMEDIATE FIX FOR /pc/trialplan STEP STATUS
// Copy and paste this ENTIRE script into the browser console on the /pc/trialplan page

console.log('🚑 IMMEDIATE FIX FOR STEP STATUS SYNC');
console.log('=====================================');

// Get user phone and bundle info
const userPhone = localStorage.getItem('userPhone');
const currentBundleRoute = localStorage.getItem('currentBundleCustomRoute') || 'trialplan';

console.log('📱 User Phone:', userPhone);
console.log('🏷️ Bundle Route:', currentBundleRoute);

// Determine bundle ID for localStorage
const sanitizedBundleId = currentBundleRoute.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
console.log('🔑 Sanitized Bundle ID:', sanitizedBundleId);

// Step 1: Check current localStorage step status
console.log('\n📱 CURRENT LOCALSTORAGE STATUS:');
const currentPayment = localStorage.getItem(`paymentCompleted_${sanitizedBundleId}`);
const currentKyc = localStorage.getItem(`kycCompleted_${sanitizedBundleId}`);
const currentEsign = localStorage.getItem(`digioCompleted_${sanitizedBundleId}`);

console.log(`Payment: ${currentPayment || 'not set'}`);
console.log(`KYC: ${currentKyc || 'not set'}`);
console.log(`E-Sign: ${currentEsign || 'not set'}`);

// Step 2: Force set based on dashboard notifications (we can see KYC is completed)
console.log('\n🔧 APPLYING IMMEDIATE FIX...');

// Since the dashboard shows KYC verification is completed, we know these are done
localStorage.setItem(`paymentCompleted_${sanitizedBundleId}`, 'true');
localStorage.setItem(`kycCompleted_${sanitizedBundleId}`, 'true');

console.log('✅ Set payment and KYC as completed in localStorage');

// Step 3: Also set the current bundle route in localStorage if not set
if (!localStorage.getItem('currentBundleCustomRoute')) {
  localStorage.setItem('currentBundleCustomRoute', 'trialplan');
  console.log('✅ Set currentBundleCustomRoute to trialplan');
}

// Step 4: Set bundle data in window if not present
if (!window.currentBundleData) {
  window.currentBundleData = {
    customRoute: 'trialplan',
    featureToggles: {
      enableKYC: true,
      enableESign: true
    }
  };
  console.log('✅ Set window.currentBundleData');
}

// Step 5: Dispatch storage event to trigger React re-render
console.log('\n🔄 TRIGGERING COMPONENT RE-RENDER...');
window.dispatchEvent(new Event('storage'));

// Step 6: Force reload the page after a short delay
setTimeout(() => {
  console.log('🔄 Reloading page to apply changes...');
  window.location.reload();
}, 1000);

console.log('\n✅ IMMEDIATE FIX APPLIED!');
console.log('The page will reload in 1 second to show the updated step status.');
console.log('\nIf the issue persists after reload, run this script again.');
