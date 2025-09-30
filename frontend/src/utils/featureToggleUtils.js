/**
 * Utility functions for checking feature toggles from the current bundle
 */

/**
 * Helper: Try to load bundle data from localStorage if window.currentBundleData is missing
 */
export const ensureCurrentBundleData = () => {
  if (!window.currentBundleData) {
    const bundleDataStr = localStorage.getItem('currentBundleData');
    if (bundleDataStr) {
      try {
        window.currentBundleData = JSON.parse(bundleDataStr);
        console.log('🟢 Loaded currentBundleData from localStorage:', window.currentBundleData);
      } catch (e) {
        console.warn('⚠️ Failed to parse currentBundleData from localStorage:', e);
      }
    }
  }
};

/**
 * Get the current bundle's feature toggles
 * @param {Object} bundleData - Optional bundle data to use instead of global storage
 * @returns {Object} Feature toggles object with enableESign, enableKYC, enablePayment
 */
export const getCurrentBundleFeatureToggles = (bundleData = null) => {
  ensureCurrentBundleData();
  // Use provided bundle data first, then try global storage
  const targetBundleData = bundleData || window.currentBundleData;
  
  console.log('🎛️ FeatureToggle Debug - targetBundleData:', targetBundleData);
  console.log('🎛️ FeatureToggle Debug - targetBundleData.featureToggles:', targetBundleData?.featureToggles);
  
  if (targetBundleData?.featureToggles) {
    console.log('🎛️ FeatureToggle Debug - Returning bundle feature toggles:', targetBundleData.featureToggles);
    return targetBundleData.featureToggles;
  }
  
  // Default to all features enabled if no bundle data is found
  // Note: Payment is always required, so we don't need enablePayment toggle
  console.log('🎛️ FeatureToggle Debug - No bundle data found, using defaults');
  return {
    enableESign: true,
    enableKYC: true
  };
};

/**
 * Check if a specific feature is enabled for the current bundle
 * @param {string} featureName - One of 'enableESign', 'enableKYC', 'enablePayment'
 * @returns {boolean} True if the feature is enabled
 */
export const isFeatureEnabled = (featureName) => {
  const featureToggles = getCurrentBundleFeatureToggles();
  return featureToggles[featureName] === true;
};

/**
 * Check if payment is required for the current bundle
 * @returns {boolean} True if payment is required (always true)
 */
export const isPaymentRequired = () => {
  return true; // Payment is always mandatory
};

/**
 * Check if KYC is required for the current bundle
 * @returns {boolean} True if KYC is required
 */
export const isKYCRequired = () => {
  return isFeatureEnabled('enableKYC');
};

/**
 * Check if e-signature is required for the current bundle
 * @returns {boolean} True if e-signature is required
 */
export const isESignRequired = () => {
  return isFeatureEnabled('enableESign');
};

/**
 * Get all required steps for the current bundle
 * @returns {Array} Array of step IDs that are required
 */
export const getRequiredSteps = () => {
  const steps = ['register', 'payment']; // Register and payment always required
  
  if (isKYCRequired()) {
    steps.push('kyc');
  }
  
  if (isESignRequired()) {
    steps.push('esign');
  }
  
  return steps;
};

/**
 * Get current bundle ID from window.currentBundleData or URL
 * @returns {string|null} Bundle ID or null if not found
 */
export const getCurrentBundleId = () => {
  // Try to get from current bundle data
  const bundleData = window.currentBundleData;
  if (bundleData?._id || bundleData?.id) {
    return bundleData._id || bundleData.id;
  }
  
  // Try to get from URL if we're on a bundle page
  const path = window.location.pathname;
  if (path.startsWith('/pc/')) {
    const route = path.split('/pc/')[1];
    return `route_${route}`; // Use route as identifier
  }
  
  return 'default';
};

/**
 * Get bundle-specific localStorage key with proper sanitization
 * @param {string} key - The base key (e.g., 'paymentCompleted')
 * @returns {string} Bundle-specific key
 */
export const getBundleSpecificKey = (key) => {
  const bundleId = getCurrentBundleId();
  // Sanitize the bundle ID to prevent localStorage key collisions
  const sanitizedBundleId = bundleId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  return `${key}_${sanitizedBundleId}`;
};

/**
 * Get bundle-specific localStorage value
 * @param {string} key - The base key
 * @returns {string|null} The stored value or null
 */
export const getBundleSpecificValue = (key) => {
  // Try the standard bundle-specific key first
  const bundleSpecificKey = getBundleSpecificKey(key);
  let value = localStorage.getItem(bundleSpecificKey);
  
  if (value) return value;
  
  // If not found, try alternative key formats for backward compatibility
  const bundleData = window.currentBundleData;
  const alternativeKeys = [];
  
  // Try with bundle ID directly
  if (bundleData?.id) {
    alternativeKeys.push(`${key}_${bundleData.id}`);
  }
  if (bundleData?._id) {
    alternativeKeys.push(`${key}_${bundleData._id}`);
  }
  
  // Try with custom route
  if (bundleData?.customRoute) {
    alternativeKeys.push(`${key}_${bundleData.customRoute}`);
  }
  
  // Try with URL route
  const path = window.location.pathname;
  if (path.startsWith('/pc/')) {
    const route = path.split('/pc/')[1];
    alternativeKeys.push(`${key}_${route}`);
  }
  
  // Try general key as last resort
  alternativeKeys.push(key);
  
  // Check all alternative keys
  for (const altKey of alternativeKeys) {
    value = localStorage.getItem(altKey);
    if (value) {
      // If found in alternative format, also save it in the standard format for future use
      localStorage.setItem(bundleSpecificKey, value);
      return value;
    }
  }
  
  return null;
};

/**
 * Set bundle-specific localStorage value
 * @param {string} key - The base key
 * @param {string} value - The value to store
 */
export const setBundleSpecificValue = (key, value) => {
  const bundleSpecificKey = getBundleSpecificKey(key);
  localStorage.setItem(bundleSpecificKey, value);
};

/**
 * Check if all required steps are completed for current bundle
 * @returns {boolean} True if all required steps are completed
 */
export const areAllRequiredStepsCompleted = () => {
  const userPhone = localStorage.getItem('userPhone');
  if (!userPhone) return false;
  
  // Payment is always required
  const paymentCompleted = getBundleSpecificValue('paymentCompleted');
  if (!paymentCompleted || paymentCompleted.toLowerCase() !== 'true') return false;
  
  // Auto-complete disabled steps after payment
  autoCompleteDisabledSteps();
  
  if (isKYCRequired()) {
    const kycCompleted = getBundleSpecificValue('kycCompleted');
    if (!kycCompleted) return false;
  }
  
  if (isESignRequired()) {
    const digioCompleted = getBundleSpecificValue('digioCompleted');
    if (!digioCompleted) return false;
  }
  
  return true;
};

/**
 * Auto-complete disabled steps for the current bundle
 */
export const autoCompleteDisabledSteps = () => {
  console.log('🤖 AutoComplete Debug:');
  console.log('   - Bundle data:', window.currentBundleData);
  console.log('   - isKYCRequired():', isKYCRequired());
  console.log('   - isESignRequired():', isESignRequired());
  
  // If KYC is disabled, mark it as completed
  if (!isKYCRequired()) {
    const kycCompleted = getBundleSpecificValue('kycCompleted');
    if (!kycCompleted) {
      setBundleSpecificValue('kycCompleted', 'auto_skipped');
      console.log('🚫 KYC disabled - auto-marking as completed');
    }
  }
  
  // If E-Sign is disabled, mark it as completed  
  if (!isESignRequired()) {
    const digioCompleted = getBundleSpecificValue('digioCompleted');
    if (!digioCompleted) {
      setBundleSpecificValue('digioCompleted', 'auto_skipped');
      console.log('🚫 E-Sign disabled - auto-marking as completed');
    }
  } else {
    console.log('✅ E-Sign is required - not auto-completing');
  }
};

/**
 * Get the next required step in the flow
 * @returns {string|null} The next step ('payment', 'kyc', 'esign') or null if all completed
 */
export const getNextRequiredStep = () => {
  const userPhone = localStorage.getItem('userPhone');
  if (!userPhone) return 'register';
  
  // Payment is always required
  const paymentCompleted = getBundleSpecificValue('paymentCompleted');
  if (!paymentCompleted || paymentCompleted.toLowerCase() !== 'true') return 'payment';
  
  // Auto-complete disabled steps after payment
  autoCompleteDisabledSteps();
  
  if (isKYCRequired()) {
    const kycCompleted = getBundleSpecificValue('kycCompleted');
    if (!kycCompleted) return 'kyc';
  }
  
  if (isESignRequired()) {
    const digioCompleted = getBundleSpecificValue('digioCompleted');
    if (!digioCompleted) return 'esign';
  }
  
  return null; // All steps completed
};

/**
 * Get the redirect path for the next step or completion
 * @returns {string} The path to redirect to
 */
export const getNextStepRedirectPath = () => {
  const nextStep = getNextRequiredStep();
  
  if (!nextStep) {
    // All steps completed - return to bundle page with completion status
    const bundleData = window.currentBundleData;
    const currentBundleCustomRoute = localStorage.getItem('currentBundleCustomRoute');
    
    if (bundleData?.customRoute) {
      return `/pc/${bundleData.customRoute}`;
    } else if (currentBundleCustomRoute) {
      return `/pc/${currentBundleCustomRoute}`;
    }
    
    // If no bundle route is available, then go to dashboard
    const userPhone = localStorage.getItem('userPhone');
    if (userPhone) {
      return `/dashboard?phone=${userPhone}`;
    }
    return '/';
  }
  
  switch (nextStep) {
    case 'register': return '/login';
    case 'payment': return '/'; // Will show plan selection
    case 'kyc': return '/kycForm';
    case 'esign': return '/digio';
    default: return '/';
  }
};

/**
 * Complete a step and return the redirect path for the next step
 * @param {string} completedStep - The step that was just completed
 * @returns {string} The path to redirect to next
 */
export const completeStepAndGetNextPath = (completedStep) => {
  // Validate completed step
  const validSteps = ['payment', 'kyc', 'esign'];
  if (!validSteps.includes(completedStep)) {
    console.warn(`⚠️ Invalid step completion attempt: ${completedStep}`);
    return '/';
  }

  // Mark the completed step
  switch (completedStep) {
    case 'payment':
      setBundleSpecificValue('paymentCompleted', 'true');
      // Only auto-complete other steps if they are genuinely not required
      // DO NOT auto-complete if features are disabled by admin but should be enforced
      break;
    case 'kyc':
      // Verify KYC was actually required before marking complete
      if (isKYCRequired()) {
        setBundleSpecificValue('kycCompleted', 'true');
      }
      break;
    case 'esign':
      // Verify E-Sign was actually required before marking complete
      if (isESignRequired()) {
        setBundleSpecificValue('digioCompleted', 'true');
      }
      break;
  }
  
  return getNextStepRedirectPath();
};
