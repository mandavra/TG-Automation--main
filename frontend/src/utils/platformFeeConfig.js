/**
 * Platform Fee Configuration System
 * 
 * This system manages platform fee rates with timestamps to ensure:
 * 1. Fee changes by super admin don't affect past transactions
 * 2. Each transaction uses the fee rate that was active when it was created
 * 3. Historical data integrity is maintained
 */

// Mock fee rate history - In production, this would come from the backend
const DEFAULT_FEE_HISTORY = [
  {
    id: '1',
    rate: 0.025, // 2.5%
    effectiveFrom: '2024-01-01T00:00:00.000Z',
    effectiveTo: '2024-06-30T23:59:59.999Z',
    createdBy: 'super_admin',
    createdAt: '2024-01-01T00:00:00.000Z',
    reason: 'Initial platform fee rate'
  },
  {
    id: '2', 
    rate: 0.029, // 2.9%
    effectiveFrom: '2024-07-01T00:00:00.000Z',
    effectiveTo: null, // Current rate
    createdBy: 'super_admin',
    createdAt: '2024-07-01T00:00:00.000Z',
    reason: 'Rate adjustment for market conditions'
  }
];

/**
 * Get the platform fee rate that was active at a specific date
 * @param {string|Date} transactionDate - The date when the transaction occurred
 * @param {Array} feeHistory - Optional custom fee history (defaults to DEFAULT_FEE_HISTORY)
 * @returns {Object} Fee configuration object with rate and metadata
 */
export const getPlatformFeeRate = (transactionDate, feeHistory = DEFAULT_FEE_HISTORY) => {
  const txDate = new Date(transactionDate);
  
  // Find the fee rate that was active at the transaction date
  const activeFeeConfig = feeHistory.find(config => {
    const effectiveFrom = new Date(config.effectiveFrom);
    const effectiveTo = config.effectiveTo ? new Date(config.effectiveTo) : new Date();
    
    return txDate >= effectiveFrom && txDate <= effectiveTo;
  });
  
  // Fallback to latest rate if no specific rate found
  const fallbackConfig = feeHistory
    .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];
  
  return activeFeeConfig || fallbackConfig || {
    rate: 0.029, // Default 2.9%
    effectiveFrom: new Date().toISOString(),
    reason: 'Default rate'
  };
};

/**
 * Calculate platform fee for a transaction
 * @param {number} amount - Transaction gross amount
 * @param {string|Date} transactionDate - When the transaction occurred
 * @param {Array} feeHistory - Optional custom fee history
 * @returns {Object} Fee calculation with breakdown
 */
export const calculatePlatformFee = (amount, transactionDate, feeHistory = DEFAULT_FEE_HISTORY) => {
  const feeConfig = getPlatformFeeRate(transactionDate, feeHistory);
  const platformFee = amount * feeConfig.rate;
  const netAmount = amount - platformFee;
  
  return {
    grossAmount: amount,
    platformFee: platformFee,
    netAmount: netAmount,
    feeRate: feeConfig.rate,
    feePercentage: (feeConfig.rate * 100).toFixed(2),
    appliedConfig: feeConfig
  };
};

/**
 * Get current platform fee rate (for new transactions)
 * @param {Array} feeHistory - Optional custom fee history
 * @returns {Object} Current fee configuration
 */
export const getCurrentPlatformFeeRate = (feeHistory = DEFAULT_FEE_HISTORY) => {
  return getPlatformFeeRate(new Date(), feeHistory);
};

/**
 * Calculate total earnings with proper fee deductions
 * @param {Array} transactions - Array of transaction objects
 * @param {Array} feeHistory - Optional custom fee history
 * @returns {Object} Earnings breakdown
 */
export const calculateTotalEarnings = (transactions, feeHistory = DEFAULT_FEE_HISTORY) => {
  let grossTotal = 0;
  let netTotal = 0;
  let totalFees = 0;
  let successfulTransactions = 0;
  
  transactions.forEach(transaction => {
    if (transaction.status === 'SUCCESS') {
      const feeCalc = calculatePlatformFee(
        transaction.amount, 
        transaction.createdAt, 
        feeHistory
      );
      
      grossTotal += feeCalc.grossAmount;
      netTotal += feeCalc.netAmount;
      totalFees += feeCalc.platformFee;
      successfulTransactions++;
    }
  });
  
  return {
    grossTotal,
    netTotal,
    totalFees,
    successfulTransactions,
    totalTransactions: transactions.length,
    averageFeeRate: grossTotal > 0 ? (totalFees / grossTotal) : 0
  };
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: INR)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Simulate super admin updating fee rate (for demo purposes)
 * In production, this would be an API call to update the backend configuration
 * @param {number} newRate - New fee rate (0.029 = 2.9%)
 * @param {string} reason - Reason for the rate change
 * @returns {Object} New fee configuration
 */
export const updatePlatformFeeRate = (newRate, reason = 'Rate update by super admin') => {
  const now = new Date();
  const newConfig = {
    id: Date.now().toString(),
    rate: newRate,
    effectiveFrom: now.toISOString(),
    effectiveTo: null,
    createdBy: 'super_admin',
    createdAt: now.toISOString(),
    reason: reason
  };
  
  // In production, this would:
  // 1. Send API request to backend
  // 2. Update database with new rate configuration
  // 3. Set effectiveTo for the previous rate
  // 4. Return the new configuration
  
  console.log('New platform fee rate configuration:', newConfig);
  return newConfig;
};

/**
 * Get fee rate history for admin dashboard
 * @returns {Array} Array of fee rate configurations
 */
export const getFeeRateHistory = () => {
  // In production, this would fetch from the backend
  return DEFAULT_FEE_HISTORY;
};

export default {
  getPlatformFeeRate,
  calculatePlatformFee,
  getCurrentPlatformFeeRate,
  calculateTotalEarnings,
  formatCurrency,
  updatePlatformFeeRate,
  getFeeRateHistory
};
