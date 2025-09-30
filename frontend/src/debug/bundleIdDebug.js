// Debug script to check getCurrentBundleId and localStorage keys
// Run this in browser console

console.log('🔍 BUNDLE ID DEBUG');
console.log('==================');

// Check what getCurrentBundleId returns
const bundleData = window.currentBundleData;
console.log('window.currentBundleData:', bundleData);
console.log('bundleData?._id:', bundleData?._id);
console.log('bundleData?.id:', bundleData?.id);

// Check URL path
const path = window.location.pathname;
console.log('Current path:', path);

// Simulate getCurrentBundleId logic
let bundleId;
if (bundleData?._id || bundleData?.id) {
    bundleId = bundleData._id || bundleData.id;
    console.log('Bundle ID from bundleData:', bundleId);
} else if (path.startsWith('/pc/')) {
    const route = path.split('/pc/')[1];
    bundleId = `route_${route}`;
    console.log('Bundle ID from URL route:', bundleId);
} else {
    bundleId = 'default';
    console.log('Bundle ID using default:', bundleId);
}

// Check what the key should be
const sanitizedBundleId = bundleId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
const kycKey = `kycCompleted_${sanitizedBundleId}`;

console.log('Final sanitized bundle ID:', sanitizedBundleId);
console.log('Expected KYC key:', kycKey);
console.log('Value at that key:', localStorage.getItem(kycKey));

// Check all localStorage keys that might contain KYC
console.log('\n📋 All localStorage keys containing "kyc":');
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    if (key && key.toLowerCase().includes('kyc')) {
        console.log(`   ${key}: "${value}"`);
    }
}

// Check alternative formats
const altKeys = [
    'kycCompleted_trialplan',
    'kycCompleted_68b9dac7dc0ac48040d4c212', // the actual bundle ID from logs
    'kycCompleted_route_trialplan',
    'kycCompleted',
    'kycStatus'
];

console.log('\n🔍 Checking alternative key formats:');
altKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`   ${key}: "${value}"`);
});

console.log('\n🔧 IMMEDIATE FIX:');
console.log('Setting KYC completed for all possible keys...');

// Set KYC as completed for all possible formats
localStorage.setItem(kycKey, 'true');
localStorage.setItem('kycCompleted_trialplan', 'true');
localStorage.setItem('kycCompleted_68b9dac7dc0ac48040d4c212', 'true');
localStorage.setItem('kycCompleted_route_trialplan', 'true');
localStorage.setItem('kycCompleted', 'true');

console.log('✅ KYC set for all key formats');

// Trigger refresh
window.dispatchEvent(new Event('storage'));
console.log('🔄 Storage event triggered');

// Check if it worked
setTimeout(() => {
    console.log('\n✅ VERIFICATION:');
    console.log('KYC key value now:', localStorage.getItem(kycKey));
    
    // Force reload if still not working
    setTimeout(() => {
        console.log('🔄 Reloading page...');
        window.location.reload();
    }, 2000);
}, 500);
