// IMMEDIATE DEBUG CHECK FOR /pc/trialplan STEP STATUS ISSUE
// Copy and paste this in the browser console on the /pc/trialplan page

console.log('🔍 IMMEDIATE STEP STATUS DEBUG');
console.log('==============================');

// Check current URL
console.log('🌐 Current URL:', window.location.href);

// Check user phone
const userPhone = localStorage.getItem('userPhone');
console.log('📱 User Phone:', userPhone);

// Check current bundle route
const currentBundleRoute = localStorage.getItem('currentBundleCustomRoute');
console.log('🏷️ Current Bundle Route:', currentBundleRoute);

// Check bundle data
console.log('📦 Window Bundle Data:', window.currentBundleData);

// Check localStorage step completion
const bundleId = currentBundleRoute || 'trialplan';
const sanitizedBundleId = bundleId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);

console.log('\n📱 LOCALSTORAGE STEP STATUS:');
console.log('Bundle ID used:', sanitizedBundleId);
console.log('Payment:', localStorage.getItem(`paymentCompleted_${sanitizedBundleId}`));
console.log('KYC:', localStorage.getItem(`kycCompleted_${sanitizedBundleId}`));
console.log('E-Sign:', localStorage.getItem(`digioCompleted_${sanitizedBundleId}`));

// Check ALL possible localStorage keys for this user
console.log('\n🔑 ALL LOCALSTORAGE KEYS RELATED TO STEPS:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.includes('Completed') || key.includes('payment') || key.includes('kyc') || key.includes('digio')) {
    console.log(`${key}: ${localStorage.getItem(key)}`);
  }
}

// Manual database check function
window.manualDbCheck = async function() {
  if (!userPhone) {
    console.error('❌ No user phone available for database check');
    return;
  }
  
  console.log('\n💾 MANUAL DATABASE STATUS CHECK:');
  
  const endpoints = {
    payment: `http://localhost:4000/api/user/payment-status/${userPhone}/${bundleId}`,
    kyc: `http://localhost:4000/api/user/kyc-status/${userPhone}`,
    esign: `http://localhost:4000/api/user/esign-status/${userPhone}`
  };
  
  for (const [step, endpoint] of Object.entries(endpoints)) {
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      console.log(`${step.toUpperCase()}:`, {
        success: data.success,
        completed: data.completed || data.isCompleted,
        completedAt: data.completedAt,
        response: data
      });
    } catch (error) {
      console.log(`${step.toUpperCase()}: ❌ Error -`, error.message);
    }
  }
};

// Force sync localStorage with what SHOULD be the correct values
window.forceSyncLocalStorage = function() {
  console.log('\n🔄 FORCE SYNCING LOCALSTORAGE...');
  
  // Set the steps as completed based on the dashboard notifications
  localStorage.setItem(`paymentCompleted_${sanitizedBundleId}`, 'true');
  localStorage.setItem(`kycCompleted_${sanitizedBundleId}`, 'true');
  
  console.log('✅ Forced payment and KYC to completed in localStorage');
  console.log('🔄 Refresh the page to see if it updates');
};

// Force refresh the HowItWorks component
window.forceRefreshComponent = function() {
  console.log('\n🔄 ATTEMPTING TO FORCE REFRESH COMPONENT...');
  
  // Try to trigger a re-render by dispatching events
  window.dispatchEvent(new Event('storage'));
  
  // Try to reload just the component section
  const howItWorksSection = document.querySelector('[class*="How"]') || document.querySelector('[class*="how"]');
  if (howItWorksSection) {
    console.log('🎯 Found How it Works section, attempting refresh...');
    howItWorksSection.style.opacity = '0.5';
    setTimeout(() => {
      howItWorksSection.style.opacity = '1';
      window.location.reload();
    }, 1000);
  } else {
    console.log('📄 How it Works section not found, doing full page reload...');
    window.location.reload();
  }
};

// Auto-run manual database check
console.log('\n🔄 Running automatic database check...');
window.manualDbCheck();

console.log('\n📋 AVAILABLE FUNCTIONS:');
console.log('• manualDbCheck() - Check database status manually');
console.log('• forceSyncLocalStorage() - Force sync localStorage values');
console.log('• forceRefreshComponent() - Force refresh the component');

console.log('\n💡 SUGGESTED ACTIONS:');
console.log('1. First run: manualDbCheck()');
console.log('2. If database shows completed but UI does not, run: forceSyncLocalStorage()');
console.log('3. Then run: forceRefreshComponent()');
