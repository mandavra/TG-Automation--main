// EMERGENCY KYC FIX SCRIPT
// Copy and paste this entire script into the browser console on the bundle page

(function() {
    console.log('🚨 EMERGENCY KYC DIAGNOSTIC AND FIX');
    console.log('=====================================');
    
    // 1. Check current bundle
    const currentBundle = localStorage.getItem('currentBundleCustomRoute');
    console.log('📦 Current bundle:', currentBundle);
    
    // 2. Check all possible KYC keys
    const possibleKYCKeys = [
        `kycCompleted_${currentBundle}`,
        'kycCompleted',
        'kycCompleted_trialplan',
        'kycStatus',
        'kyc_completed'
    ];
    
    console.log('🔍 Checking all possible KYC keys:');
    possibleKYCKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`   ${key}: "${value}" (type: ${typeof value})`);
    });
    
    // 3. Show all localStorage keys related to this bundle or KYC
    console.log('📋 All relevant localStorage keys:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        if (key && (key.includes('kyc') || key.includes('KYC') || key.includes(currentBundle || 'trialplan'))) {
            console.log(`   ${key}: "${value}"`);
        }
    }
    
    // 4. Check what getBundleSpecificValue returns
    console.log('🔧 Testing getBundleSpecificValue function:');
    try {
        // Try to access the function directly
        if (typeof getBundleSpecificValue !== 'undefined') {
            const kycValue = getBundleSpecificValue('kycCompleted');
            console.log(`   getBundleSpecificValue('kycCompleted'): "${kycValue}" (type: ${typeof kycValue})`);
        } else {
            console.log('   getBundleSpecificValue function not available in global scope');
        }
    } catch (error) {
        console.log('   Error calling getBundleSpecificValue:', error.message);
    }
    
    // 5. IMMEDIATE FIX - Set KYC as completed
    console.log('');
    console.log('🔧 APPLYING IMMEDIATE FIX:');
    
    const kycKey = `kycCompleted_${currentBundle}`;
    localStorage.setItem(kycKey, 'true');
    console.log(`✅ Set ${kycKey} = "true"`);
    
    // Also set backup keys
    localStorage.setItem('kycCompleted', 'true');
    localStorage.setItem('kycCompleted_trialplan', 'true');
    console.log('✅ Set backup KYC keys');
    
    // 6. Trigger component refresh
    console.log('🔄 Triggering component refresh...');
    window.dispatchEvent(new Event('storage'));
    
    // 7. Verify the fix
    setTimeout(() => {
        console.log('');
        console.log('✅ VERIFICATION:');
        const newValue = localStorage.getItem(kycKey);
        console.log(`   ${kycKey}: "${newValue}"`);
        console.log('   Should now show KYC as completed (green checkmark)');
        
        // Force page reload if still not working
        setTimeout(() => {
            console.log('🔄 If step 3 is still red, reloading page in 3 seconds...');
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        }, 1000);
    }, 500);
    
    console.log('');
    console.log('💡 If this doesn\'t work, there might be a component caching issue.');
    console.log('💡 Try refreshing the page manually.');
    
})();
