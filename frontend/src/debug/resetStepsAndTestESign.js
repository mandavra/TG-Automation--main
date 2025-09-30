// Comprehensive script to reset step completion and test E-Sign flow
// Run this in browser console

console.log('🚨 COMPREHENSIVE STEP RESET AND E-SIGN TEST');
console.log('===========================================');

// Step 1: Check current state
console.log('📋 CURRENT STATE CHECK:');
const userPhone = localStorage.getItem('userPhone');
const currentBundle = localStorage.getItem('currentBundleCustomRoute');
console.log('User phone:', userPhone);
console.log('Current bundle:', currentBundle);

// Step 2: Show all completion keys
console.log('\n📋 ALL COMPLETION KEYS IN LOCALSTORAGE:');
const completionKeys = [];
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('Completed') || key.includes('completed'))) {
        const value = localStorage.getItem(key);
        console.log(`   ${key}: "${value}"`);
        completionKeys.push(key);
    }
}

// Step 3: Set the correct completion state (Payment and KYC completed, E-Sign NOT completed)
console.log('\n🔧 SETTING CORRECT COMPLETION STATE:');
console.log('✅ Payment: completed');
console.log('✅ KYC: completed'); 
console.log('❌ E-Sign: NOT completed');

// Clear ALL completion keys first
completionKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`❌ Cleared: ${key}`);
});

// Set only Payment and KYC as completed
const bundleIds = [
    'trialplan',
    '68b9dac7dc0ac48040d4c212',
    'route_trialplan',
    '' // for general keys
];

bundleIds.forEach(bundleId => {
    const suffix = bundleId ? `_${bundleId}` : '';
    
    // Set payment as completed
    localStorage.setItem(`paymentCompleted${suffix}`, 'true');
    console.log(`✅ Set paymentCompleted${suffix} = "true"`);
    
    // Set KYC as completed  
    localStorage.setItem(`kycCompleted${suffix}`, 'true');
    console.log(`✅ Set kycCompleted${suffix} = "true"`);
    
    // Ensure E-Sign is NOT completed
    localStorage.removeItem(`digioCompleted${suffix}`);
    localStorage.removeItem(`esignCompleted${suffix}`);
});

// Step 4: Verify the state
console.log('\n✅ VERIFICATION:');
function checkCompletion(step) {
    const keys = [
        `${step}Completed_trialplan`,
        `${step}Completed_68b9dac7dc0ac48040d4c212`,
        `${step}Completed`,
        step === 'digio' ? 'digioCompleted_trialplan' : null,
        step === 'digio' ? 'digioCompleted' : null
    ].filter(Boolean);
    
    for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value) {
            return value;
        }
    }
    return null;
}

const paymentStatus = checkCompletion('payment');
const kycStatus = checkCompletion('kyc');
const digioStatus = checkCompletion('digio');
const esignStatus = checkCompletion('esign');

console.log(`Payment completed: ${paymentStatus}`);
console.log(`KYC completed: ${kycStatus}`);
console.log(`Digio completed: ${digioStatus}`);
console.log(`E-Sign completed: ${esignStatus}`);

// Step 5: Test navigation logic
console.log('\n🔍 NAVIGATION TEST:');
const canProceedToESign = userPhone && 
    paymentStatus && paymentStatus.toLowerCase() === 'true' &&
    kycStatus && kycStatus.toLowerCase() === 'true' &&
    (!digioStatus || digioStatus.toLowerCase() !== 'true') &&
    (!esignStatus || esignStatus.toLowerCase() !== 'true');

console.log(`Can proceed to E-Sign: ${canProceedToESign}`);

if (canProceedToESign) {
    console.log('✅ All prerequisites met for E-Sign');
    console.log('🚀 Should be able to proceed to Step 4');
} else {
    console.log('❌ Prerequisites not met:');
    if (!userPhone) console.log('   - No user phone');
    if (!paymentStatus || paymentStatus.toLowerCase() !== 'true') console.log('   - Payment not completed');
    if (!kycStatus || kycStatus.toLowerCase() !== 'true') console.log('   - KYC not completed');
    if (digioStatus && digioStatus.toLowerCase() === 'true') console.log('   - Digio already completed');
    if (esignStatus && esignStatus.toLowerCase() === 'true') console.log('   - E-Sign already completed');
}

// Step 6: Force refresh components and navigate back
console.log('\n🔄 REFRESHING COMPONENTS...');
window.dispatchEvent(new Event('storage'));

// Clear any cached completion checks
if (window.currentBundleData) {
    console.log('📦 Bundle data available');
} else {
    console.log('❌ No bundle data - this might cause issues');
}

// Navigate back to bundle page
setTimeout(() => {
    console.log('🏠 Navigating back to bundle page...');
    window.location.href = '/pc/trialplan';
}, 2000);

console.log('\n💡 EXPECTED RESULT:');
console.log('   - Step 1: ✅ Completed (green)');
console.log('   - Step 2: ✅ Completed (green)'); 
console.log('   - Step 3: ✅ Completed (green)');
console.log('   - Step 4: 🔴 Current (red) - should be clickable');
console.log('');
console.log('Click on Step 4 to proceed to E-Sign!');
