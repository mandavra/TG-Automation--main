const express = require('express');
const router = express.Router();
const PaymentLink = require('../models/paymentLinkModel');
const User = require('../models/user.model');
const { subscriptionExpiryService } = require('../services/subscriptionExpiryService');

/**
 * Get user's subscription status for a specific bundle
 * GET /api/subscription/status?phone=xxx&bundleId=xxx
 */
router.get('/status', async (req, res) => {
  try {
    const { phone, bundleId } = req.query;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build query for payment records
    let query = {
      userid: user._id,
      status: 'SUCCESS'
    };
    
    // Add bundle filter if provided
    if (bundleId) {
      // For bundle-specific subscriptions, we might need to check groupId or custom route
      // This depends on how bundles are linked to payment records
      query.groupId = bundleId;
    }
    
    // Find most recent successful payment for this user/bundle
    const subscription = await PaymentLink.findOne(query)
      .sort({ purchase_datetime: -1 })
      .populate('groupId');
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    // Check if subscription is expired
    const now = new Date();
    const expiryDate = new Date(subscription.expiry_date);
    const isExpired = expiryDate <= now;
    const daysRemaining = Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)));
    
    res.json({
      ...subscription.toObject(),
      isExpired,
      daysRemaining,
      timeUntilExpiry: expiryDate - now
    });
    
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Extend user's subscription
 * POST /api/subscription/extend
 */
router.post('/extend', async (req, res) => {
  try {
    const { phone, bundleId, planId, duration, amount, paymentId, isExtension = true } = req.body;
    
    if (!phone || !planId || !duration || !amount || !paymentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find current subscription
    let query = {
      userid: user._id,
      status: 'SUCCESS'
    };
    
    if (bundleId) {
      query.groupId = bundleId;
    }
    
    const currentSubscription = await PaymentLink.findOne(query)
      .sort({ purchase_datetime: -1 });
    
    // Calculate new expiry date
    let newExpiryDate;
    const durationInDays = parseDuration(duration);
    
    if (currentSubscription) {
      const currentExpiry = new Date(currentSubscription.expiry_date);
      const now = new Date();
      
      // If current subscription is still active, extend from expiry date
      // If expired, extend from now
      const baseDate = currentExpiry > now ? currentExpiry : now;
      newExpiryDate = new Date(baseDate);
      newExpiryDate.setDate(newExpiryDate.getDate() + durationInDays);
    } else {
      // New subscription - start from now
      newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + durationInDays);
    }
    
    // Create new payment record for extension
    const extensionPayment = new PaymentLink({
      userid: user._id,
      link_id: paymentId,
      link_url: '', // Extension doesn't need URL
      customer_id: user._id.toString(),
      phone: user.phone,
      amount: amount,
      plan_id: planId,
      plan_name: `Extension - ${duration}`,
      status: 'SUCCESS',
      purchase_datetime: new Date(),
      expiry_date: newExpiryDate,
      duration: durationInDays,
      utr: paymentId,
      isExtension: true,
      adminId: currentSubscription?.adminId || user.adminId,
      groupId: bundleId || currentSubscription?.groupId
    });
    
    await extensionPayment.save();
    
    // Update current subscription status if exists
    if (currentSubscription) {
      currentSubscription.statusReason = 'Extended by new subscription';
      await currentSubscription.save();
    }
    
    // Schedule expiry job for new subscription
    if (subscriptionExpiryService && typeof subscriptionExpiryService.scheduleExpiryJob === 'function') {
      try {
        await subscriptionExpiryService.scheduleExpiryJob(extensionPayment);
      } catch (jobError) {
        console.warn('Failed to schedule expiry job:', jobError);
      }
    }
    
    res.json({
      success: true,
      subscription: extensionPayment.toObject(),
      message: `Subscription extended until ${newExpiryDate.toLocaleDateString()}`,
      newExpiryDate: newExpiryDate,
      daysAdded: durationInDays
    });
    
  } catch (error) {
    console.error('Error extending subscription:', error);
    res.status(500).json({ error: 'Failed to extend subscription' });
  }
});

/**
 * Get all subscriptions for a user
 * GET /api/subscription/user/:phone
 */
router.get('/user/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const subscriptions = await PaymentLink.find({
      userid: user._id,
      status: 'SUCCESS'
    })
    .sort({ purchase_datetime: -1 })
    .populate('groupId');
    
    const now = new Date();
    const subscriptionsWithStatus = subscriptions.map(sub => ({
      ...sub.toObject(),
      isExpired: new Date(sub.expiry_date) <= now,
      daysRemaining: Math.max(0, Math.ceil((new Date(sub.expiry_date) - now) / (1000 * 60 * 60 * 24)))
    }));
    
    res.json(subscriptionsWithStatus);
    
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Check if user needs to be removed from channels due to expiry
 * POST /api/subscription/check-expiry
 */
router.post('/check-expiry', async (req, res) => {
  try {
    const { phone, bundleId } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let query = {
      userid: user._id,
      status: 'SUCCESS'
    };
    
    if (bundleId) {
      query.groupId = bundleId;
    }
    
    const subscription = await PaymentLink.findOne(query)
      .sort({ purchase_datetime: -1 });
    
    if (!subscription) {
      return res.json({ hasSubscription: false, shouldRemove: true });
    }
    
    const now = new Date();
    const expiryDate = new Date(subscription.expiry_date);
    const isExpired = expiryDate <= now;
    
    res.json({
      hasSubscription: true,
      isExpired,
      shouldRemove: isExpired,
      expiryDate: subscription.expiry_date,
      daysRemaining: Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)))
    });
    
  } catch (error) {
    console.error('Error checking subscription expiry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function to parse duration string into days
 */
function parseDuration(duration) {
  if (!duration) return 30;
  
  const durationStr = duration.toLowerCase();
  
  if (durationStr.includes('day')) {
    const days = parseInt(durationStr.match(/\d+/)?.[0] || '30');
    return days;
  }
  
  if (durationStr.includes('month')) {
    const months = parseInt(durationStr.match(/\d+/)?.[0] || '1');
    return months * 30;
  }
  
  if (durationStr.includes('year')) {
    const years = parseInt(durationStr.match(/\d+/)?.[0] || '1');
    return years * 365;
  }
  
  if (durationStr.includes('week')) {
    const weeks = parseInt(durationStr.match(/\d+/)?.[0] || '1');
    return weeks * 7;
  }
  i
  // Try to extract just numbers and assume days
  const numberMatch = durationStr.match(/\d+/);
  return numberMatch ? parseInt(numberMatch[0]) : 30;
}

module.exports = router;