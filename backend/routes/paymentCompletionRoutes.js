const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const InviteLink = require('../models/InviteLink');
const PaymentLink = require('../models/paymentLinkModel');
const Group = require('../models/group.model');
const { generateInviteLinksForChannelBundle } = require('../services/generateOneTimeInviteLink');
const { checkAllRequiredStepsComplete } = require('../utils/stepCompletionChecker');

// Get payment completion data with personalized invite links
// GET /api/payment-completion/{userId}/{paymentId}
// GET /api/payment-completion/{userId}  (latest payment)
router.get('/:userId/:paymentId?', async (req, res) => {
  try {
    const { userId, paymentId } = req.params;
    
    console.log(`🔍 Payment completion request for user: ${userId}, payment: ${paymentId || 'latest'}`);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find payment (specific or latest successful or pending)
    let payment;
    if (paymentId) {
      payment = await PaymentLink.findById(paymentId).populate('groupId');
    } else {
      // First try to find a successful payment, then fall back to pending
      payment = await PaymentLink.findOne({
        userid: userId,
        status: 'SUCCESS'
      }).sort({ createdAt: -1 }).populate('groupId');

      // If no successful payment found, look for pending payments
      if (!payment) {
        payment = await PaymentLink.findOne({
          userid: userId,
          status: 'PENDING'
        }).sort({ createdAt: -1 }).populate('groupId');
      }
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No successful payment found for this user',
        showPaymentOptions: true
      });
    }

    console.log(`✅ Found payment: ${payment.plan_name} for ${payment.amount} (Status: ${payment.status})`);

    // Check if payment should be marked as SUCCESS (separate from workflow completion)
    // Payment is SUCCESS when Cashfree payment is done, regardless of KYC/E-Sign status
    if (payment.status === 'PENDING') {
      console.log('💳 Payment completed via Cashfree - marking as SUCCESS');

      // Update payment status to SUCCESS (payment is done)
      payment.status = 'SUCCESS';
      await payment.save();

      console.log('✅ Payment status updated to SUCCESS');
    }

    // Check workflow completion status (separate from payment status)
    const { checkAllRequiredStepsComplete } = require('../utils/stepCompletionChecker');
    let allWorkflowStepsComplete = false;
    let workflowStatus = null;

    try {
      workflowStatus = await checkAllRequiredStepsComplete(userId, payment._id);
      allWorkflowStepsComplete = workflowStatus.allStepsComplete;

      if (allWorkflowStepsComplete) {
        console.log('🎉 All workflow steps completed! Ready for channel access.');
      } else {
        console.log(`⚠️ Workflow incomplete - missing steps: [${workflowStatus.missingSteps.join(', ')}]`);
      }
    } catch (stepCheckError) {
      console.error('❌ Error checking workflow completion:', stepCheckError.message);
      // Continue with the request even if step check fails
    }

    // Check if user has personalized invite links for this payment
    let inviteLinks = await InviteLink.find({
      userId: userId,
      $or: [
        { paymentLinkId: payment._id },
        { groupId: payment.groupId }
      ]
    }).populate('groupId');

    console.log(`📧 Found ${inviteLinks.length} existing invite links for user`);

    // Only generate invite links if ALL workflow steps are complete
    if (inviteLinks.length === 0 && payment.groupId && allWorkflowStepsComplete) {
      console.log('🚀 All workflow steps complete - generating invite links...');

      try {
        const result = await generateInviteLinksForChannelBundle(
          userId,
          payment.groupId._id,
          payment.duration || 86400, // Default 24 hours if no duration
          payment._id,
          payment.plan_id
        );

        console.log(`✅ Generated ${result.successCount} invite links`);

        // Fetch the newly generated links
        inviteLinks = await InviteLink.find({
          userId: userId,
          groupId: payment.groupId._id
        }).populate('groupId');

      } catch (genError) {
        console.error('❌ Failed to generate invite links:', genError.message);

        return res.status(500).json({
          success: false,
          message: 'Payment successful but failed to generate channel access links. Please contact support.',
          payment: {
            id: payment._id,
            planName: payment.plan_name,
            amount: payment.amount,
            status: payment.status,
            date: payment.createdAt
          },
          error: 'link_generation_failed'
        });
      }
    } else if (inviteLinks.length === 0 && !allWorkflowStepsComplete) {
      console.log('⏳ Payment successful but workflow incomplete - links will be generated when all steps are done');
    }

    // Prepare response data
    const channelAccess = [];
    
    // Group links by bundle
    const linksByBundle = {};
    inviteLinks.forEach(link => {
      const bundleId = link.groupId?._id || 'default';
      if (!linksByBundle[bundleId]) {
        linksByBundle[bundleId] = {
          bundleInfo: link.groupId || { name: 'Default Channel' },
          channels: []
        };
      }
      
      linksByBundle[bundleId].channels.push({
        channelTitle: link.channelTitle,
        channelId: link.channelId,
        inviteLink: link.link,
        isUsed: link.is_used,
        usedAt: link.used_at,
        createdAt: link.createdAt,
        linkId: link._id
      });
    });

    // Convert to array format
    Object.keys(linksByBundle).forEach(bundleId => {
      channelAccess.push(linksByBundle[bundleId]);
    });

    // Calculate expiry information
    const currentDate = new Date();
    const expiryDate = new Date(payment.expiry_date);
    const daysRemaining = Math.max(0, Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24)));
    const isExpired = currentDate > expiryDate;

    const response = {
      success: true,
      message: allWorkflowStepsComplete ?
        'Payment completed successfully! All steps complete.' :
        'Payment completed successfully! Please complete remaining steps for channel access.',
      user: {
        id: user._id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        phone: user.phone
      },
      payment: {
        id: payment._id,
        planName: payment.plan_name,
        amount: payment.amount,
        currency: 'INR',
        status: payment.status,
        paymentDate: payment.createdAt,
        expiryDate: payment.expiry_date,
        daysRemaining: daysRemaining,
        isExpired: isExpired,
        duration: payment.duration
      },
      workflow: {
        allStepsComplete: allWorkflowStepsComplete,
        missingSteps: workflowStatus?.missingSteps || [],
        requiresKYC: workflowStatus?.bundleConfig?.kycRequired || false,
        requiresESign: workflowStatus?.bundleConfig?.esignRequired || false,
        kycCompleted: workflowStatus?.user?.kycCompleted || false,
        esignCompleted: workflowStatus?.user?.esignCompleted || false
      },
      channelAccess: channelAccess,
      totalLinks: inviteLinks.length,
      unusedLinks: inviteLinks.filter(link => !link.is_used).length,
      instructions: {
        title: "How to Join Your Channels",
        steps: [
          "Click on the invite link below for each channel",
          "Telegram will ask to \"Request to Join\"",
          "Our bot will automatically approve your request",
          "You'll be added to the channel immediately",
          "Each link can only be used once for security"
        ]
      },
      importantNotes: [
        `Your subscription expires on ${expiryDate.toDateString()}`,
        "Each invite link can only be used once",
        "Don't share your links with others",
        `You have ${daysRemaining} days remaining in your subscription`,
        "Contact support if you face any issues"
      ]
    };

    console.log(`✅ Returning ${channelAccess.length} channel bundles with ${inviteLinks.length} total links`);

    res.json(response);

  } catch (error) {
    console.error('❌ Error in payment completion:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payment completion data',
      error: error.message
    });
  }
});

// Mark payment as complete when all steps are done
// POST /api/payment-completion/{userId}/mark-complete
router.post('/:userId/mark-complete', async (req, res) => {
  try {
    const { userId } = req.params;
    const { paymentId } = req.body;

    console.log(`🎯 Marking payment as complete for user: ${userId}, payment: ${paymentId || 'latest'}`);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find payment
    let payment;
    if (paymentId) {
      payment = await PaymentLink.findById(paymentId);
    } else {
      payment = await PaymentLink.findOne({
        userid: userId,
        status: 'PENDING'
      }).sort({ createdAt: -1 });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No pending payment found for this user'
      });
    }

    // Mark payment as SUCCESS regardless of workflow steps (payment is separate from workflow)
    if (payment.status === 'PENDING') {
      console.log('💳 Marking payment as SUCCESS (payment completed)');

      // Update payment status to SUCCESS
      payment.status = 'SUCCESS';
      await payment.save();

      console.log('✅ Payment status updated to SUCCESS');
    }

    // Check workflow completion status (separate from payment)
    try {
      const stepStatus = await checkAllRequiredStepsComplete(userId, payment._id);

      return res.json({
        success: true,
        message: stepStatus.allStepsComplete ?
          'Payment successful! All workflow steps completed.' :
          'Payment successful! Please complete remaining workflow steps for channel access.',
        payment: {
          id: payment._id,
          status: payment.status,
          planName: payment.plan_name,
          amount: payment.amount
        },
        workflow: {
          allStepsComplete: stepStatus.allStepsComplete,
          missingSteps: stepStatus.missingSteps,
          requiresKYC: stepStatus.bundleConfig?.kycRequired || false,
          requiresESign: stepStatus.bundleConfig?.esignRequired || false,
          completedSteps: {
            payment: true,
            kyc: stepStatus.user.kycCompleted || false,
            esign: stepStatus.user.esignCompleted || false
          }
        }
      });
    } catch (stepCheckError) {
      console.error('❌ Error checking step completion:', stepCheckError.message);
      return res.status(500).json({
        success: false,
        message: 'Error checking step completion',
        error: stepCheckError.message
      });
    }

  } catch (error) {
    console.error('❌ Error marking payment as complete:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking payment as complete',
      error: error.message
    });
  }
});

// Regenerate invite links for a specific user/payment
// POST /api/payment-completion/{userId}/regenerate
router.post('/:userId/regenerate', async (req, res) => {
  try {
    const { userId } = req.params;
    const { paymentId, reason } = req.body;

    console.log(`🔄 Regenerating links for user: ${userId}, reason: ${reason || 'manual'}`);

    // Find the payment
    let payment;
    if (paymentId) {
      payment = await PaymentLink.findById(paymentId).populate('groupId');
    } else {
      payment = await PaymentLink.findOne({
        userid: userId,
        status: 'SUCCESS'
      }).sort({ createdAt: -1 }).populate('groupId');
    }

    if (!payment || !payment.groupId) {
      return res.status(404).json({
        success: false,
        message: 'Payment or channel bundle not found'
      });
    }

    // Mark existing links as revoked (don't delete for audit)
    await InviteLink.updateMany(
      { 
        userId: userId,
        groupId: payment.groupId._id,
        is_used: false
      },
      { 
        is_used: true,
        used_at: new Date(),
        used_by: 'system_revoked',
        revokeReason: reason || 'regeneration_requested'
      }
    );

    // Generate new links
    const result = await generateInviteLinksForChannelBundle(
      userId,
      payment.groupId._id,
      payment.duration || 86400,
      payment._id,
      payment.plan_id
    );

    console.log(`✅ Regenerated ${result.successCount} new invite links`);

    // Return new links
    const newLinks = await InviteLink.find({
      userId: userId,
      groupId: payment.groupId._id,
      is_used: false
    }).populate('groupId');

    res.json({
      success: true,
      message: `Successfully regenerated ${result.successCount} invite links`,
      regenerated: result.successCount,
      errors: result.errorCount,
      newLinks: newLinks.map(link => ({
        channelTitle: link.channelTitle,
        inviteLink: link.link,
        createdAt: link.createdAt
      })),
      details: result
    });

  } catch (error) {
    console.error('❌ Error regenerating links:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate invite links',
      error: error.message
    });
  }
});

// Get user's subscription status and access summary
// GET /api/payment-completion/{userId}/status
router.get('/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user with their active payments
    const activePayments = await PaymentLink.find({
      userid: userId,
      status: 'SUCCESS',
      expiry_date: { $gte: new Date() }
    }).populate('groupId');

    const expiredPayments = await PaymentLink.find({
      userid: userId,
      status: 'SUCCESS',
      expiry_date: { $lt: new Date() }
    }).populate('groupId').sort({ expiry_date: -1 }).limit(5);

    // Get invite links for active payments
    const inviteLinks = await InviteLink.find({
      userId: userId,
      groupId: { $in: activePayments.map(p => p.groupId?._id).filter(Boolean) }
    });

    const subscriptionStatus = {
      activeSubscriptions: activePayments.length,
      expiredSubscriptions: expiredPayments.length,
      totalInviteLinks: inviteLinks.length,
      unusedLinks: inviteLinks.filter(link => !link.is_used).length,
      usedLinks: inviteLinks.filter(link => link.is_used).length,
      subscriptions: activePayments.map(payment => {
        const userLinks = inviteLinks.filter(link => 
          link.groupId?.toString() === payment.groupId?._id?.toString()
        );
        
        return {
          paymentId: payment._id,
          planName: payment.plan_name,
          bundleName: payment.groupId?.name || 'Unknown Bundle',
          expiryDate: payment.expiry_date,
          daysRemaining: Math.max(0, Math.ceil((new Date(payment.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))),
          channelCount: userLinks.length,
          unusedLinks: userLinks.filter(link => !link.is_used).length
        };
      })
    };

    res.json({
      success: true,
      userId: userId,
      status: subscriptionStatus,
      hasActiveSubscription: activePayments.length > 0,
      needsPayment: activePayments.length === 0
    });

  } catch (error) {
    console.error('❌ Error getting user status:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user subscription status',
      error: error.message
    });
  }
});

// TEST ENDPOINT: Generate invite links for a user and channel bundle (for testing)
// POST /api/payment-completion/test-generate
router.post('/test-generate', async (req, res) => {
  try {
    const { phoneNumber, channelBundleId } = req.body;
    
    console.log(`🧪 TEST: Generating invite links for phone: ${phoneNumber}, bundle: ${channelBundleId}`);
    
    if (!phoneNumber || !channelBundleId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and channel bundle ID are required',
        required: {
          phoneNumber: 'User phone number (e.g., +919624165190)',
          channelBundleId: 'Channel bundle ObjectId (e.g., 675a0e7d67c8cc4a6c6d2f23)'
        }
      });
    }
    
    // Find user by phone number
    const user = await User.findOne({ phone: phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with phone ${phoneNumber} not found`,
        hint: 'Make sure the user exists in the database'
      });
    }
    
    // Find channel bundle
    const channelBundle = await Group.findById(channelBundleId);
    if (!channelBundle) {
      return res.status(404).json({
        success: false,
        message: `Channel bundle with ID ${channelBundleId} not found`,
        hint: 'Make sure the channel bundle exists in the database'
      });
    }
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.phone})`);
    console.log(`✅ Found channel bundle: ${channelBundle.name}`);
    
    // Generate invite links (default 24 hour duration for test)
    const testDuration = 24 * 60 * 60; // 24 hours in seconds
    const testPaymentId = null; // No specific payment for test
    const testPlanId = 'test-plan';
    
    const result = await generateInviteLinksForChannelBundle(
      user._id,
      channelBundleId,
      testDuration,
      testPaymentId,
      testPlanId
    );
    
    console.log(`🎉 Generated ${result.successCount} test invite links`);
    
    // Fetch the generated links for response
    const generatedLinks = await InviteLink.find({
      userId: user._id,
      groupId: channelBundleId
    }).populate('groupId').sort({ createdAt: -1 }).limit(result.successCount);
    
    const response = {
      success: true,
      message: `Successfully generated ${result.successCount} test invite links`,
      test: true,
      user: {
        id: user._id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        phone: user.phone
      },
      channelBundle: {
        id: channelBundle._id,
        name: channelBundle.name,
        channelCount: channelBundle.channels?.length || 0
      },
      generation: {
        requested: channelBundle.channels?.length || 0,
        successful: result.successCount,
        failed: result.errorCount,
        duration: testDuration + ' seconds (24 hours)'
      },
      inviteLinks: generatedLinks.map(link => ({
        id: link._id,
        channelTitle: link.channelTitle,
        channelId: link.channelId,
        inviteLink: link.link,
        createdAt: link.createdAt,
        isUsed: link.is_used
      })),
      errors: result.errors || [],
      totalLinksForUser: await InviteLink.countDocuments({ userId: user._id })
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ TEST ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;