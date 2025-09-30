const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const groupService = require('../services/groupService');

// Apply super admin authentication
router.use(adminAuth);
router.use(requireRole('superadmin'));

// Super Admin: Update feature toggles for any channel bundle
router.patch('/channel-bundles/:id/feature-toggles', async (req, res) => {
  try {
    const { id } = req.params;
    const { featureToggles } = req.body;

    if (!featureToggles || typeof featureToggles !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid feature toggles data'
      });
    }

    // Validate feature toggle fields
    const allowedToggles = ['enableKYC', 'enableESign'];
    const validToggles = {};
    
    for (const toggle of allowedToggles) {
      if (typeof featureToggles[toggle] === 'boolean') {
        validToggles[toggle] = featureToggles[toggle];
      }
    }

    if (Object.keys(validToggles).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid feature toggles provided'
      });
    }

    // Update only feature toggles with super admin role
    const updatedGroup = await groupService.updateGroup(
      id, 
      { featureToggles: validToggles }, 
      'superadmin'
    );

    res.json({
      success: true,
      message: 'Feature toggles updated successfully',
      data: {
        id: updatedGroup._id,
        name: updatedGroup.name,
        featureToggles: updatedGroup.featureToggles
      }
    });

  } catch (error) {
    console.error('Super admin feature toggle update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update feature toggles'
    });
  }
});

// Super Admin: Get all channel bundles with feature toggle status
router.get('/channel-bundles/feature-status', async (req, res) => {
  try {
    // Get all groups without admin filtering (super admin can see all)
    const groups = await groupService.getAllGroups({});
    
    const bundleStatus = groups.map(group => ({
      id: group._id,
      name: group.name,
      customRoute: group.customRoute,
      createdBy: group.createdBy,
      featureToggles: group.featureToggles || {
        enableKYC: true,
        enableESign: true
      },
      stats: {
        totalSubscribers: group.stats?.totalSubscribers || 0,
        totalRevenue: group.stats?.totalRevenue || 0
      },
      createdAt: group.createdAt
    }));

    res.json({
      success: true,
      data: bundleStatus,
      total: bundleStatus.length
    });

  } catch (error) {
    console.error('Super admin feature status fetch error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch feature status'
    });
  }
});

// Super Admin: Bulk update feature toggles
router.patch('/channel-bundles/bulk-feature-toggles', async (req, res) => {
  try {
    const { bundleIds, featureToggles } = req.body;

    if (!Array.isArray(bundleIds) || bundleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bundle IDs array is required'
      });
    }

    if (!featureToggles || typeof featureToggles !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Feature toggles object is required'
      });
    }

    // Validate feature toggle fields
    const allowedToggles = ['enableKYC', 'enableESign'];
    const validToggles = {};
    
    for (const toggle of allowedToggles) {
      if (typeof featureToggles[toggle] === 'boolean') {
        validToggles[toggle] = featureToggles[toggle];
      }
    }

    if (Object.keys(validToggles).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid feature toggles provided'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    // Update each bundle
    for (const bundleId of bundleIds) {
      try {
        const updatedGroup = await groupService.updateGroup(
          bundleId,
          { featureToggles: validToggles },
          'superadmin'
        );
        
        results.success.push({
          id: bundleId,
          name: updatedGroup.name
        });
      } catch (error) {
        results.failed.push({
          id: bundleId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Updated ${results.success.length} bundles successfully`,
      data: {
        updated: results.success.length,
        failed: results.failed.length,
        results
      }
    });

  } catch (error) {
    console.error('Super admin bulk feature toggle update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to perform bulk update'
    });
  }
});

module.exports = router;