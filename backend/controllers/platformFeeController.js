const PlatformFeeConfig = require('../models/platformFee.model');
const platformFeeService = require('../services/platformFeeService');

/**
 * Platform Fee Management Controller
 * 
 * Handles all platform fee configuration operations with:
 * - Historical data protection
 * - Proper versioning
 * - Audit trails
 * - Super admin only access
 */

/**
 * Get all fee configurations with optional filtering
 */
const getAllFeeConfigs = async (req, res) => {
  try {
    const {
      scope,
      tenantId,
      channelBundleId,
      status,
      page = 1,
      limit = 10,
      sortBy = 'effectiveFrom',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (scope) query.scope = scope;
    if (tenantId) query.tenantId = tenantId;
    if (channelBundleId) query.channelBundleId = channelBundleId;
    if (status) query.status = status;

    // Manual pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    
    // Get total count for pagination
    const totalDocs = await PlatformFeeConfig.countDocuments(query);
    const totalPages = Math.ceil(totalDocs / limitNum);
    
    const configs = await PlatformFeeConfig.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limitNum)
      .populate([
        { path: 'tenantId', select: 'email role' },
        { path: 'channelBundleId', select: 'name customRoute' },
        { path: 'createdBy', select: 'email' },
        { path: 'approvedBy', select: 'email' }
      ]);

    res.json({
      success: true,
      data: configs,
      pagination: {
        page: parseInt(page),
        totalPages,
        totalDocs,
        limit: limitNum,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get fee configurations error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch fee configurations'
    });
  }
};

/**
 * Get active fee configuration for a specific context
 */
const getActiveFeeConfig = async (req, res) => {
  try {
    const { tenantId, channelBundleId } = req.query;
    const transactionDate = req.query.transactionDate ? new Date(req.query.transactionDate) : new Date();

    const activeFeeConfig = await PlatformFeeConfig.getActiveFeeConfig({
      tenantId,
      channelBundleId,
      transactionDate
    });

    if (!activeFeeConfig) {
      return res.status(404).json({
        success: false,
        message: 'No active fee configuration found for the specified context'
      });
    }

    // Populate references
    await activeFeeConfig.populate([
      { path: 'tenantId', select: 'email role' },
      { path: 'channelBundleId', select: 'name customRoute' },
      { path: 'createdBy', select: 'email' }
    ]);

    res.json({
      success: true,
      data: activeFeeConfig
    });

  } catch (error) {
    console.error('Get active fee config error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get active fee configuration'
    });
  }
};

/**
 * Calculate fee for a transaction amount using current active configuration
 */
const calculateFee = async (req, res) => {
  try {
    const { amount, tenantId, channelBundleId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid transaction amount is required'
      });
    }

    const feeCalculation = await platformFeeService.calculateTransactionFee({
      amount,
      tenantId,
      channelBundleId,
      transactionDate: new Date()
    });

    res.json({
      success: true,
      data: feeCalculation
    });

  } catch (error) {
    console.error('Fee calculation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate fee'
    });
  }
};

/**
 * Create new fee configuration
 */
const createFeeConfig = async (req, res) => {
  try {
    const {
      scope,
      tenantId,
      channelBundleId,
      effectiveFrom,
      feeType,
      percentageRate,
      fixedAmount,
      currency,
      tieredRates,
      minFee,
      maxFee,
      changeReason,
      adminNotes
    } = req.body;

    // Validation
    if (!scope || !effectiveFrom || !feeType || !changeReason) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: scope, effectiveFrom, feeType, changeReason'
      });
    }

    // Additional validations based on fee type
    if (feeType === 'percentage' && (!percentageRate && percentageRate !== 0)) {
      return res.status(400).json({
        success: false,
        message: 'Percentage rate is required for percentage fee type'
      });
    }

    if (feeType === 'fixed' && (!fixedAmount && fixedAmount !== 0)) {
      return res.status(400).json({
        success: false,
        message: 'Fixed amount is required for fixed fee type'
      });
    }

    if (feeType === 'tiered' && (!tieredRates || !Array.isArray(tieredRates) || tieredRates.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Tiered rates array is required for tiered fee type'
      });
    }

    const configData = {
      scope,
      tenantId,
      channelBundleId,
      effectiveFrom: new Date(effectiveFrom),
      feeType,
      percentageRate,
      fixedAmount,
      currency: currency || 'INR',
      tieredRates,
      minFee,
      maxFee,
      changeReason,
      adminNotes
    };

    const newConfig = await PlatformFeeConfig.createNewConfig(configData, req.admin._id);

    // Populate references for response
    await newConfig.populate([
      { path: 'tenantId', select: 'email role' },
      { path: 'channelBundleId', select: 'name customRoute' },
      { path: 'createdBy', select: 'email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Fee configuration created successfully',
      data: newConfig
    });

  } catch (error) {
    console.error('Create fee config error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create fee configuration'
    });
  }
};

/**
 * Approve and activate a fee configuration
 */
const approveFeeConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const feeConfig = await PlatformFeeConfig.findById(id);
    if (!feeConfig) {
      return res.status(404).json({
        success: false,
        message: 'Fee configuration not found'
      });
    }

    if (feeConfig.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft configurations can be approved'
      });
    }

    // Check if there's a conflicting active configuration
    const conflictingConfig = await PlatformFeeConfig.findOne({
      scope: feeConfig.scope,
      tenantId: feeConfig.tenantId,
      channelBundleId: feeConfig.channelBundleId,
      status: 'active',
      effectiveFrom: { $lte: feeConfig.effectiveFrom },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $gt: feeConfig.effectiveFrom } }
      ]
    });

    if (conflictingConfig) {
      // Expire the conflicting configuration
      conflictingConfig.status = 'superseded';
      conflictingConfig.effectiveTo = new Date(feeConfig.effectiveFrom.getTime() - 1000); // 1 second before
      await conflictingConfig.save();
    }

    // Approve and activate the new configuration
    feeConfig.status = 'active';
    feeConfig.approvedBy = req.admin._id;
    feeConfig.approvedAt = new Date();
    if (approvalNotes) {
      feeConfig.adminNotes = (feeConfig.adminNotes || '') + '\n\nApproval Notes: ' + approvalNotes;
    }

    await feeConfig.save();

    await feeConfig.populate([
      { path: 'tenantId', select: 'email role' },
      { path: 'channelBundleId', select: 'name customRoute' },
      { path: 'createdBy', select: 'email' },
      { path: 'approvedBy', select: 'email' }
    ]);

    res.json({
      success: true,
      message: 'Fee configuration approved and activated successfully',
      data: feeConfig
    });

  } catch (error) {
    console.error('Approve fee config error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve fee configuration'
    });
  }
};

/**
 * Update fee configuration (creates new version)
 */
const updateFeeConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingConfig = await PlatformFeeConfig.findById(id);
    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: 'Fee configuration not found'
      });
    }

    // Only draft configurations can be updated directly
    if (existingConfig.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft configurations can be updated. Create a new version for active configurations.'
      });
    }

    // Update the configuration
    Object.assign(existingConfig, updateData);
    await existingConfig.save();

    await existingConfig.populate([
      { path: 'tenantId', select: 'email role' },
      { path: 'channelBundleId', select: 'name customRoute' },
      { path: 'createdBy', select: 'email' }
    ]);

    res.json({
      success: true,
      message: 'Fee configuration updated successfully',
      data: existingConfig
    });

  } catch (error) {
    console.error('Update fee config error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update fee configuration'
    });
  }
};

/**
 * Create new version of existing fee configuration
 */
const createNewVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { effectiveFrom, changeReason, ...updateData } = req.body;

    const existingConfig = await PlatformFeeConfig.findById(id);
    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: 'Fee configuration not found'
      });
    }

    if (!effectiveFrom || !changeReason) {
      return res.status(400).json({
        success: false,
        message: 'Effective from date and change reason are required'
      });
    }

    // Create new version based on existing configuration
    const newConfigData = {
      scope: existingConfig.scope,
      tenantId: existingConfig.tenantId,
      channelBundleId: existingConfig.channelBundleId,
      feeType: existingConfig.feeType,
      percentageRate: existingConfig.percentageRate,
      fixedAmount: existingConfig.fixedAmount,
      currency: existingConfig.currency,
      tieredRates: existingConfig.tieredRates,
      minFee: existingConfig.minFee,
      maxFee: existingConfig.maxFee,
      supersedes: existingConfig._id,
      effectiveFrom: new Date(effectiveFrom),
      changeReason,
      ...updateData
    };

    const newConfig = await PlatformFeeConfig.createNewConfig(newConfigData, req.admin._id);

    await newConfig.populate([
      { path: 'tenantId', select: 'email role' },
      { path: 'channelBundleId', select: 'name customRoute' },
      { path: 'createdBy', select: 'email' },
      { path: 'supersedes', select: 'version effectiveFrom' }
    ]);

    res.status(201).json({
      success: true,
      message: 'New fee configuration version created successfully',
      data: newConfig
    });

  } catch (error) {
    console.error('Create new version error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create new version'
    });
  }
};

/**
 * Get fee configuration history for a specific scope/tenant
 */
const getFeeHistory = async (req, res) => {
  try {
    const { scope, tenantId, channelBundleId } = req.query;

    if (!scope) {
      return res.status(400).json({
        success: false,
        message: 'Scope parameter is required'
      });
    }

    const query = { scope };
    if (tenantId) query.tenantId = tenantId;
    if (channelBundleId) query.channelBundleId = channelBundleId;

    const history = await PlatformFeeConfig.find(query)
      .sort({ effectiveFrom: -1, version: -1 })
      .populate([
        { path: 'tenantId', select: 'email role' },
        { path: 'channelBundleId', select: 'name customRoute' },
        { path: 'createdBy', select: 'email' },
        { path: 'approvedBy', select: 'email' }
      ]);

    res.json({
      success: true,
      data: history,
      total: history.length
    });

  } catch (error) {
    console.error('Get fee history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get fee history'
    });
  }
};

/**
 * Get fee statistics and analytics
 */
const getFeeAnalytics = async (req, res) => {
  try {
    const { scope, tenantId, startDate, endDate } = req.query;

    const matchQuery = {};
    if (scope) matchQuery.scope = scope;
    if (tenantId) matchQuery.tenantId = tenantId;
    if (startDate) matchQuery.createdAt = { $gte: new Date(startDate) };
    if (endDate) matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(endDate) };

    const analytics = await PlatformFeeConfig.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            scope: '$scope',
            status: '$status'
          },
          count: { $sum: 1 },
          totalFeesCollected: { $sum: '$usageStats.totalFeesCollected' },
          totalTransactions: { $sum: '$usageStats.transactionsAffected' }
        }
      },
      {
        $group: {
          _id: '$_id.scope',
          statusBreakdown: {
            $push: {
              status: '$_id.status',
              count: '$count',
              totalFeesCollected: '$totalFeesCollected',
              totalTransactions: '$totalTransactions'
            }
          },
          totalConfigs: { $sum: '$count' },
          grandTotalFees: { $sum: '$totalFeesCollected' },
          grandTotalTransactions: { $sum: '$totalTransactions' }
        }
      }
    ]);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Get fee analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get fee analytics'
    });
  }
};

module.exports = {
  getAllFeeConfigs,
  getActiveFeeConfig,
  calculateFee,
  createFeeConfig,
  approveFeeConfig,
  updateFeeConfig,
  createNewVersion,
  getFeeHistory,
  getFeeAnalytics
};