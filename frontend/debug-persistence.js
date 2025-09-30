// ENHANCED DEBUG SCRIPT WITH BULLETPROOF PERSISTENCE
// Copy this entire script and paste it into your browser console for advanced debugging

// Enhanced Debug Utility with Database Persistence
window.debugPersistence = {
  
  // Check comprehensive step status from both localStorage and database
  async checkComprehensiveStatus() {
    const userPhone = localStorage.getItem('userPhone');
    const bundleRoute = localStorage.getItem('currentBundleCustomRoute') || 'default';
    
    if (!userPhone) {
      console.error('❌ No user phone found');
      return;
    }
    
    console.log('\n📊 COMPREHENSIVE STEP STATUS CHECK');
    console.log('=================================');
    console.log(`📱 User Phone: ${userPhone}`);
    console.log(`🏷️ Bundle Route: ${bundleRoute}`);
    console.log(`🎯 Current URL: ${window.location.href}`);
    console.log(`📦 Bundle Data:`, window.currentBundleData);
    
    // Check localStorage status
    const localStorage_payment = localStorage.getItem(`paymentCompleted_${bundleRoute.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)}`);
    const localStorage_kyc = localStorage.getItem(`kycCompleted_${bundleRoute.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)}`);
    const localStorage_esign = localStorage.getItem(`digioCompleted_${bundleRoute.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)}`);
    
    console.log('\n📱 LOCALSTORAGE STATUS:');
    console.log(`   Payment: ${localStorage_payment || 'not completed'}`);
    console.log(`   KYC: ${localStorage_kyc || 'not completed'}`);
    console.log(`   E-Sign: ${localStorage_esign || 'not completed'}`);
    
    // Try to check database status
    try {
      console.log('\n💾 CHECKING DATABASE STATUS...');
      
      const endpoints = {
        payment: `http://localhost:4000/api/user/payment-status/${userPhone}/${bundleRoute}`,
        kyc: `http://localhost:4000/api/user/kyc-status/${userPhone}`,
        esign: `http://localhost:4000/api/user/esign-status/${userPhone}`
      };
      
      for (const [step, endpoint] of Object.entries(endpoints)) {
        try {
          const response = await fetch(endpoint);
          const data = await response.json();
          console.log(`   ${step.toUpperCase()}: ${data.success ? (data.completed ? '✅ COMPLETED' : '⏳ not completed') : '❌ error'}`);
          if (data.completedAt) {
            console.log(`     ⏰ Completed: ${new Date(data.completedAt).toLocaleString()}`);
          }
        } catch (err) {
          console.log(`   ${step.toUpperCase()}: ❌ API error - ${err.message}`);
        }
      }
    } catch (error) {
      console.log('❌ Could not check database status:', error.message);
    }
    
    console.log('\n');
  },

  // Force refresh all step statuses from database
  async forceRefreshFromDatabase() {
    const userPhone = localStorage.getItem('userPhone');
    const bundleRoute = localStorage.getItem('currentBundleCustomRoute') || 'default';
    
    if (!userPhone) {
      console.error('❌ No user phone found');
      return;
    }

    console.log('🔄 FORCE REFRESHING ALL STEP STATUSES FROM DATABASE...');
    
    try {
      // This would use the stepPersistenceUtils if available
      console.log('📡 Attempting to sync with database...');
      
      // Manual check each step
      const steps = ['payment', 'kyc', 'esign'];
      for (const step of steps) {
        try {
          let endpoint;
          switch (step) {
            case 'payment':
              endpoint = `http://localhost:4000/api/user/payment-status/${userPhone}/${bundleRoute}`;
              break;
            case 'kyc':
              endpoint = `http://localhost:4000/api/user/kyc-status/${userPhone}`;
              break;
            case 'esign':
              endpoint = `http://localhost:4000/api/user/esign-status/${userPhone}`;
              break;
          }
          
          const response = await fetch(endpoint);
          const data = await response.json();
          
          if (data.success && (data.completed || data.isCompleted)) {
            const localStorageKey = `${step === 'esign' ? 'digio' : step}Completed_${bundleRoute.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)}`;
            localStorage.setItem(localStorageKey, 'true');
            console.log(`✅ ${step.toUpperCase()} synced from database and marked in localStorage`);
          }
        } catch (err) {
          console.log(`❌ Failed to sync ${step}:`, err.message);
        }
      }
      
      console.log('🔄 Refresh complete! Reload the page to see updated status.');
      
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
    }
  },

  // Simulate completing all steps (for testing only)
  async simulateAllStepsCompleted() {
    const userPhone = localStorage.getItem('userPhone');
    const bundleRoute = localStorage.getItem('currentBundleCustomRoute') || 'default';
    const sanitizedBundleId = bundleRoute.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    
    console.log('🧪 SIMULATING ALL STEPS AS COMPLETED (TEST MODE)');
    console.log('⚠️ This is for testing only - does not save to database');
    
    localStorage.setItem(`paymentCompleted_${sanitizedBundleId}`, 'true');
    localStorage.setItem(`kycCompleted_${sanitizedBundleId}`, 'true');
    localStorage.setItem(`digioCompleted_${sanitizedBundleId}`, 'true');
    
    console.log('✅ All steps marked as completed in localStorage');
    console.log('🔄 Refresh the page to see the completed status');
  },

  // Clear all step completions
  clearAllSteps() {
    const bundleRoute = localStorage.getItem('currentBundleCustomRoute') || 'default';
    const sanitizedBundleId = bundleRoute.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    
    localStorage.removeItem(`paymentCompleted_${sanitizedBundleId}`);
    localStorage.removeItem(`kycCompleted_${sanitizedBundleId}`);
    localStorage.removeItem(`digioCompleted_${sanitizedBundleId}`);
    
    console.log('🧹 All step completions cleared');
    console.log('🔄 Refresh the page to see the reset status');
  },

  // Check for persistence failures
  checkPersistenceFailures() {
    const failures = JSON.parse(localStorage.getItem('persistenceFailures') || '[]');
    
    if (failures.length === 0) {
      console.log('✅ No persistence failures logged');
      return;
    }
    
    console.log(`🚨 Found ${failures.length} persistence failure(s):`);
    failures.forEach((failure, index) => {
      console.log(`\n${index + 1}. ${failure.step} failure:`, {
        user: failure.userPhone,
        error: failure.error,
        time: new Date(failure.timestamp).toLocaleString(),
        url: failure.url
      });
    });
  },

  // Test database connection for all endpoints
  async testDatabaseConnections() {
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone) {
      console.error('❌ No user phone found');
      return;
    }

    console.log('🔍 TESTING DATABASE ENDPOINT CONNECTIONS...');
    
    const endpoints = {
      'Payment Status': `http://localhost:4000/api/user/payment-status/${userPhone}/default`,
      'KYC Status': `http://localhost:4000/api/user/kyc-status/${userPhone}`,
      'E-Sign Status': `http://localhost:4000/api/user/esign-status/${userPhone}`,
      'Mark Payment': `http://localhost:4000/api/user/mark-payment-completed`,
      'Mark KYC': `http://localhost:4000/api/user/mark-kyc-completed`,
      'Mark E-Sign': `http://localhost:4000/api/user/mark-esign-completed`
    };
    
    for (const [name, url] of Object.entries(endpoints)) {
      try {
        const isPostEndpoint = name.startsWith('Mark');
        const response = await fetch(url, {
          method: isPostEndpoint ? 'HEAD' : 'GET', // Use HEAD to test POST endpoints without data
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`${name}: ${response.ok ? '✅' : '⚠️'} (${response.status})`);
      } catch (error) {
        console.log(`${name}: ❌ ${error.message}`);
      }
    }
  },

  // Show help
  help() {
    console.log(`
🛠️ ENHANCED DEBUG PERSISTENCE UTILITIES

Available commands:
• debugPersistence.checkComprehensiveStatus() - Check both localStorage and database status
• debugPersistence.forceRefreshFromDatabase() - Sync step status from database
• debugPersistence.simulateAllStepsCompleted() - Mark all steps completed (test only)
• debugPersistence.clearAllSteps() - Clear all step completions
• debugPersistence.checkPersistenceFailures() - View any logged persistence failures
• debugPersistence.testDatabaseConnections() - Test all database endpoints
• debugPersistence.help() - Show this help

Examples:
debugPersistence.checkComprehensiveStatus();
debugPersistence.forceRefreshFromDatabase();
debugPersistence.simulateAllStepsCompleted();

⚠️ Important Notes:
- Always check comprehensive status first to see the real state
- Force refresh syncs localStorage with database truth
- Simulate mode is for testing only - doesn't save to database
- In production, step completions are saved to database with bulletproof persistence
    `);
  }
};

// Auto-run comprehensive status check
console.log('🛠️ Enhanced Debug Persistence Utilities Loaded!');
console.log('📞 Type debugPersistence.help() for available commands');
console.log('\n🔍 Running automatic comprehensive status check...\n');
debugPersistence.checkComprehensiveStatus();
