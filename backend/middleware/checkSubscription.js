const PaymentLink = require('../models/paymentLinkModel');

const checkSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const activeSubscription = await PaymentLink.findOne({
      userid: userId,
      status: 'SUCCESS',
      expiry_date: { $gt: new Date() }
    });

    if (!activeSubscription) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew to continue.'
      });
    }

    // Add subscription info to request for use in routes
    req.subscription = activeSubscription;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription status'
    });
  }
};

module.exports = checkSubscription; 