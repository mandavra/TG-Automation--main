// 🧪 Payment Status Test Script
// Run this in the browser console on the bundle page (localhost:5173/pc/trialplan)

console.log('🧪 Payment Status Test Script Starting...');

// Test 1: Check current state
function checkCurrentState() {
    console.log('\n📋 Current State:');
    console.log('  User Phone:', localStorage.getItem('userPhone'));
    console.log('  Is Authenticated:', localStorage.getItem('isAuthenticated'));
    console.log('  Bundle Data Available:', !!window.currentBundleData);
    
    if (window.currentBundleData) {
        console.log('  Bundle ID:', window.currentBundleData._id || window.currentBundleData.id);
        console.log('  Custom Route:', window.currentBundleData.customRoute);
        console.log('  Feature Toggles:', window.currentBundleData.featureToggles);
    }
    
    // Check payment keys
    const paymentKeys = Object.keys(localStorage).filter(key => key.includes('paymentCompleted'));
    console.log('  Payment Keys:', paymentKeys);
    paymentKeys.forEach(key => {
        console.log(`    ${key}: ${localStorage.getItem(key)}`);
    });
}

// Test 2: Simulate payment completion
function simulatePaymentSuccess() {
    console.log('\n🎯 Simulating Payment Success...');
    
    if (!window.currentBundleData) {
        console.error('❌ No bundle data available - wait for page to load');
        return;
    }
    
    const bundleId = window.currentBundleData._id || window.currentBundleData.id;
    if (!bundleId) {
        console.error('❌ No bundle ID found');
        return;
    }
    
    // Create the same key that featureToggleUtils would create
    const sanitizedBundleId = bundleId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const paymentKey = `paymentCompleted_${sanitizedBundleId}`;
    
    console.log(`✅ Setting payment key: ${paymentKey} = true`);
    localStorage.setItem(paymentKey, 'true');
    
    // Force refresh the steps component
    window.dispatchEvent(new Event('storage'));
    
    console.log('✅ Payment completion simulated!');
    console.log('🔄 Check if Step 2 now shows green checkmark');
}

// Test 3: Check next step logic
function checkNextStep() {
    console.log('\n🎯 Checking Next Step Logic...');
    
    if (!window.currentBundleData) {
        console.error('❌ No bundle data available');
        return;
    }
    
    const featureToggles = window.currentBundleData.featureToggles || { enableKYC: true, enableESign: true };
    console.log('Feature Toggles:', featureToggles);
    
    const userPhone = localStorage.getItem('userPhone');
    const bundleId = window.currentBundleData._id || window.currentBundleData.id;
    const sanitizedBundleId = bundleId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const paymentCompleted = localStorage.getItem(`paymentCompleted_${sanitizedBundleId}`);
    const kycCompleted = localStorage.getItem(`kycCompleted_${sanitizedBundleId}`);
    const digioCompleted = localStorage.getItem(`digioCompleted_${sanitizedBundleId}`);
    
    console.log('Step Status:');
    console.log(`  User Phone: ${userPhone ? '✅' : '❌'} ${userPhone}`);
    console.log(`  Payment: ${paymentCompleted === 'true' ? '✅' : '❌'} ${paymentCompleted}`);
    console.log(`  KYC: ${kycCompleted ? '✅' : '❌'} ${kycCompleted} (required: ${featureToggles.enableKYC})`);
    console.log(`  E-Sign: ${digioCompleted ? '✅' : '❌'} ${digioCompleted} (required: ${featureToggles.enableESign})`);
    
    // Determine next step
    if (!userPhone) {
        console.log('👉 Next Step: Register/Login');
    } else if (!paymentCompleted || paymentCompleted !== 'true') {
        console.log('👉 Next Step: Payment');
    } else if (featureToggles.enableKYC && !kycCompleted) {
        console.log('👉 Next Step: KYC (/kycForm)');
    } else if (featureToggles.enableESign && !digioCompleted) {
        console.log('👉 Next Step: E-Sign (/digio)');
    } else {
        console.log('👉 Next Step: All completed - Dashboard');
    }
}

// Test 4: Test API purchase check
async function testPurchaseCheck() {
    console.log('\n🔍 Testing Purchase Check API...');
    
    const userPhone = localStorage.getItem('userPhone');
    const bundleId = window.currentBundleData?._id || window.currentBundleData?.id;
    
    if (!userPhone || !bundleId) {
        console.error('❌ Missing userPhone or bundleId');
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:4000/api/user/check-purchase/${userPhone}/${bundleId}`);
        const data = await response.json();
        console.log('📡 Purchase Check Response:', data);
        
        if (data.success && data.hasPurchased) {
            console.log('✅ User has purchased this bundle!');
            console.log('💳 Payment Status:', data.subscription?.status);
        } else {
            console.log('❌ No purchase found');
        }
    } catch (error) {
        console.error('❌ API Error:', error);
    }
}

// Test 5: Clear all payment data
function clearPaymentData() {
    console.log('\n🧹 Clearing Payment Data...');
    const paymentKeys = Object.keys(localStorage).filter(key => key.includes('paymentCompleted'));
    paymentKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed: ${key}`);
    });
    
    // Also clear related data
    localStorage.removeItem('currentOrderId');
    localStorage.removeItem('paymentDetails');
    localStorage.removeItem('telegramLink');
    
    // Force refresh
    window.dispatchEvent(new Event('storage'));
    console.log('✅ Payment data cleared');
}

// Auto-run initial check
checkCurrentState();

// Export functions for manual use
window.paymentTest = {
    checkCurrentState,
    simulatePaymentSuccess,
    checkNextStep,
    testPurchaseCheck,
    clearPaymentData
};

console.log('\n🎮 Available Test Functions:');
console.log('  paymentTest.checkCurrentState() - Check current status');
console.log('  paymentTest.simulatePaymentSuccess() - Mark payment as complete');
console.log('  paymentTest.checkNextStep() - Check next step logic');
console.log('  paymentTest.testPurchaseCheck() - Test purchase API');
console.log('  paymentTest.clearPaymentData() - Clear all payment data');
console.log('\n💡 Try: paymentTest.simulatePaymentSuccess() to test the fix!');
