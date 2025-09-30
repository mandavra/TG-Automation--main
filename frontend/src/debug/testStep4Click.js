// Debug script to test Step 4 (E-Sign) click behavior
// Run this in browser console on the bundle page

console.log('🔍 TESTING STEP 4 (E-SIGN) CLICK BEHAVIOR');
console.log('=========================================');

// Get current status
const userPhone = localStorage.getItem('userPhone');
const currentBundle = localStorage.getItem('currentBundleCustomRoute');

console.log('📱 User phone:', userPhone);
console.log('📦 Current bundle:', currentBundle);

// Check step completion status
function getBundleSpecificValue(key) {
    // Try multiple possible key formats
    const possibleKeys = [
        `${key}_${currentBundle}`,
        `${key}_68b9dac7dc0ac48040d4c212`, // actual bundle ID
        `${key}_route_${currentBundle}`,
        key
    ];
    
    for (const possibleKey of possibleKeys) {
        const value = localStorage.getItem(possibleKey);
        if (value) {
            console.log(`   Found ${key} at key: ${possibleKey} = "${value}"`);
            return value;
        }
    }
    
    console.log(`   ${key} not found in any format`);
    return null;
}

const paymentCompleted = getBundleSpecificValue('paymentCompleted');
const kycCompleted = getBundleSpecificValue('kycCompleted'); 
const digioCompleted = getBundleSpecificValue('digioCompleted');

console.log('');
console.log('🔍 Step Completion Status:');
console.log('   Payment completed:', paymentCompleted);
console.log('   KYC completed:', kycCompleted);
console.log('   Digio completed:', digioCompleted);

// Check prerequisites for E-Sign step
console.log('');
console.log('🔍 E-Sign Prerequisites Check:');

// Check if payment is required and completed
const paymentCheck = !paymentCompleted || paymentCompleted.toLowerCase() !== 'true';
console.log('   Payment prerequisite failed:', paymentCheck);

// Check if KYC is required and completed  
const kycCheck = !kycCompleted || kycCompleted.toLowerCase() !== 'true';
console.log('   KYC prerequisite failed:', kycCheck);

// Check if user can proceed to E-Sign
const canProceedToESign = userPhone && !paymentCheck && !kycCheck;
console.log('   Can proceed to E-Sign:', canProceedToESign);

if (canProceedToESign) {
    console.log('✅ All prerequisites met - should navigate to /digio');
} else {
    console.log('❌ Prerequisites not met:');
    if (!userPhone) console.log('   - No user phone');
    if (paymentCheck) console.log('   - Payment not completed');
    if (kycCheck) console.log('   - KYC not completed');
}

// Test manual navigation
console.log('');
console.log('🧪 MANUAL TEST:');
console.log('Run this command to manually navigate to Digio:');
console.log('window.location.href = "/digio"');

// Test the actual step click function
console.log('');
console.log('🎯 SIMULATING STEP 4 CLICK:');

if (!userPhone) {
    console.log('❌ Would redirect to /login (no user phone)');
} else if (paymentCheck) {
    console.log('❌ Would block navigation (payment not completed)');
} else if (kycCheck) {
    console.log('❌ Would block navigation (KYC not completed)');
} else {
    console.log('✅ Would navigate to /digio');
    console.log('');
    console.log('💡 If Step 4 is not clickable, the issue might be in the isClickable() function');
    console.log('💡 or the step status calculation');
}

// Quick fix - manually navigate to digio
window.testDigioNavigation = () => {
    console.log('🚀 Manually navigating to Digio...');
    window.location.href = '/digio';
};

console.log('');
console.log('🔧 QUICK FIX AVAILABLE:');
console.log('Run: testDigioNavigation() to manually navigate to E-Sign page');
