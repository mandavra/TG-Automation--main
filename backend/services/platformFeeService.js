const PlatformFeeConfig = require('../models/platformFee.model');

/**
 * Platform Fee Service
 * 
 * Business logic for platform fee management with:
 * - Historical data protection
 * - Dynamic fee calculation
 * - Caching for performance
 * - Real-world transaction handling
 */

class PlatformFeeService {
  constructor() {
    // Cache for active fee configurations (TTL: 5 minutes)
    this.feeConfigCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Calculate fee for a transaction with full context
   */
  async calculateTransactionFee(options = {}) {
    try {
      const {
        amount,
        tenantId = null,
        channelBundleId = null,
        transactionDate = new Date(),
        forceNoCache = false
      } = options;

      if (!amount || amount <= 0) {
        throw new Error('Valid transaction amount is required');
      }

      // Get active fee configuration
      const feeConfig = await this.getActiveFeeConfig({
        tenantId,
        channelBundleId,
        transactionDate,
        forceNoCache
      });

      if (!feeConfig) {
        // No fee configuration found, return zero fee
        return {
          transactionAmount: amount,
          platformFee: 0,
          netAmount: amount,
          feeRate: 0,
          feeType: 'none',
          currency: 'INR',
          configUsed: null,
          calculatedAt: new Date(),
          breakdown: {
            grossAmount: amount,
            platformFee: 0,
            netAmount: amount
          }
        };
      }

      // Calculate fee using the configuration
      const calculatedFee = feeConfig.calculateFee(amount);

      // Update usage statistics (async, don't wait for completion)
      this.updateUsageStatistics(feeConfig._id, amount, calculatedFee).catch(console.error);

      return {
        transactionAmount: amount,
        platformFee: calculatedFee,
        netAmount: amount - calculatedFee,
        feeRate: feeConfig.feeType === 'percentage' ? feeConfig.percentageRate : null,
        feeType: feeConfig.feeType,
        currency: feeConfig.currency || 'INR',
        configUsed: {
          id: feeConfig._id,
          configId: feeConfig.configId,
          version: feeConfig.version,
          scope: feeConfig.scope,
          effectiveFrom: feeConfig.effectiveFrom
        },
        calculatedAt: new Date(),
        breakdown: this.getFeeBreakdown(amount, calculatedFee, feeConfig)
      };

    } catch (error) {
      console.error('Transaction fee calculation error:', error);
      throw error;
    }
  }

  /**
   * Get detailed fee breakdown
   */
  getFeeBreakdown(amount, calculatedFee, feeConfig) {
    const breakdown = {
      grossAmount: amount,
      platformFee: calculatedFee,
      netAmount: amount - calculatedFee,
      calculation: {}
    };

    switch (feeConfig.feeType) {
      case 'percentage':
        breakdown.calculation = {
          type: 'percentage',
          rate: feeConfig.percentageRate,
          baseAmount: amount,
          calculatedFee: (amount * feeConfig.percentageRate) / 100,
          appliedLimits: this.getAppliedLimits(calculatedFee, feeConfig)
        };
        break;

      case 'fixed':
        breakdown.calculation = {
          type: 'fixed',
          fixedAmount: feeConfig.fixedAmount,
          currency: feeConfig.currency
        };
        break;

      case 'tiered':
        const applicableTier = feeConfig.tieredRates.find(tier =>
          amount >= tier.minAmount &&
          (!tier.maxAmount || amount <= tier.maxAmount)
        );
        breakdown.calculation = {
          type: 'tiered',
          applicableTier,
          tierRate: applicableTier?.rate,
          tierType: applicableTier?.tierType
        };
        break;
    }

    return breakdown;
  }

  /**
   * Get applied fee limits information
   */
  getAppliedLimits(calculatedFee, feeConfig) {
    const limits = {};

    if (feeConfig.minFee && calculatedFee === feeConfig.minFee) {
      limits.minFeeApplied = true;
      limits.minFeeAmount = feeConfig.minFee;
    }

    if (feeConfig.maxFee && calculatedFee === feeConfig.maxFee) {
      limits.maxFeeApplied = true;
      limits.maxFeeAmount = feeConfig.maxFee;
    }

    return Object.keys(limits).length > 0 ? limits : null;
  }

  /**
   * Get active fee configuration with caching
   */
  async getActiveFeeConfig(options = {}) {
    const {
      tenantId = null,
      channelBundleId = null,
      transactionDate = new Date(),
      forceNoCache = false
    } = options;

    // Generate cache key
    const cacheKey = `${tenantId || 'global'}_${channelBundleId || 'any'}_${transactionDate.getTime()}`;

    // Check cache first (unless forcing no cache)
    if (!forceNoCache && this.feeConfigCache.has(cacheKey)) {
      const cached = this.feeConfigCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.config;
      } else {
        // Remove expired cache entry
        this.feeConfigCache.delete(cacheKey);
      }
    }

    // Get from database
    const feeConfig = await PlatformFeeConfig.getActiveFeeConfig({
      tenantId,
      channelBundleId,
      transactionDate
    });

    // Cache the result
    if (feeConfig) {
      this.feeConfigCache.set(cacheKey, {
        config: feeConfig,
        timestamp: Date.now()
      });
    }

    return feeConfig;
  }

  /**
   * Update usage statistics for a fee configuration
   */
  async updateUsageStatistics(configId, transactionAmount, feeAmount) {
    try {
      await PlatformFeeConfig.findByIdAndUpdate(configId, {
        $inc: {
          'usageStats.transactionsAffected': 1,
          'usageStats.totalFeesCollected': feeAmount
        },
        $set: {
          'usageStats.lastUsed': new Date()
        }
      });
    } catch (error) {
      console.error('Update usage statistics error:', error);
      // Don't throw - this is background operation
    }
  }

  /**
   * Bulk calculate fees for multiple transactions
   */
  async calculateBulkTransactionFees(transactions = []) {
    const results = [];

    for (const transaction of transactions) {
      try {
        const feeCalculation = await this.calculateTransactionFee({
          amount: transaction.amount,
          tenantId: transaction.tenantId,
          channelBundleId: transaction.channelBundleId,
          transactionDate: transaction.date || new Date()
        });

        results.push({
          transactionId: transaction.id || transaction._id,
          success: true,
          feeCalculation
        });
      } catch (error) {
        results.push({
          transactionId: transaction.id || transaction._id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Simulate fee impact for different scenarios
   */
  async simulateFeeImpact(simulationConfig) {
    const {
      amounts = [100, 500, 1000, 5000, 10000],
      tenantId,
      channelBundleId,
      currentDate = new Date(),
      futureDate
    } = simulationConfig;

    const results = {
      current: [],
      future: futureDate ? [] : null,
      comparison: futureDate ? [] : null
    };

    // Calculate current fees
    for (const amount of amounts) {
      try {
        const currentFee = await this.calculateTransactionFee({
          amount,
          tenantId,
          channelBundleId,
          transactionDate: currentDate
        });
        results.current.push({ amount, ...currentFee });
      } catch (error) {
        results.current.push({ amount, error: error.message });
      }
    }

    // Calculate future fees if future date provided
    if (futureDate) {
      for (const amount of amounts) {
        try {
          const futureFee = await this.calculateTransactionFee({
            amount,
            tenantId,
            channelBundleId,
            transactionDate: futureDate,
            forceNoCache: true
          });
          results.future.push({ amount, ...futureFee });
        } catch (error) {
          results.future.push({ amount, error: error.message });
        }
      }

      // Generate comparison
      results.comparison = amounts.map(amount => {
        const current = results.current.find(r => r.amount === amount);
        const future = results.future.find(r => r.amount === amount);

        if (current.error || future.error) {
          return {
            amount,
            error: current.error || future.error
          };
        }

        return {
          amount,
          currentFee: current.platformFee,
          futureFee: future.platformFee,
          difference: future.platformFee - current.platformFee,
          percentageChange: current.platformFee === 0 ? 
            (future.platformFee === 0 ? 0 : 100) :
            ((future.platformFee - current.platformFee) / current.platformFee) * 100
        };
      });
    }

    return results;
  }

  /**
   * Get fee configuration recommendations based on transaction history
   */
  async getFeeRecommendations(options = {}) {
    const {
      tenantId,
      channelBundleId,
      transactionHistory = [],
      targetFeePercentage,
      targetRevenue
    } = options;

    if (transactionHistory.length === 0) {
      return {
        error: 'Transaction history is required for recommendations'
      };
    }

    // Analyze transaction patterns
    const analysis = this.analyzeTransactionPatterns(transactionHistory);

    // Generate recommendations
    const recommendations = [];

    // Percentage fee recommendation
    if (targetFeePercentage) {
      const percentageRecommendation = this.generatePercentageRecommendation(
        analysis,
        targetFeePercentage
      );
      recommendations.push(percentageRecommendation);
    }

    // Tiered fee recommendation
    const tieredRecommendation = this.generateTieredRecommendation(analysis);
    recommendations.push(tieredRecommendation);

    // Fixed fee recommendation (for small amounts)
    if (analysis.averageAmount < 1000) {
      const fixedRecommendation = this.generateFixedRecommendation(analysis);
      recommendations.push(fixedRecommendation);
    }

    return {
      transactionAnalysis: analysis,
      recommendations,
      generatedAt: new Date()
    };
  }

  /**
   * Analyze transaction patterns
   */
  analyzeTransactionPatterns(transactions) {
    const amounts = transactions.map(t => t.amount);
    const sortedAmounts = [...amounts].sort((a, b) => a - b);

    return {
      totalTransactions: transactions.length,
      totalAmount: amounts.reduce((sum, amount) => sum + amount, 0),
      averageAmount: amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length,
      medianAmount: sortedAmounts[Math.floor(sortedAmounts.length / 2)],
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts),
      percentiles: {
        p25: sortedAmounts[Math.floor(sortedAmounts.length * 0.25)],
        p75: sortedAmounts[Math.floor(sortedAmounts.length * 0.75)],
        p90: sortedAmounts[Math.floor(sortedAmounts.length * 0.90)]
      }
    };
  }

  /**
   * Generate percentage fee recommendation
   */
  generatePercentageRecommendation(analysis, targetPercentage) {
    return {
      type: 'percentage',
      percentageRate: targetPercentage,
      projectedRevenue: analysis.totalAmount * (targetPercentage / 100),
      averageFeePerTransaction: analysis.averageAmount * (targetPercentage / 100),
      description: `${targetPercentage}% fee on all transactions`
    };
  }

  /**
   * Generate tiered fee recommendation
   */
  generateTieredRecommendation(analysis) {
    const tiers = [
      {
        minAmount: 0,
        maxAmount: analysis.percentiles.p25,
        rate: 2.5,
        tierType: 'percentage'
      },
      {
        minAmount: analysis.percentiles.p25 + 1,
        maxAmount: analysis.percentiles.p75,
        rate: 2.0,
        tierType: 'percentage'
      },
      {
        minAmount: analysis.percentiles.p75 + 1,
        maxAmount: null,
        rate: 1.5,
        tierType: 'percentage'
      }
    ];

    return {
      type: 'tiered',
      tieredRates: tiers,
      description: 'Tiered percentage fee based on transaction amount'
    };
  }

  /**
   * Generate fixed fee recommendation
   */
  generateFixedRecommendation(analysis) {
    const suggestedFixedFee = Math.max(10, analysis.averageAmount * 0.02);

    return {
      type: 'fixed',
      fixedAmount: suggestedFixedFee,
      currency: 'INR',
      projectedRevenue: analysis.totalTransactions * suggestedFixedFee,
      description: `Fixed fee of ₹${suggestedFixedFee} per transaction`
    };
  }

  /**
   * Clear fee configuration cache
   */
  clearCache() {
    this.feeConfigCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.feeConfigCache.forEach(entry => {
      if (now - entry.timestamp < this.cacheTimeout) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.feeConfigCache.size,
      validEntries,
      expiredEntries,
      cacheTimeout: this.cacheTimeout
    };
  }
}

// Export singleton instance
const platformFeeService = new PlatformFeeService();
module.exports = platformFeeService;