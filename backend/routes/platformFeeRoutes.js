const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const platformFeeController = require('../controllers/platformFeeController');

/**
 * Platform Fee Management Routes
 * 
 * All routes require super admin authentication for security
 * Provides comprehensive fee management capabilities with historical protection
 */

// Apply authentication middleware to all routes
router.use(adminAuth);
router.use(requireRole('superadmin'));

/**
 * @route   GET /api/platform-fees
 * @desc    Get all fee configurations with filtering and pagination
 * @access  Super Admin only
 * @params  ?scope=global|tenant&tenantId=xxx&channelBundleId=xxx&status=active|draft|expired&page=1&limit=10
 */
router.get('/', platformFeeController.getAllFeeConfigs);

/**
 * @route   GET /api/platform-fees/active
 * @desc    Get currently active fee configuration for specific context
 * @access  Super Admin only
 * @params  ?tenantId=xxx&channelBundleId=xxx&transactionDate=YYYY-MM-DD
 */
router.get('/active', platformFeeController.getActiveFeeConfig);

/**
 * @route   POST /api/platform-fees/calculate
 * @desc    Calculate fee for a transaction amount using current configuration
 * @access  Super Admin only
 * @body    { amount: number, tenantId?: string, channelBundleId?: string }
 */
router.post('/calculate', platformFeeController.calculateFee);

/**
 * @route   POST /api/platform-fees
 * @desc    Create new fee configuration
 * @access  Super Admin only
 * @body    Fee configuration object
 */
router.post('/', platformFeeController.createFeeConfig);

/**
 * @route   PATCH /api/platform-fees/:id/approve
 * @desc    Approve and activate a draft fee configuration
 * @access  Super Admin only
 * @body    { approvalNotes?: string }
 */
router.patch('/:id/approve', platformFeeController.approveFeeConfig);

/**
 * @route   PUT /api/platform-fees/:id
 * @desc    Update fee configuration (draft only)
 * @access  Super Admin only
 * @body    Updated fee configuration object
 */
router.put('/:id', platformFeeController.updateFeeConfig);

/**
 * @route   POST /api/platform-fees/:id/new-version
 * @desc    Create new version of existing fee configuration
 * @access  Super Admin only
 * @body    { effectiveFrom: date, changeReason: string, ...updates }
 */
router.post('/:id/new-version', platformFeeController.createNewVersion);

/**
 * @route   GET /api/platform-fees/history
 * @desc    Get fee configuration history for specific scope/tenant
 * @access  Super Admin only
 * @params  ?scope=global|tenant&tenantId=xxx&channelBundleId=xxx
 */
router.get('/history', platformFeeController.getFeeHistory);

/**
 * @route   GET /api/platform-fees/analytics
 * @desc    Get fee statistics and analytics
 * @access  Super Admin only  
 * @params  ?scope=global|tenant&tenantId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/analytics', platformFeeController.getFeeAnalytics);

/**
 * Additional utility routes for advanced fee management
 */

/**
 * @route   POST /api/platform-fees/bulk-calculate
 * @desc    Calculate fees for multiple transactions
 * @access  Super Admin only
 * @body    { transactions: [{ amount, tenantId?, channelBundleId?, date? }] }
 */
router.post('/bulk-calculate', async (req, res) => {
  try {
    const { transactions = [] } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transactions array is required'
      });
    }

    const platformFeeService = require('../services/platformFeeService');
    const results = await platformFeeService.calculateBulkTransactionFees(transactions);

    res.json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Bulk calculate error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate bulk fees'
    });
  }
});

/**
 * @route   POST /api/platform-fees/simulate-impact
 * @desc    Simulate fee impact for different scenarios
 * @access  Super Admin only
 * @body    { amounts?: number[], tenantId?, channelBundleId?, currentDate?, futureDate? }
 */
router.post('/simulate-impact', async (req, res) => {
  try {
    const simulationConfig = req.body;
    const platformFeeService = require('../services/platformFeeService');
    
    const results = await platformFeeService.simulateFeeImpact(simulationConfig);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Simulate impact error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to simulate fee impact'
    });
  }
});

/**
 * @route   POST /api/platform-fees/recommendations
 * @desc    Get fee configuration recommendations based on transaction history
 * @access  Super Admin only
 * @body    { tenantId?, channelBundleId?, transactionHistory: [], targetFeePercentage?, targetRevenue? }
 */
router.post('/recommendations', async (req, res) => {
  try {
    const options = req.body;
    const platformFeeService = require('../services/platformFeeService');
    
    const recommendations = await platformFeeService.getFeeRecommendations(options);

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get recommendations'
    });
  }
});

/**
 * @route   DELETE /api/platform-fees/cache
 * @desc    Clear fee configuration cache (for testing/debugging)
 * @access  Super Admin only
 */
router.delete('/cache', (req, res) => {
  try {
    const platformFeeService = require('../services/platformFeeService');
    const stats = platformFeeService.getCacheStats();
    platformFeeService.clearCache();

    res.json({
      success: true,
      message: 'Fee configuration cache cleared',
      previousStats: stats
    });

  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear cache'
    });
  }
});

/**
 * @route   GET /api/platform-fees/cache/stats
 * @desc    Get cache statistics
 * @access  Super Admin only
 */
router.get('/cache/stats', (req, res) => {
  try {
    const platformFeeService = require('../services/platformFeeService');
    const stats = platformFeeService.getCacheStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get cache stats'
    });
  }
});

/**
 * @route   GET /api/platform-fees/:id
 * @desc    Get specific fee configuration by ID
 * @access  Super Admin only
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const PlatformFeeConfig = require('../models/platformFee.model');

    const feeConfig = await PlatformFeeConfig.findById(id)
      .populate([
        { path: 'tenantId', select: 'email role' },
        { path: 'channelBundleId', select: 'name customRoute' },
        { path: 'createdBy', select: 'email' },
        { path: 'approvedBy', select: 'email' },
        { path: 'supersedes', select: 'version effectiveFrom configId' }
      ]);

    if (!feeConfig) {
      return res.status(404).json({
        success: false,
        message: 'Fee configuration not found'
      });
    }

    res.json({
      success: true,
      data: feeConfig
    });

  } catch (error) {
    console.error('Get fee config error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get fee configuration'
    });
  }
});

/**
 * @route   DELETE /api/platform-fees/:id
 * @desc    Delete fee configuration (draft only, for data protection)
 * @access  Super Admin only
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const PlatformFeeConfig = require('../models/platformFee.model');

    const feeConfig = await PlatformFeeConfig.findById(id);
    if (!feeConfig) {
      return res.status(404).json({
        success: false,
        message: 'Fee configuration not found'
      });
    }

    // Only allow deletion of draft configurations to protect historical data
    if (feeConfig.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft configurations can be deleted. Use expire for active configurations.'
      });
    }

    await PlatformFeeConfig.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Draft fee configuration deleted successfully'
    });

  } catch (error) {
    console.error('Delete fee config error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete fee configuration'
    });
  }
});

module.exports = router;