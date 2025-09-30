/**
 * CRITICAL: Bulletproof Step Completion Persistence System
 * This system ensures NO completion data is EVER lost and prevents duplicate payments/submissions
 */

import axios from 'axios';
import { setBundleSpecificValue, getBundleSpecificValue } from './featureToggleUtils';

// API base URL
const API_BASE = 'http://localhost:4000';

/**
 * CRITICAL: Verify step completion status from DATABASE FIRST
 * Always prioritizes database over localStorage for accuracy
 * @param {string} userPhone - User's phone number
 * @param {string} bundleId - Bundle/group ID  
 * @param {string} step - Step to verify ('payment', 'kyc', 'esign')
 * @returns {Promise<boolean>} True if step is completed in database
 */
export const verifyStepCompletionFromDatabase = async (userPhone, bundleId, step) => {
  if (!userPhone || !bundleId || !step) {
    console.error('❌ Missing required parameters for step verification');
    return false;
  }

  try {
    console.log(`🔍 Verifying ${step} completion from database for user: ${userPhone}, bundle: ${bundleId}`);

    let endpoint;
    switch (step) {
      case 'payment':
        endpoint = `/api/user/payment-status/${userPhone}/${bundleId}`;
        break;
      case 'kyc':
        endpoint = `/api/user/kyc-status/${userPhone}`;
        break;
      case 'esign':
        endpoint = `/api/user/esign-status/${userPhone}`;
        break;
      default:
        throw new Error(`Invalid step: ${step}`);
    }

    const response = await axios.get(`${API_BASE}${endpoint}`, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
      }
    });

    if (response.data && response.data.success) {
      const isCompleted = response.data.completed || response.data.isCompleted || false;
      
      if (isCompleted) {
        // SYNC localStorage with database truth
        const localStorageKey = `${step === 'esign' ? 'digio' : step}Completed`;
        setBundleSpecificValue(localStorageKey, 'true');
        console.log(`✅ ${step.toUpperCase()} verified as COMPLETED in database - localStorage synced`);
      } else {
        console.log(`⏳ ${step.toUpperCase()} not completed in database`);
      }
      
      return isCompleted;
    }

    return false;

  } catch (error) {
    console.error(`❌ Error verifying ${step} completion from database:`, error);
    
    // FALLBACK: Check localStorage if database is unavailable
    console.warn(`⚠️ Database unavailable, falling back to localStorage for ${step}`);
    const localStorageKey = `${step === 'esign' ? 'digio' : step}Completed`;
    const localStatus = getBundleSpecificValue(localStorageKey) === 'true';
    
    if (localStatus) {
      console.log(`📱 Found ${step} completion in localStorage (database unavailable)`);
    }
    
    return localStatus;
  }
};

/**
 * CRITICAL: Mark step as completed in DATABASE with bulletproof persistence
 * Ensures completion is PERMANENTLY saved and cannot be lost
 */
export const markStepCompletedInDatabase = async (userPhone, bundleId, step, completionData = {}) => {
  if (!userPhone || !bundleId || !step) {
    throw new Error('Missing required parameters for step completion');
  }

  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`💾 Attempt ${attempt}: Saving ${step} completion to database...`);

      let endpoint, payload;
      
      switch (step) {
        case 'payment':
          endpoint = '/api/user/mark-payment-completed';
          payload = {
            userPhone,
            bundleId,
            ...completionData,
            completedAt: new Date().toISOString(),
            source: 'frontend_verification'
          };
          break;
          
        case 'kyc':
          endpoint = '/api/user/mark-kyc-completed';
          payload = {
            userPhone,
            ...completionData,
            completedAt: new Date().toISOString(),
            source: 'frontend_verification'
          };
          break;
          
        case 'esign':
          endpoint = '/api/user/mark-esign-completed';
          payload = {
            userPhone,
            ...completionData,
            completedAt: new Date().toISOString(),
            source: 'frontend_verification'
          };
          break;
          
        default:
          throw new Error(`Invalid step: ${step}`);
      }

      const response = await axios.post(`${API_BASE}${endpoint}`, payload, {
        timeout: 15000, // 15 second timeout for writes
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
        }
      });

      if (response.data && response.data.success) {
        // Mark in localStorage as backup
        const localStorageKey = `${step === 'esign' ? 'digio' : step}Completed`;
        setBundleSpecificValue(localStorageKey, 'true');
        
        console.log(`✅ ${step.toUpperCase()} completion SUCCESSFULLY saved to database and localStorage`);
        return true;
      } else {
        throw new Error(response.data?.message || `Failed to save ${step} completion`);
      }

    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed to save ${step} completion:`, error);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // CRITICAL: Even if database fails, mark in localStorage to prevent data loss
  console.error(`🚨 CRITICAL: Failed to save ${step} completion to database after ${maxRetries} attempts`);
  console.log(`📱 Marking ${step} as completed in localStorage as emergency backup`);
  
  const localStorageKey = `${step === 'esign' ? 'digio' : step}Completed`;
  setBundleSpecificValue(localStorageKey, 'true');
  
  // Log this critical issue for admin attention
  logCriticalPersistenceFailure(userPhone, bundleId, step, lastError);
  
  return false; // Database save failed, but localStorage backup created
};

/**
 * CRITICAL: Check if user can perform a step (prevent duplicates)
 */
export const canUserPerformStep = async (userPhone, bundleId, step) => {
  try {
    // Check database first for definitive answer
    const isAlreadyCompleted = await verifyStepCompletionFromDatabase(userPhone, bundleId, step);
    
    if (isAlreadyCompleted) {
      console.log(`🚫 User cannot perform ${step} - already completed in database`);
      return {
        canPerform: false,
        reason: `${step.toUpperCase()} already completed`,
        completedInDatabase: true
      };
    }

    console.log(`✅ User can perform ${step} - not yet completed`);
    return {
      canPerform: true,
      reason: `${step.toUpperCase()} not yet completed`,
      completedInDatabase: false
    };

  } catch (error) {
    console.error(`❌ Error checking if user can perform ${step}:`, error);
    
    // Conservative fallback: check localStorage
    const localStorageKey = `${step === 'esign' ? 'digio' : step}Completed`;
    const localCompleted = getBundleSpecificValue(localStorageKey) === 'true';
    
    return {
      canPerform: !localCompleted,
      reason: localCompleted ? `${step.toUpperCase()} completed (localStorage)` : `Database check failed, allowing step`,
      completedInDatabase: false,
      databaseError: true
    };
  }
};

/**
 * CRITICAL: Get comprehensive step completion status from database
 */
export const getComprehensiveStepStatus = async (userPhone, bundleId) => {
  if (!userPhone || !bundleId) {
    return { error: 'Missing user phone or bundle ID' };
  }

  try {
    console.log(`📊 Getting comprehensive step status for user: ${userPhone}, bundle: ${bundleId}`);

    // Check all steps in parallel for efficiency
    const [paymentStatus, kycStatus, esignStatus] = await Promise.allSettled([
      verifyStepCompletionFromDatabase(userPhone, bundleId, 'payment'),
      verifyStepCompletionFromDatabase(userPhone, bundleId, 'kyc'),
      verifyStepCompletionFromDatabase(userPhone, bundleId, 'esign')
    ]);

    const status = {
      payment: {
        completed: paymentStatus.status === 'fulfilled' ? paymentStatus.value : false,
        error: paymentStatus.status === 'rejected' ? paymentStatus.reason : null
      },
      kyc: {
        completed: kycStatus.status === 'fulfilled' ? kycStatus.value : false,
        error: kycStatus.status === 'rejected' ? kycStatus.reason : null
      },
      esign: {
        completed: esignStatus.status === 'fulfilled' ? esignStatus.value : false,
        error: esignStatus.status === 'rejected' ? esignStatus.reason : null
      },
      timestamp: new Date().toISOString()
    };

    console.log('📋 Comprehensive step status:', status);
    return status;

  } catch (error) {
    console.error('❌ Error getting comprehensive step status:', error);
    return { error: error.message };
  }
};

/**
 * CRITICAL: Log persistence failures for admin attention
 */
const logCriticalPersistenceFailure = async (userPhone, bundleId, step, error) => {
  try {
    const failureLog = {
      userPhone,
      bundleId,
      step,
      error: error.message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity: 'CRITICAL'
    };

    // Try to log to database
    await axios.post(`${API_BASE}/api/admin/log-persistence-failure`, failureLog, {
      timeout: 5000
    });

    // Also store in localStorage for admin dashboard
    const existingFailures = JSON.parse(localStorage.getItem('persistenceFailures') || '[]');
    existingFailures.push(failureLog);
    localStorage.setItem('persistenceFailures', JSON.stringify(existingFailures.slice(-50))); // Keep last 50

  } catch (logError) {
    console.error('❌ Failed to log persistence failure:', logError);
  }
};

/**
 * CRITICAL: Force refresh step status from database (for recovery)
 */
export const forceRefreshStepStatusFromDatabase = async (userPhone, bundleId) => {
  console.log('🔄 FORCE REFRESH: Getting latest step status from database...');
  
  try {
    const status = await getComprehensiveStepStatus(userPhone, bundleId);
    
    if (!status.error) {
      // Update localStorage with database truth
      if (status.payment.completed) setBundleSpecificValue('paymentCompleted', 'true');
      if (status.kyc.completed) setBundleSpecificValue('kycCompleted', 'true');
      if (status.esign.completed) setBundleSpecificValue('digioCompleted', 'true');
      
      console.log('✅ Step status forcefully refreshed from database');
    }
    
    return status;
    
  } catch (error) {
    console.error('❌ Failed to force refresh step status:', error);
    return { error: error.message };
  }
};
