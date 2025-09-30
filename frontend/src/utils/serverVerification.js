import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * Verify user step completion status from server
 * @param {string} phone - User's phone number
 * @returns {Promise<Object>} Step verification response
 */
export const verifyUserSteps = async (phone) => {
  try {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    console.log('🔍 Verifying steps for phone:', phone);
    
    const response = await axios.get(`${API_BASE}/step-verification/verify-steps/${encodeURIComponent(phone)}`);
    
    if (response.data.success) {
      console.log('✅ Step verification successful:', response.data);
      return {
        success: true,
        user: response.data.user,
        payment: response.data.payment,
        steps: response.data.steps,
        allStepsCompleted: response.data.allStepsCompleted,
        bundleConfig: response.data.bundleConfig,
        message: response.data.message
      };
    } else {
      throw new Error(response.data.message || 'Step verification failed');
    }
  } catch (error) {
    console.error('❌ Error verifying steps:', error);
    
    if (error.response?.status === 404) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found. Please register first.',
        steps: {
          registration: false,
          payment: false,
          kyc: false,
          esign: false
        }
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || 'VERIFICATION_FAILED',
      message: error.response?.data?.message || error.message || 'Failed to verify step completion',
      steps: {
        registration: false,
        payment: false,
        kyc: false,
        esign: false
      }
    };
  }
};

/**
 * Get user's invite links from server
 * @param {string} phone - User's phone number
 * @returns {Promise<Object>} Invite links response
 */
export const getUserInviteLinks = async (phone) => {
  try {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    console.log('🔗 Fetching invite links for phone:', phone);
    
    const response = await axios.get(`${API_BASE}/step-verification/invite-links/${encodeURIComponent(phone)}`);
    
    if (response.data.success) {
      console.log('✅ Invite links fetched successfully:', response.data.totalLinks, 'links');
      return {
        success: true,
        links: response.data.links,
        totalLinks: response.data.totalLinks,
        paymentInfo: response.data.paymentInfo,
        message: response.data.message
      };
    } else {
      throw new Error(response.data.message || 'Failed to fetch invite links');
    }
  } catch (error) {
    console.error('❌ Error fetching invite links:', error);
    
    if (error.response?.status === 404) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found. Please register first.'
      };
    }
    
    if (error.response?.status === 400 && error.response?.data?.requiresPayment) {
      return {
        success: false,
        error: 'PAYMENT_REQUIRED',
        message: error.response.data.message,
        requiresPayment: true
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || 'FETCH_FAILED',
      message: error.response?.data?.message || error.message || 'Failed to fetch invite links'
    };
  }
};

/**
 * Regenerate user's invite links (for support/admin use)
 * @param {string} phone - User's phone number
 * @param {string} reason - Reason for regeneration
 * @returns {Promise<Object>} Regeneration response
 */
export const regenerateUserInviteLinks = async (phone, reason = 'User requested') => {
  try {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    console.log('🔄 Regenerating invite links for phone:', phone);
    
    const response = await axios.post(`${API_BASE}/step-verification/regenerate-links/${encodeURIComponent(phone)}`, {
      reason
    });
    
    if (response.data.success) {
      console.log('✅ Invite links regenerated successfully:', response.data.totalLinks, 'links');
      return {
        success: true,
        links: response.data.links,
        totalLinks: response.data.totalLinks,
        regenerationDetails: response.data.regenerationDetails,
        message: response.data.message
      };
    } else {
      throw new Error(response.data.message || 'Failed to regenerate invite links');
    }
  } catch (error) {
    console.error('❌ Error regenerating invite links:', error);
    
    return {
      success: false,
      error: error.response?.data?.error || 'REGENERATION_FAILED',
      message: error.response?.data?.message || error.message || 'Failed to regenerate invite links'
    };
  }
};

/**
 * Check if user is properly authenticated and has completed required steps
 * @param {string} phone - User's phone number
 * @returns {Promise<Object>} Authentication status
 */
export const checkUserAuthentication = async (phone) => {
  try {
    const verification = await verifyUserSteps(phone);
    
    return {
      isAuthenticated: verification.success && verification.steps.registration,
      hasCompletedPayment: verification.success && verification.steps.payment,
      allStepsCompleted: verification.success && verification.allStepsCompleted,
      user: verification.user,
      steps: verification.steps,
      message: verification.message
    };
  } catch (error) {
    console.error('❌ Authentication check failed:', error);
    
    return {
      isAuthenticated: false,
      hasCompletedPayment: false,
      allStepsCompleted: false,
      user: null,
      steps: {
        registration: false,
        payment: false,
        kyc: false,
        esign: false
      },
      message: 'Authentication check failed'
    };
  }
};

/**
 * Clear all client-side cache and force server-side verification
 */
export const clearClientCache = () => {
  console.log('🧹 Clearing client-side cache');
  
  // Remove potentially stale localStorage entries
  const keysToRemove = [
    'paymentCompleted',
    'kycCompleted',
    'digioCompleted',
    'esignCompleted',
    'telegramLink',
    'currentOrderId',
    'paymentDetails'
  ];
  
  keysToRemove.forEach(key => {
    // Remove all variants of the key
    Object.keys(localStorage).forEach(storageKey => {
      if (storageKey.startsWith(key)) {
        localStorage.removeItem(storageKey);
        console.log(`   Removed: ${storageKey}`);
      }
    });
  });
  
  console.log('✅ Client cache cleared');
};

export default {
  verifyUserSteps,
  getUserInviteLinks,
  regenerateUserInviteLinks,
  checkUserAuthentication,
  clearClientCache
};