// Debug script to check and manipulate step completion states
// Run this in browser console to debug step progression

window.debugSteps = {
  // Check current step completion status
  checkStatus() {
    console.log('=== STEP COMPLETION STATUS ===');
    
    const userPhone = localStorage.getItem('userPhone');
    console.log('📱 User Phone:', userPhone);
    
    const bundleData = window.currentBundleData;
    console.log('📦 Bundle Data:', bundleData);
    
    if (bundleData) {
      console.log('🎛️ Feature Toggles:', bundleData.featureToggles);
    }
    
    // Check bundle-specific keys
    const bundleId = this.getBundleId();
    console.log('🔑 Bundle ID:', bundleId);
    
    const paymentKey = `paymentCompleted_${bundleId}`;
    const kycKey = `kycCompleted_${bundleId}`;
    const esignKey = `digioCompleted_${bundleId}`;
    
    console.log('💳 Payment:', localStorage.getItem(paymentKey), `(key: ${paymentKey})`);
    console.log('📋 KYC:', localStorage.getItem(kycKey), `(key: ${kycKey})`);
    console.log('✍️ E-Sign:', localStorage.getItem(esignKey), `(key: ${esignKey})`);
    
    // Show all localStorage items related to this bundle
    console.log('\n=== ALL BUNDLE-SPECIFIC KEYS ===');
    Object.keys(localStorage).forEach(key => {
      if (key.includes(bundleId)) {
        console.log(`${key}: ${localStorage.getItem(key)}`);
      }
    });
    
    return {
      userPhone,
      bundleId,
      payment: localStorage.getItem(paymentKey),
      kyc: localStorage.getItem(kycKey),
      esign: localStorage.getItem(esignKey)
    };
  },
  
  // Get current bundle ID
  getBundleId() {
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
  },
  
  // Mark a step as completed
  completeStep(step) {
    const bundleId = this.getBundleId();
    let key;
    
    switch(step) {
      case 'payment':
        key = `paymentCompleted_${bundleId}`;
        break;
      case 'kyc':
        key = `kycCompleted_${bundleId}`;
        break;
      case 'esign':
        key = `digioCompleted_${bundleId}`;
        break;
      default:
        console.error('Invalid step. Use: payment, kyc, or esign');
        return;
    }
    
    localStorage.setItem(key, 'true');
    console.log(`✅ Marked ${step} as completed`);
    this.checkStatus();
  },
  
  // Clear a step completion
  clearStep(step) {
    const bundleId = this.getBundleId();
    let key;
    
    switch(step) {
      case 'payment':
        key = `paymentCompleted_${bundleId}`;
        break;
      case 'kyc':
        key = `kycCompleted_${bundleId}`;
        break;
      case 'esign':
        key = `digioCompleted_${bundleId}`;
        break;
      default:
        console.error('Invalid step. Use: payment, kyc, or esign');
        return;
    }
    
    localStorage.removeItem(key);
    console.log(`❌ Cleared ${step} completion`);
    this.checkStatus();
  },
  
  // Clear all steps
  clearAllSteps() {
    const bundleId = this.getBundleId();
    localStorage.removeItem(`paymentCompleted_${bundleId}`);
    localStorage.removeItem(`kycCompleted_${bundleId}`);
    localStorage.removeItem(`digioCompleted_${bundleId}`);
    console.log('❌ Cleared all step completions');
    this.checkStatus();
  },
  
  // Get next required step
  getNextStep() {
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone) {
      console.log('Next step: register');
      return 'register';
    }
    
    const bundleId = this.getBundleId();
    const paymentCompleted = localStorage.getItem(`paymentCompleted_${bundleId}`);
    if (!paymentCompleted || paymentCompleted.toLowerCase() !== 'true') {
      console.log('Next step: payment');
      return 'payment';
    }
    
    const bundleData = window.currentBundleData;
    const kycRequired = bundleData?.featureToggles?.enableKYC !== false;
    if (kycRequired) {
      const kycCompleted = localStorage.getItem(`kycCompleted_${bundleId}`);
      if (!kycCompleted) {
        console.log('Next step: kyc');
        return 'kyc';
      }
    }
    
    const esignRequired = bundleData?.featureToggles?.enableESign !== false;
    if (esignRequired) {
      const esignCompleted = localStorage.getItem(`digioCompleted_${bundleId}`);
      if (!esignCompleted) {
        console.log('Next step: esign');
        return 'esign';
      }
    }
    
    console.log('All steps completed!');
    return null;
  },
  
  // Show help
  help() {
    console.log(`
=== DEBUG STEPS UTILITY ===

Available commands:
• debugSteps.checkStatus() - Check current completion status
• debugSteps.getNextStep() - Get next required step
• debugSteps.completeStep('payment') - Mark payment as complete
• debugSteps.completeStep('kyc') - Mark KYC as complete
• debugSteps.completeStep('esign') - Mark e-sign as complete
• debugSteps.clearStep('payment') - Clear payment completion
• debugSteps.clearAllSteps() - Clear all completions
• debugSteps.help() - Show this help

Examples:
debugSteps.checkStatus();
debugSteps.completeStep('payment');
debugSteps.getNextStep();
    `);
  }
};

console.log('🛠️ Debug utility loaded! Type debugSteps.help() for commands');
