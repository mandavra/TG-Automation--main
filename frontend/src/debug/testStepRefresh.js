/**
 * Test Step Status Refresh Script
 * 
 * Run this script in the browser console on a bundle page to test
 * if the HowItWorks component properly refreshes step statuses.
 * 
 * Usage:
 * 1. Open bundle page (e.g., /pc/trialplan)
 * 2. Open browser console (F12)
 * 3. Paste and run this script
 * 4. Check if the "How It Works" section updates
 */

window.testStepRefresh = async () => {
    console.log('🧪 Testing step status refresh...');
    
    // Get current localStorage state
    const userPhone = localStorage.getItem('userPhone');
    const currentBundle = localStorage.getItem('currentBundleCustomRoute');
    
    console.log('📋 Current context:', {
        userPhone,
        currentBundle,
        paymentCompleted: localStorage.getItem(`paymentCompleted_${currentBundle}`),
        kycCompleted: localStorage.getItem(`kycCompleted_${currentBundle}`),
        digioCompleted: localStorage.getItem(`digioCompleted_${currentBundle}`)
    });
    
    if (!userPhone) {
        console.error('❌ User not logged in');
        return;
    }
    
    // Force trigger storage event to refresh components
    console.log('🔄 Triggering storage event...');
    window.dispatchEvent(new Event('storage'));
    
    // Force page refresh if needed
    console.log('🔄 You can refresh the page to see updated step status');
    
    // Optionally force refresh after 2 seconds
    setTimeout(() => {
        console.log('🔄 Auto-refreshing page in 3 seconds...');
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }, 2000);
};

// Also provide quick status check function
window.checkStepStatus = () => {
    const currentBundle = localStorage.getItem('currentBundleCustomRoute');
    console.log('📊 Current Step Status:', {
        bundle: currentBundle,
        payment: localStorage.getItem(`paymentCompleted_${currentBundle}`),
        kyc: localStorage.getItem(`kycCompleted_${currentBundle}`),
        digio: localStorage.getItem(`digioCompleted_${currentBundle}`)
    });
};

console.log('🎯 Step refresh test utilities loaded!');
console.log('📝 Available commands:');
console.log('   - testStepRefresh() - Test step status refresh');
console.log('   - checkStepStatus() - Check current step status');
console.log('');
console.log('💡 Tip: Run testStepRefresh() to test if HowItWorks section updates');
