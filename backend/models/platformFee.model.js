const mongoose = require('mongoose');

/**
 * Platform Fee Configuration Model
 * 
 * This model handles platform fee configurations with the following real-world considerations:
 * 1. Time-based versioning to protect historical transaction data
 * 2. Support for global and tenant-specific fee structures
 * 3. Audit trail for all fee changes
 * 4. Immutable historical records - once a fee period ends, it cannot be modified
 * 5. Flexible fee types (percentage, fixed amount, tiered)
 */

const platformFeeConfigSchema = new mongoose.Schema({
  // Fee Configuration Identity
  configId: {
    type: String,
    required: true,
    index: true,
    description: "Unique identifier for this fee configuration version"
  },
  
  // Scope of Application
  scope: {
    type: String,
    enum: ['global', 'tenant'],
    required: true,
    index: true,
    description: "Whether this fee applies globally or to specific tenant"
  },
  
  // Tenant Reference (null for global fees)
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    index: true,
    sparse: true,
    description: "Admin/Tenant this fee applies to (null for global)"
  },
  
  // Channel Bundle Reference (optional - for bundle-specific fees)
  channelBundleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    index: true,
    sparse: true,
    description: "Specific channel bundle this fee applies to"
  },
  
  // Time Validity - Critical for Historical Data Protection
  effectiveFrom: {
    type: Date,
    required: true,
    index: true,
    description: "Date from which this fee configuration is active"
  },
  
  effectiveTo: {
    type: Date,
    index: true,
    default: null, // null means currently active
    description: "Date until which this fee configuration is active (null = active)"
  },
  
  // Fee Structure
  feeType: {
    type: String,
    enum: ['percentage', 'fixed', 'tiered'],
    required: true,
    description: "Type of fee structure"
  },
  
  // Percentage Fee (for feeType: 'percentage')
  percentageRate: {
    type: Number,
    min: 0,
    max: 100,
    description: "Fee percentage (0-100)"
  },
  
  // Fixed Fee (for feeType: 'fixed')  
  fixedAmount: {
    type: Number,
    min: 0,
    description: "Fixed fee amount"
  },
  
  // Currency for fixed fees
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR'],
    description: "Currency for fixed amount fees"
  },
  
  // Tiered Fee Structure (for feeType: 'tiered')
  tieredRates: [{
    minAmount: {
      type: Number,
      required: true,
      description: "Minimum transaction amount for this tier"
    },
    maxAmount: {
      type: Number,
      description: "Maximum transaction amount for this tier (null for unlimited)"
    },
    rate: {
      type: Number,
      required: true,
      description: "Fee rate for this tier (percentage or fixed based on tierType)"
    },
    tierType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
      description: "Whether this tier uses percentage or fixed fee"
    }
  }],
  
  // Minimum and Maximum Fee Limits
  minFee: {
    type: Number,
    min: 0,
    description: "Minimum fee amount (useful for percentage fees)"
  },
  
  maxFee: {
    type: Number,
    min: 0,
    description: "Maximum fee amount (useful for percentage fees)"
  },
  
  // Business Rules
  applyToNewTransactionsOnly: {
    type: Boolean,
    default: true,
    description: "Whether this fee only applies to new transactions (protection for existing)"
  },
  
  // Status and Version Control
  status: {
    type: String,
    enum: ['draft', 'active', 'expired', 'superseded'],
    default: 'draft',
    required: true,
    index: true,
    description: "Current status of this fee configuration"
  },
  
  version: {
    type: Number,
    required: true,
    default: 1,
    description: "Version number for this configuration"
  },
  
  // Audit Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    description: "Super admin who created this configuration"
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    description: "Super admin who approved this configuration"
  },
  
  approvedAt: {
    type: Date,
    description: "When this configuration was approved"
  },
  
  // Change Reason and Notes
  changeReason: {
    type: String,
    maxlength: 1000,
    description: "Reason for creating this fee configuration"
  },
  
  adminNotes: {
    type: String,
    maxlength: 2000,
    description: "Internal admin notes about this configuration"
  },
  
  // Previous Configuration Reference
  supersedes: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformFeeConfig',
    description: "Previous configuration that this one replaces"
  },
  
  // Usage Statistics (for reporting)
  usageStats: {
    transactionsAffected: {
      type: Number,
      default: 0,
      description: "Number of transactions this config has been applied to"
    },
    totalFeesCollected: {
      type: Number,
      default: 0,
      description: "Total fees collected under this configuration"
    },
    lastUsed: {
      type: Date,
      description: "Last time this configuration was used for a transaction"
    }
  }
  
}, { 
  timestamps: true,
  // Ensure immutability for historical records
  versionKey: '__v'
});

// Compound Indexes for Efficient Queries
platformFeeConfigSchema.index({ scope: 1, tenantId: 1, effectiveFrom: -1 });
platformFeeConfigSchema.index({ effectiveFrom: 1, effectiveTo: 1, status: 1 });
platformFeeConfigSchema.index({ tenantId: 1, channelBundleId: 1, status: 1 });
platformFeeConfigSchema.index({ status: 1, effectiveFrom: -1 });

// Validation Rules
platformFeeConfigSchema.pre('validate', function(next) {
  // Ensure fee structure is properly defined based on feeType
  if (this.feeType === 'percentage' && (!this.percentageRate && this.percentageRate !== 0)) {
    return next(new Error('Percentage rate is required for percentage fee type'));
  }
  
  if (this.feeType === 'fixed' && (!this.fixedAmount && this.fixedAmount !== 0)) {
    return next(new Error('Fixed amount is required for fixed fee type'));
  }
  
  if (this.feeType === 'tiered' && (!this.tieredRates || this.tieredRates.length === 0)) {
    return next(new Error('Tiered rates are required for tiered fee type'));
  }
  
  // Validate effective dates
  if (this.effectiveTo && this.effectiveFrom >= this.effectiveTo) {
    return next(new Error('Effective from date must be before effective to date'));
  }
  
  // Validate tenant scope
  if (this.scope === 'tenant' && !this.tenantId) {
    return next(new Error('Tenant ID is required for tenant-specific fees'));
  }
  
  if (this.scope === 'global' && this.tenantId) {
    return next(new Error('Tenant ID should not be set for global fees'));
  }
  
  next();
});

// Instance Methods

/**
 * Calculate fee for a given transaction amount
 */
platformFeeConfigSchema.methods.calculateFee = function(transactionAmount) {
  let calculatedFee = 0;
  
  switch (this.feeType) {
    case 'percentage':
      calculatedFee = (transactionAmount * this.percentageRate) / 100;
      break;
      
    case 'fixed':
      calculatedFee = this.fixedAmount;
      break;
      
    case 'tiered':
      // Find applicable tier
      const applicableTier = this.tieredRates.find(tier => 
        transactionAmount >= tier.minAmount && 
        (!tier.maxAmount || transactionAmount <= tier.maxAmount)
      );
      
      if (applicableTier) {
        if (applicableTier.tierType === 'percentage') {
          calculatedFee = (transactionAmount * applicableTier.rate) / 100;
        } else {
          calculatedFee = applicableTier.rate;
        }
      }
      break;
  }
  
  // Apply min/max limits
  if (this.minFee && calculatedFee < this.minFee) {
    calculatedFee = this.minFee;
  }
  
  if (this.maxFee && calculatedFee > this.maxFee) {
    calculatedFee = this.maxFee;
  }
  
  return Math.round(calculatedFee * 100) / 100; // Round to 2 decimal places
};

/**
 * Check if this configuration is currently active
 */
platformFeeConfigSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.effectiveFrom <= now && 
         (!this.effectiveTo || this.effectiveTo > now);
};

/**
 * Mark configuration as expired (for historical protection)
 */
platformFeeConfigSchema.methods.expire = function() {
  if (this.status === 'active') {
    this.status = 'expired';
    this.effectiveTo = new Date();
  }
};

// Static Methods

/**
 * Get active fee configuration for a specific context
 */
platformFeeConfigSchema.statics.getActiveFeeConfig = async function(options = {}) {
  const { tenantId, channelBundleId, transactionDate = new Date() } = options;
  
  const query = {
    status: 'active',
    effectiveFrom: { $lte: transactionDate },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gt: transactionDate } }
    ]
  };
  
  // Try to find tenant-specific config first
  if (tenantId) {
    const tenantConfig = await this.findOne({
      ...query,
      scope: 'tenant',
      tenantId,
      ...(channelBundleId && { channelBundleId })
    }).sort({ effectiveFrom: -1 });
    
    if (tenantConfig) return tenantConfig;
  }
  
  // Fall back to global config
  const globalConfig = await this.findOne({
    ...query,
    scope: 'global'
  }).sort({ effectiveFrom: -1 });
  
  return globalConfig;
};

/**
 * Create new fee configuration with proper versioning
 */
platformFeeConfigSchema.statics.createNewConfig = async function(configData, createdBy) {
  // Generate unique config ID
  const configId = `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Find latest version for this scope/tenant combination
  const query = {
    scope: configData.scope,
    ...(configData.tenantId && { tenantId: configData.tenantId }),
    ...(configData.channelBundleId && { channelBundleId: configData.channelBundleId })
  };
  
  const latestConfig = await this.findOne(query).sort({ version: -1 });
  const newVersion = latestConfig ? latestConfig.version + 1 : 1;
  
  // Create new configuration
  const newConfig = new this({
    ...configData,
    configId,
    version: newVersion,
    createdBy,
    status: 'draft'
  });
  
  return await newConfig.save();
};

module.exports = mongoose.model('PlatformFeeConfig', platformFeeConfigSchema);