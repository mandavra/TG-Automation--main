/**
 * Subscription management utilities for handling subscription status,
 * extensions, and expiry management
 */
import axios from 'axios';

/**
 * Get user's current subscription status for a specific bundle
 * @param {string} userPhone - User phone number
 * @param {string} bundleId - Bundle ID (optional, defaults to current bundle)
 * @returns {Promise<Object|null>} Subscription data or null if no active subscription
 */
export const getCurrentSubscription = async (userPhone, bundleId = null) => {
  try {
    if (!userPhone) return null;
    
    const currentBundleId = bundleId || window.currentBundleData?._id || window.currentBundleData?.id;
    if (!currentBundleId) return null;
    
    const response = await axios.get(`http://localhost:4000/api/subscription/status`, {
      params: {
        phone: userPhone,
        bundleId: currentBundleId
      }
    });
    
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch subscription status:', error);
    return null;
  }
};

/**
 * Check if user has an active subscription for current bundle
 * @param {string} userPhone - User phone number
 * @param {string} bundleId - Bundle ID (optional)
 * @returns {Promise<boolean>} True if subscription is active
 */
export const hasActiveSubscription = async (userPhone, bundleId = null) => {
  const subscription = await getCurrentSubscription(userPhone, bundleId);
  if (!subscription) return false;
  
  const now = new Date();
  const expiryDate = new Date(subscription.expiry_date);
  
  return subscription.status === 'SUCCESS' && expiryDate > now;
};

/**
 * Check if user's subscription is expired or expiring soon
 * @param {string} userPhone - User phone number
 * @param {number} warningDays - Days before expiry to show warning (default: 7)
 * @returns {Promise<Object>} Status object with expiry information
 */
export const getSubscriptionExpiryStatus = async (userPhone, warningDays = 7) => {
  const subscription = await getCurrentSubscription(userPhone);
  if (!subscription) {
    return { hasSubscription: false, isExpired: false, isExpiringSoon: false, daysRemaining: 0 };
  }
  
  const now = new Date();
  const expiryDate = new Date(subscription.expiry_date);
  const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  
  return {
    hasSubscription: true,
    isExpired: expiryDate <= now,
    isExpiringSoon: daysRemaining <= warningDays && daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
    expiryDate: subscription.expiry_date,
    subscription
  };
};

/**
 * Calculate new expiry date when extending subscription
 * @param {string} currentExpiryDate - Current expiry date
 * @param {number} extensionDays - Days to extend
 * @returns {Date} New expiry date
 */
export const calculateExtensionDate = (currentExpiryDate, extensionDays) => {
  const currentExpiry = new Date(currentExpiryDate);
  const now = new Date();
  
  // If subscription is already expired, start from now
  // If still active, extend from current expiry date
  const baseDate = currentExpiry > now ? currentExpiry : now;
  
  const newExpiryDate = new Date(baseDate);
  newExpiryDate.setDate(newExpiryDate.getDate() + extensionDays);
  
  return newExpiryDate;
};

/**
 * Extend user's subscription for current bundle
 * @param {string} userPhone - User phone number
 * @param {Object} plan - Selected plan details
 * @param {string} paymentId - Payment transaction ID
 * @returns {Promise<Object>} Extension result
 */
export const extendSubscription = async (userPhone, plan, paymentId) => {
  try {
    const currentBundleId = window.currentBundleData?._id || window.currentBundleData?.id;
    if (!currentBundleId) {
      throw new Error('No bundle context found');
    }
    
    const response = await axios.post('http://localhost:4000/api/subscription/extend', {
      phone: userPhone,
      bundleId: currentBundleId,
      planId: plan._id || plan.id,
      duration: plan.duration,
      amount: plan.mrp,
      paymentId,
      isExtension: true
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to extend subscription:', error);
    throw error;
  }
};

/**
 * Get subscription action type for UI display
 * @param {string} userPhone - User phone number
 * @returns {Promise<string>} 'subscribe' | 'extend' | 'renew'
 */
export const getSubscriptionAction = async (userPhone) => {
  const status = await getSubscriptionExpiryStatus(userPhone);
  
  if (!status.hasSubscription) {
    return 'subscribe';
  }
  
  if (status.isExpired) {
    return 'renew';
  }
  
  return 'extend';
};

/**
 * Get appropriate button text based on subscription status
 * @param {string} userPhone - User phone number
 * @returns {Promise<string>} Button text
 */
export const getSubscriptionButtonText = async (userPhone) => {
  const action = await getSubscriptionAction(userPhone);
  
  switch (action) {
    case 'subscribe':
      return 'Subscribe Now';
    case 'extend':
      return 'Extend Subscription';
    case 'renew':
      return 'Renew Subscription';
    default:
      return 'Subscribe Now';
  }
};

/**
 * Parse plan duration into days
 * @param {string} duration - Duration string (e.g., "30 days", "1 month", "6 months")
 * @returns {number} Number of days
 */
export const parseDurationToDays = (duration) => {
  if (!duration) return 30; // Default to 30 days
  
  const durationStr = duration.toLowerCase();
  
  if (durationStr.includes('day')) {
    const days = parseInt(durationStr.match(/\d+/)?.[0] || '30');
    return days;
  }
  
  if (durationStr.includes('month')) {
    const months = parseInt(durationStr.match(/\d+/)?.[0] || '1');
    return months * 30; // Approximate days in a month
  }
  
  if (durationStr.includes('year')) {
    const years = parseInt(durationStr.match(/\d+/)?.[0] || '1');
    return years * 365; // Approximate days in a year
  }
  
  if (durationStr.includes('week')) {
    const weeks = parseInt(durationStr.match(/\d+/)?.[0] || '1');
    return weeks * 7; // Days in a week
  }
  
  // Try to extract just numbers and assume days
  const numberMatch = durationStr.match(/\d+/);
  return numberMatch ? parseInt(numberMatch[0]) : 30;
};

/**
 * Format expiry date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatExpiryDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Get subscription status color for UI
 * @param {Object} status - Subscription status object
 * @returns {string} Color class
 */
export const getSubscriptionStatusColor = (status) => {
  if (!status.hasSubscription) return 'text-gray-500';
  if (status.isExpired) return 'text-red-600';
  if (status.isExpiringSoon) return 'text-orange-600';
  return 'text-green-600';
};