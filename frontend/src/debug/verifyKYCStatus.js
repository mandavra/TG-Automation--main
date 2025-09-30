/**
 * KYC Status Verification and Fix Script
 * 
 * Run this in browser console on the bundle page to check and fix KYC status
 * 
 * Usage:
 * 1. Open bundle page (e.g., /pc/trialplan)
 * 2. Open browser console (F12)
 * 3. Paste and run this script
 */

window.checkKYCStatus = () => {
    const currentBundle = localStorage.getItem('currentBundleCustomRoute');
    const kycKey = `kycCompleted_${currentBundle}`;
    const kycStatus = localStorage.getItem(kycKey);
    
    console.log('🔍 KYC Status Check:');
    console.log('   Current bundle:', currentBundle);
    console.log('   KYC key:', kycKey);
    console.log('   KYC status value:', kycStatus);
    console.log('   KYC status type:', typeof kycStatus);
    console.log('   Is exactly "true"?', kycStatus === 'true');
    console.log('   Is truthy?', !!kycStatus);
    
    // Show all bundle-specific localStorage keys
    const bundleKeys = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(currentBundle)) {
            bundleKeys[key] = localStorage.getItem(key);
        }
    }
    console.log('📋 All bundle-specific localStorage keys:', bundleKeys);
    
    return {
        currentBundle,
        kycStatus,
        isComplete: kycStatus === 'true',
        allBundleKeys: bundleKeys
    };
};

window.fixKYCStatus = () => {
    const currentBundle = localStorage.getItem('currentBundleCustomRoute');
    const kycKey = `kycCompleted_${currentBundle}`;
    
    console.log('🔧 Fixing KYC status...');
    console.log('   Setting', kycKey, 'to "true"');
    
    localStorage.setItem(kycKey, 'true');
    
    // Trigger storage event to refresh components
    window.dispatchEvent(new Event('storage'));
    
    console.log('✅ KYC status fixed and storage event triggered');
    console.log('🔄 Components should now refresh to show KYC as completed');
    
    // Verify the fix
    setTimeout(() => {
        const newStatus = localStorage.getItem(kycKey);
        console.log('✓ Verification - KYC status now:', newStatus);
    }, 100);
};

window.forceRefreshSteps = () => {
    console.log('🔄 Force refreshing step components...');
    
    // Trigger multiple storage events to ensure all components refresh
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new StorageEvent('storage'));
    
    // Also force a page reload after a short delay
    setTimeout(() => {
        console.log('🔄 Reloading page to ensure fresh state...');
        window.location.reload();
    }, 2000);
};

console.log('🎯 KYC Status utilities loaded!');
console.log('📝 Available commands:');
console.log('   - checkKYCStatus() - Check current KYC completion status');
console.log('   - fixKYCStatus() - Force set KYC as completed');
console.log('   - forceRefreshSteps() - Force refresh step components');
console.log('');
console.log('💡 Run checkKYCStatus() first to diagnose the issue');

// Auto-run status check
setTimeout(() => {
    console.log('🏃‍♂️ Auto-running KYC status check...');
    window.checkKYCStatus();
}, 1000);
