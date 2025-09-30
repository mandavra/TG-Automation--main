/**
 * Step synchronization utilities to ensure localStorage and backend completion status are in sync
 */

import { setBundleSpecificValue, getBundleSpecificValue, isKYCRequired, isESignRequired } from './featureToggleUtils';

/**
 * Sync localStorage step completion flags with backend subscription status
 * @param {Object} subscriptionData - Subscription data from backend
 * @param {string} userPhone - User's phone number
 * @param {string} bundleId - Bundle/group ID
 */
export const syncStepCompletionWithBackend = async (subscriptionData, userPhone, bundleId) => {
  try {
    console.log('🔄 Syncing step completion with backend data:', subscriptionData);

    // Always sync payment completion if subscription exists
    if (subscriptionData && subscriptionData.hasPurchased) {
      setBundleSpecificValue('paymentCompleted', 'true');
      console.log('✅ Payment step marked as completed from backend sync');
    }

    // Sync KYC completion if required
    if (isKYCRequired() && subscriptionData?.completionStatus?.kycCompleted) {
      setBundleSpecificValue('kycCompleted', 'true');
      console.log('✅ KYC step marked as completed from backend sync');
    }

    // Sync e-sign completion if required
    if (isESignRequired() && subscriptionData?.completionStatus?.esignCompleted) {
      setBundleSpecificValue('digioCompleted', 'true');
      console.log('✅ E-Sign step marked as completed from backend sync');
    }

    // Additional backend API calls to verify KYC and e-sign status if needed
    if (userPhone) {
      await syncKYCStatus(userPhone);
      await syncESignStatus(userPhone);
    }

  } catch (error) {
    console.error('❌ Error syncing step completion with backend:', error);
  }
};

/**
 * Sync KYC completion status with backend
 * @param {string} userPhone - User's phone number
 */
const syncKYCStatus = async (userPhone) => {
  if (!isKYCRequired()) return;

  try {
    // Check if KYC is already marked as completed in localStorage
    const localKycCompleted = getBundleSpecificValue('kycCompleted');
    if (localKycCompleted === 'true') return;

    // Try to fetch KYC status from backend
    const response = await fetch(`http://localhost:4000/api/kyc/status/${userPhone}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.kycCompleted) {
        setBundleSpecificValue('kycCompleted', 'true');
        console.log('✅ KYC step synced from backend API');
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not sync KYC status from backend:', error.message);
  }
};

/**
 * Sync e-sign completion status with backend  
 * @param {string} userPhone - User's phone number
 */
const syncESignStatus = async (userPhone) => {
  if (!isESignRequired()) return;

  try {
    // Check if e-sign is already marked as completed in localStorage
    const localDigioCompleted = getBundleSpecificValue('digioCompleted');
    if (localDigioCompleted === 'true') return;

    // Try to fetch e-sign status from backend
    const response = await fetch(`http://localhost:4000/api/digio/status/${userPhone}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.esignCompleted) {
        setBundleSpecificValue('digioCompleted', 'true');
        console.log('✅ E-Sign step synced from backend API');
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not sync E-Sign status from backend:', error.message);
  }
};

/**
 * Force refresh all step completion statuses from backend
 * @param {string} userPhone - User's phone number
 * @param {string} bundleId - Bundle/group ID
 */
export const refreshAllStepStatuses = async (userPhone, bundleId) => {
  if (!userPhone || !bundleId) return;

  try {
    console.log('🔄 Force refreshing all step statuses from backend...');
    
    // Try to get comprehensive subscription status
    const response = await fetch(`http://localhost:4000/api/user/check-purchase/${userPhone}/${bundleId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        await syncStepCompletionWithBackend(data, userPhone, bundleId);
      }
    }
  } catch (error) {
    console.error('❌ Error refreshing step statuses:', error);
  }
};

/**
 * Get current step completion summary
 * @returns {Object} Summary of step completion statuses
 */
export const getStepCompletionSummary = () => {
  const paymentCompleted = getBundleSpecificValue('paymentCompleted') === 'true';
  const kycCompleted = getBundleSpecificValue('kycCompleted') === 'true';
  const digioCompleted = getBundleSpecificValue('digioCompleted') === 'true';
  
  const summary = {
    payment: {
      required: true,
      completed: paymentCompleted
    },
    kyc: {
      required: isKYCRequired(),
      completed: kycCompleted
    },
    esign: {
      required: isESignRequired(), 
      completed: digioCompleted
    }
  };

  // Calculate overall completion
  const requiredSteps = ['payment'];
  if (summary.kyc.required) requiredSteps.push('kyc');
  if (summary.esign.required) requiredSteps.push('esign');
  
  const completedSteps = requiredSteps.filter(step => summary[step].completed);
  
  summary.overall = {
    totalRequired: requiredSteps.length,
    totalCompleted: completedSteps.length,
    allCompleted: completedSteps.length === requiredSteps.length,
    completionPercentage: Math.round((completedSteps.length / requiredSteps.length) * 100)
  };

  return summary;
};

/**
 * Clear all step completion flags (useful for testing or logout)
 */
export const clearAllStepCompletions = () => {
  setBundleSpecificValue('paymentCompleted', '');
  setBundleSpecificValue('kycCompleted', '');
  setBundleSpecificValue('digioCompleted', '');
  console.log('🧹 All step completion flags cleared');
};
