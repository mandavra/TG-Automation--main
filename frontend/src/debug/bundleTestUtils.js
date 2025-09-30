// Bundle Testing Utilities
// Add these functions to browser console for debugging

window.BundleTestUtils = {
  // Clear all bundle-specific localStorage data
  clearAllBundleData: () => {
    const keys = Object.keys(localStorage);
    let cleared = 0;
    
    keys.forEach(key => {
      if (key.includes('_route_') || key.includes('_default') || 
          key.includes('paymentCompleted_') || 
          key.includes('kycCompleted_') || 
          key.includes('digioCompleted_')) {
        localStorage.removeItem(key);
        cleared++;
        console.log('🗑️ Cleared:', key);
      }
    });
    
    // Also clear some global ones that might interfere
    ['paymentCompleted', 'kycCompleted', 'digioCompleted', 'userPhone', 'user', 'isAuthenticated'].forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log('🗑️ Cleared global:', key);
        cleared++;
      }
    });
    
    console.log(`✅ Cleared ${cleared} localStorage entries`);
  },

  // Check current bundle status
  checkBundleStatus: () => {
    console.log('=== BUNDLE STATUS CHECK ===');
    console.log('Current URL:', window.location.pathname);
    console.log('Bundle data in window:', window.currentBundleData);
    
    if (window.currentBundleData) {
      console.log('Bundle ID:', window.currentBundleData._id || window.currentBundleData.id);
      console.log('Bundle name:', window.currentBundleData.name);
      console.log('Custom route:', window.currentBundleData.customRoute);
      console.log('Feature toggles:', window.currentBundleData.featureToggles);
    }
    
    // Check bundle-specific localStorage
    const getCurrentBundleId = () => {
      const bundleData = window.currentBundleData;
      if (bundleData?._id || bundleData?.id) {
        return bundleData._id || bundleData.id;
      }
      
      const path = window.location.pathname;
      if (path.startsWith('/pc/')) {
        const route = path.split('/pc/')[1];
        return `route_${route}`;
      }
      
      return 'default';
    };
    
    const bundleId = getCurrentBundleId();
    console.log('Computed bundle ID:', bundleId);
    
    const bundleKeys = [`paymentCompleted_${bundleId}`, `kycCompleted_${bundleId}`, `digioCompleted_${bundleId}`];
    console.log('Bundle-specific localStorage:');
    bundleKeys.forEach(key => {
      console.log(`  ${key}:`, localStorage.getItem(key));
    });
  },

  // Test specific bundle route
  testBundleRoute: async (route) => {
    try {
      console.log(`🧪 Testing bundle route: ${route}`);
      const response = await fetch(`/api/groups/by-route/${route}`);
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success && (data.group || data.id)) {
        const bundleData = data.group || data;
        console.log('Bundle data:', bundleData);
        console.log('Feature toggles:', bundleData.featureToggles);
        return bundleData;
      } else {
        console.error('Bundle not found or error:', data);
      }
    } catch (error) {
      console.error('Error testing route:', error);
    }
  },

  // Set feature toggles for testing
  setTestToggles: (enablePayment = false, enableKYC = false, enableESign = false) => {
    if (window.currentBundleData) {
      window.currentBundleData.featureToggles = {
        enablePayment,
        enableKYC,
        enableESign
      };
      console.log('🎛️ Set test toggles:', window.currentBundleData.featureToggles);
      console.log('🔄 Reload the page to see changes');
    } else {
      console.error('❌ No bundle data found. Load a bundle page first.');
    }
  },

  // Test direct telegram link generation
  testTelegramLink: async () => {
    try {
      console.log('🔗 Testing telegram link generation...');
      const response = await fetch('http://localhost:4000/api/invite/invite-link');
      const data = await response.json();
      console.log('Telegram link response:', data);
      return data.link;
    } catch (error) {
      console.error('Error testing telegram link:', error);
    }
  },

  // Get all localStorage bundle data
  getAllBundleData: () => {
    const keys = Object.keys(localStorage);
    const bundleData = {};
    
    keys.forEach(key => {
      if (key.includes('_route_') || key.includes('_default') || 
          key.includes('paymentCompleted_') || 
          key.includes('kycCompleted_') || 
          key.includes('digioCompleted_')) {
        bundleData[key] = localStorage.getItem(key);
      }
    });
    
    console.log('📊 All bundle-specific localStorage data:', bundleData);
    return bundleData;
  }
};

console.log('🛠️ Bundle Test Utils loaded. Available functions:');
console.log('   BundleTestUtils.clearAllBundleData() - Clear all bundle localStorage');
console.log('   BundleTestUtils.checkBundleStatus() - Check current bundle status');
console.log('   BundleTestUtils.testBundleRoute(route) - Test specific route');
console.log('   BundleTestUtils.setTestToggles(payment, kyc, esign) - Set test toggles');
console.log('   BundleTestUtils.testTelegramLink() - Test telegram link');
console.log('   BundleTestUtils.getAllBundleData() - Get all bundle localStorage');
