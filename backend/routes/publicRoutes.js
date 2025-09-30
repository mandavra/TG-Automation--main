const express = require('express');
const router = express.Router();
const groupService = require('../services/groupService');

// Dynamic channel bundle landing pages - /pc/{customRoute}
router.get('/pc/:route', async (req, res) => {
  try {
    const { route } = req.params;
    
    console.log(`Dynamic route requested: /pc/${route}`);
    
    const group = await groupService.getGroupByRoute(route);
    
    if (!group) {
      console.log(`Channel bundle not found for route: ${route}`);
      return res.status(404).json({
        success: false,
        message: 'Channel bundle not found or inactive',
        route: route
      });
    }
    
    console.log(`Channel bundle found: ${group.name} for route: ${route}`);
    
    // Return channel bundle data for frontend to render landing page
    res.json({
      success: true,
      route: route,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        image: group.image,
        customRoute: group.customRoute,
        subscriptionPlans: group.subscriptionPlans,
        faqs: group.faqs || [],
        addGST: group.addGST,
        featureToggles: group.featureToggles || {
          enableESign: true,
          enableKYC: true,
          enablePayment: true
        },
        stats: group.stats,
        telegramChatTitle: group.telegramChatTitle,
        telegramChatId: group.telegramChatId,
        createdBy: group.createdBy
      }
    });
    
  } catch (error) {
    console.error('Dynamic route error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Alternative endpoint for mobile or other prefixes
router.get('/mobile/:route', async (req, res) => {
  // Same logic as /pc/ but for mobile version
  req.url = `/pc/${req.params.route}`;
  return router.handle(req, res);
});

// Health check for dynamic routes
router.get('/routes/health', (req, res) => {
  res.json({
    success: true,
    message: 'Dynamic routing system is active',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;