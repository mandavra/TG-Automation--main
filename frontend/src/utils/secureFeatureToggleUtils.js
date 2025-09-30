/**
 * Secure Feature Toggle Utilities
 * Enhanced security for feature toggle validation and step completion
 */

/**
 * Server-side validation for feature toggles
 * @param {string} bundleId - Channel bundle ID
 * @returns {Promise<Object>} Server-validated feature toggles
 */
export const getServerValidatedFeatureToggles = async (bundleId) => {
  try {
    const response = await fetch(`http://localhost:4000/api/public/pc/validate-features/${bundleId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Server validation failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.featureToggles) {
      return {
        success: true,
        featureToggles: data.featureToggles,
        validated: true
      };
    }
    
    return {
      success: false,
      error: 'Invalid server response',
      validated: false
    };

  } catch (error) {
    console.error('❌ Server feature validation failed:', error);
    return {
      success: false,
      error: error.message,
      validated: false
    };
  }
};

/**
 * Validate step completion on server before marking complete
 * @param {string} step - Step to validate (payment, kyc, esign)
 * @param {string} userId - User ID
 * @param {string} bundleId - Bundle ID
 * @param {Object} completionData - Step completion data
 * @returns {Promise<Object>} Validation result
 */
export const validateStepCompletion = async (step, userId, bundleId, completionData = {}) => {
  try {
    const response = await fetch(`http://localhost:4000/api/validation/step-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        step,
        userId,
        bundleId,
        completionData,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Step validation failed: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error(`❌ Step validation failed for ${step}:`, error);
    return {
      success: false,
      error: error.message,
      validated: false
    };
  }
};

/**
 * Cross-validate localStorage data with server
 * @param {string} userId - User ID
 * @param {string} bundleId - Bundle ID
 * @returns {Promise<Object>} Cross-validation result
 */
export const crossValidateUserProgress = async (userId, bundleId) => {
  try {
    const localProgress = {
      paymentCompleted: localStorage.getItem(`paymentCompleted_${bundleId}`) === 'true',
      kycCompleted: localStorage.getItem(`kycCompleted_${bundleId}`) === 'true',
      digioCompleted: localStorage.getItem(`digioCompleted_${bundleId}`) === 'true'
    };

    const response = await fetch(`http://localhost:4000/api/validation/user-progress/${userId}/${bundleId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Progress validation failed: ${response.status}`);
    }

    const serverData = await response.json();

    if (!serverData.success) {
      return {
        success: false,
        error: serverData.message,
        discrepancies: []
      };
    }

    const serverProgress = serverData.progress;
    const discrepancies = [];

    // Check for discrepancies
    Object.keys(localProgress).forEach(key => {
      if (localProgress[key] !== serverProgress[key]) {
        discrepancies.push({
          step: key,
          local: localProgress[key],
          server: serverProgress[key]
        });
      }
    });

    return {
      success: true,
      localProgress,
      serverProgress,
      discrepancies,
      syncRequired: discrepancies.length > 0
    };

  } catch (error) {
    console.error('❌ Cross-validation failed:', error);
    return {
      success: false,
      error: error.message,
      discrepancies: []
    };
  }
};

/**
 * Secure step completion with server validation
 * @param {string} step - Step to complete
 * @param {string} userId - User ID
 * @param {string} bundleId - Bundle ID
 * @param {Object} completionData - Completion evidence/data
 * @returns {Promise<Object>} Completion result
 */
export const secureCompleteStep = async (step, userId, bundleId, completionData = {}) => {
  try {
    // First validate the step completion on server
    const validation = await validateStepCompletion(step, userId, bundleId, completionData);
    
    if (!validation.success) {
      console.error(`❌ Step ${step} validation failed:`, validation.error);
      return {
        success: false,
        error: `Step validation failed: ${validation.error}`,
        step
      };
    }

    // If validation passed, mark as complete in localStorage
    const bundleSpecificKey = `${step}Completed_${bundleId}`;
    localStorage.setItem(bundleSpecificKey, 'true');
    localStorage.setItem(`${bundleSpecificKey}_timestamp`, new Date().toISOString());
    localStorage.setItem(`${bundleSpecificKey}_validated`, 'true');

    console.log(`✅ Step ${step} securely completed and validated`);

    return {
      success: true,
      step,
      validated: true,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ Secure step completion failed for ${step}:`, error);
    return {
      success: false,
      error: error.message,
      step
    };
  }
};

/**
 * Check if step completion is properly validated
 * @param {string} step - Step to check
 * @param {string} bundleId - Bundle ID
 * @returns {boolean} True if step is completed and validated
 */
export const isStepValidatedComplete = (step, bundleId) => {
  const bundleSpecificKey = `${step}Completed_${bundleId}`;
  const isComplete = localStorage.getItem(bundleSpecificKey) === 'true';
  const isValidated = localStorage.getItem(`${bundleSpecificKey}_validated`) === 'true';
  
  return isComplete && isValidated;
};

/**
 * Clear potentially compromised step data
 * @param {string} bundleId - Bundle ID
 */
export const clearCompromisedStepData = (bundleId) => {
  const steps = ['payment', 'kyc', 'digio'];
  
  steps.forEach(step => {
    const baseKey = `${step}Completed_${bundleId}`;
    localStorage.removeItem(baseKey);
    localStorage.removeItem(`${baseKey}_timestamp`);
    localStorage.removeItem(`${baseKey}_validated`);
  });

  console.log('🧹 Cleared potentially compromised step data');
};

/**
 * Audit user progress for security issues
 * @param {string} userId - User ID
 * @param {string} bundleId - Bundle ID
 * @returns {Promise<Object>} Audit result
 */
export const auditUserProgress = async (userId, bundleId) => {
  try {
    const crossValidation = await crossValidateUserProgress(userId, bundleId);
    
    if (!crossValidation.success) {
      return {
        success: false,
        issues: ['Cross-validation failed'],
        riskLevel: 'high'
      };
    }

    const issues = [];
    let riskLevel = 'low';

    // Check for suspicious patterns
    if (crossValidation.discrepancies.length > 0) {
      issues.push('localStorage/Server data mismatch');
      riskLevel = 'medium';
    }

    // Check for rapid completions (potential automation)
    const timestamps = ['payment', 'kyc', 'digio'].map(step => {
      const timestamp = localStorage.getItem(`${step}Completed_${bundleId}_timestamp`);
      return timestamp ? new Date(timestamp).getTime() : null;
    }).filter(t => t !== null);

    if (timestamps.length >= 2) {
      const timeDiffs = [];
      for (let i = 1; i < timestamps.length; i++) {
        timeDiffs.push(timestamps[i] - timestamps[i-1]);
      }
      
      // Flag if steps completed within 30 seconds of each other
      if (timeDiffs.some(diff => diff < 30000)) {
        issues.push('Suspiciously rapid step completion');
        riskLevel = 'high';
      }
    }

    // Check for missing validation flags
    const unvalidatedSteps = ['payment', 'kyc', 'digio'].filter(step => {
      const baseKey = `${step}Completed_${bundleId}`;
      const isComplete = localStorage.getItem(baseKey) === 'true';
      const isValidated = localStorage.getItem(`${baseKey}_validated`) === 'true';
      return isComplete && !isValidated;
    });

    if (unvalidatedSteps.length > 0) {
      issues.push(`Unvalidated completed steps: ${unvalidatedSteps.join(', ')}`);
      riskLevel = 'high';
    }

    return {
      success: true,
      issues,
      riskLevel,
      discrepancies: crossValidation.discrepancies,
      recommendation: issues.length > 0 ? 'Require re-verification' : 'Progress appears legitimate'
    };

  } catch (error) {
    console.error('❌ Progress audit failed:', error);
    return {
      success: false,
      issues: ['Audit process failed'],
      riskLevel: 'unknown',
      error: error.message
    };
  }
};

/**
 * Generate secure bundle-specific identifier
 * @param {string} route - Channel bundle route
 * @param {string} bundleId - Channel bundle ID
 * @returns {string} Secure identifier
 */
export const generateSecureBundleIdentifier = (route, bundleId) => {
  // Use crypto API if available for better security
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // For production, you might want to use a proper hash here
    const identifier = `${route}_${bundleId}`.substring(0, 32);
    return identifier.replace(/[^a-zA-Z0-9]/g, '_');
  }
  
  // Fallback for environments without crypto API
  const identifier = btoa(`${route}_${bundleId}`).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 32);
  return identifier;
};