const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const PaymentLink = require('../models/paymentLinkModel');
const InviteLink = require('../models/InviteLink');
const Group = require('../models/group.model');
const DigioDocument = require('../models/DigioDocument');

// Verify user step completion status
router.get('/verify-steps/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    console.log(`🔍 Verifying steps for phone: ${phone}`);

    // Normalize phone and find user by multiple formats for robustness
    const normalizedPhone = decodeURIComponent(phone);
    const strippedPhone = normalizedPhone.replace(/^\+/,'');
    const altWithPlus = strippedPhone.startsWith('91') ? `+${strippedPhone}` : `+${strippedPhone}`;

    // Find user by exact, without plus, or with plus formats
    const user = await User.findOne({
      $or: [
        { phone: normalizedPhone },
        { phone: strippedPhone },
        { phone: altWithPlus }
      ]
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        steps: {
          registration: false,
          payment: false,
          kyc: false,
          esign: false
        }
      });
    }

    // Check latest successful, active payment tied to this user
    const successfulPayment = await PaymentLink.findOne({
      userid: user._id,
      status: 'SUCCESS'
    }).sort({ purchase_datetime: -1 });

    // Determine if payment is still active (not expired)
    const isPaymentActive = !!(successfulPayment && (!successfulPayment.expiry_date || new Date(successfulPayment.expiry_date) > new Date()));

    // Check if user has valid invite links (indicating successful payment processing)
    const validInviteLinks = await InviteLink.find({
      userId: user._id,
      is_used: false
    });

    // Get bundle configuration to check which steps are required
    let bundleConfig = null;
    if (successfulPayment?.groupId) {
      bundleConfig = await Group.findById(successfulPayment.groupId);
    }

    // Determine step completion based on bundle configuration and actual user flags
    let kycRequired = bundleConfig?.featureToggles?.enableKYC !== false;
    let esignRequired = bundleConfig?.featureToggles?.enableESign !== false;

    // Special case: Trial plan should not require KYC/E-Sign
    if (bundleConfig?.customRoute === 'trialplan' || /trial/i.test(bundleConfig?.name || '')) {
      kycRequired = false;
      esignRequired = false;
    }

    // Also consider Digio document states for KYC/E-Sign completion
    // If user has completed KYC or E-Sign via Digio, respect that even if user flags aren't set
    let kycDoc = null;
    // let esignDoc = null;
    try {
      kycDoc = await DigioDocument.findOne({
        userId: user._id,
        documentType: 'kyc_document',
        status: { $in: ['signed', 'completed'] }
      });
    } catch {}
   
    let steps = {
      registration: true, // user exists
      payment: isPaymentActive,
      kyc: kycRequired ? (!!user.kycCompleted || !!kycDoc) : true,
      esign: true, // Always true by default
      hasValidLinks: validInviteLinks.length > 0
    };

    // If user already has valid invite links, consider KYC/ESign satisfied for access
    if (steps.hasValidLinks) {
      steps.kyc = true;
      steps.esign = true;
    }

    // If user has already joined telegram channel, consider KYC/E-Sign satisfied
    // This prevents KYC/E-Sign from flipping back to false after links are consumed
    if (user && (user.telegramJoinStatus === true || user.telegramJoinStatus === 'joined' || user.telegramJoinStatus === 'approved' || user.telegramJoinStatus === 'subscribed')) {
      steps.kyc = true;
      steps.esign = true;
    }

    // User information for frontend
    const userInfo = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      telegramUserId: user.telegramUserId,
      telegramJoinStatus: user.telegramJoinStatus
    };

    let paymentInfo = null;
    if (successfulPayment) {
      paymentInfo = {
        id: successfulPayment._id,
        planName: successfulPayment.plan_name,
        amount: successfulPayment.amount,
        paymentDate: successfulPayment.purchase_datetime,
        expiryDate: successfulPayment.expiry_date,
        duration: successfulPayment.duration
      };
    }

    console.log(`✅ Step verification completed for ${phone}:`, steps);

    res.json({
      success: true,
      user: userInfo,
      payment: paymentInfo,
      steps,
      bundleConfig: bundleConfig ? {
        kycRequired,
        esignRequired,
        enableKYC: bundleConfig.featureToggles?.enableKYC,
        enableESign: bundleConfig.featureToggles?.enableESign
      } : null,
      message: steps.payment ? 
        (steps.kyc && steps.esign ? (steps.hasValidLinks ? 'All steps completed successfully' : 'All steps done. Generating links...') : 'Please complete pending steps') :
        'Please complete payment to proceed',
      allStepsCompleted: steps.registration && steps.payment && steps.kyc && steps.esign
    });

  } catch (error) {
    console.error('❌ Error verifying steps:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying step completion',
      error: error.message
    });
  }
});

// Get user's valid invite links after payment completion
router.get('/invite-links/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const normalizedPhone = decodeURIComponent(phone);
    const strippedPhone = normalizedPhone.replace(/^\+/, '');
    const altWithPlus = strippedPhone.startsWith('91') ? `+${strippedPhone}` : `+${strippedPhone}`;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    console.log(`🔗 Fetching invite links for phone: ${phone}`);

    // Find user by multiple formats
    const user = await User.findOne({
      $or: [
        { phone: normalizedPhone },
        { phone: strippedPhone },
        { phone: altWithPlus }
      ]
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has completed payment (latest successful by userId)
    const successfulPayment = await PaymentLink.findOne({
      userid: user._id,
      status: 'SUCCESS'
    }).sort({ purchase_datetime: -1 });

    if (!successfulPayment) {
      return res.status(400).json({
        success: false,
        message: 'No successful payment found. Please complete payment first.',
        requiresPayment: true
      });
    }

    // Get user's invite links
    const inviteLinks = await InviteLink.find({
      userId: user._id,
      is_used: false
    }).populate('groupId');

    if (inviteLinks.length === 0) {
      // If no links exist, trigger generation
      console.log('📋 No invite links found, checking for automatic generation...');
      
      // Check if payment has associated group/bundle
      if (successfulPayment.groupId) {
        const { generateInviteLinksForChannelBundle } = require('../services/generateOneTimeInviteLink');
        
        try {
          await generateInviteLinksForChannelBundle(
            user._id,
            successfulPayment.groupId,
            successfulPayment.duration || 86400,
            successfulPayment._id,
            successfulPayment.plan_id
          );
          
          // Fetch the newly generated links
          const newLinks = await InviteLink.find({
            userId: user._id,
            is_used: false
          }).populate('groupId');
          
          return res.json({
            success: true,
            message: 'Invite links generated successfully',
            links: newLinks.map(link => ({
              id: link._id,
              channelTitle: link.channelTitle,
              channelId: link.channelId,
              inviteLink: link.link,
              createdAt: link.createdAt,
              groupName: link.groupId?.name || 'Default Group'
            })),
            totalLinks: newLinks.length
          });
          
        } catch (genError) {
          console.error('❌ Error generating invite links:', genError);
          return res.status(500).json({
            success: false,
            message: 'Payment successful but failed to generate channel links. Please contact support.',
            error: 'link_generation_failed'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Payment completed but no channel bundle associated. Please contact support.',
          error: 'no_bundle_associated'
        });
      }
    }

    // Return existing links
    const formattedLinks = inviteLinks.map(link => ({
      id: link._id,
      channelTitle: link.channelTitle,
      channelId: link.channelId,
      inviteLink: link.link,
      createdAt: link.createdAt,
      groupName: link.groupId?.name || 'Default Group'
    }));

    console.log(`✅ Returning ${formattedLinks.length} invite links for user ${phone}`);

    res.json({
      success: true,
      message: 'Invite links retrieved successfully',
      links: formattedLinks,
      totalLinks: formattedLinks.length,
      paymentInfo: {
        planName: successfulPayment.plan_name,
        amount: successfulPayment.amount,
        expiryDate: successfulPayment.expiry_date
      }
    });

  } catch (error) {
    console.error('❌ Error fetching invite links:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving invite links',
      error: error.message
    });
  }
});

// Force regenerate invite links (admin/support use)
router.post('/regenerate-links/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { reason } = req.body;
    
    const normalizedPhone = decodeURIComponent(phone);
    const strippedPhone = normalizedPhone.replace(/^\+/, '');
    const altWithPlus = strippedPhone.startsWith('91') ? `+${strippedPhone}` : `+${strippedPhone}`;

    console.log(`🔄 Regenerating invite links for phone: ${normalizedPhone}, reason: ${reason || 'manual'}`);

    // Find user by phone
    const user = await User.findOne({
      $or: [
        { phone: normalizedPhone },
        { phone: strippedPhone },
        { phone: altWithPlus }
      ]
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find successful payment
    const successfulPayment = await PaymentLink.findOne({
      userid: user._id,
      status: 'SUCCESS'
    }).sort({ purchase_datetime: -1 });

    if (!successfulPayment || !successfulPayment.groupId) {
      return res.status(400).json({
        success: false,
        message: 'No valid payment or bundle found for link regeneration'
      });
    }

    // Mark existing links as used/revoked
    await InviteLink.updateMany(
      { 
        userId: user._id,
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
    const { generateInviteLinksForChannelBundle } = require('../services/generateOneTimeInviteLink');
    
    const result = await generateInviteLinksForChannelBundle(
      user._id,
      successfulPayment.groupId,
      successfulPayment.duration || 86400,
      successfulPayment._id,
      successfulPayment.plan_id
    );

    // Fetch the new links
    const newLinks = await InviteLink.find({
      userId: user._id,
      is_used: false
    }).populate('groupId');

    console.log(`✅ Regenerated ${newLinks.length} invite links for user ${phone}`);

    res.json({
      success: true,
      message: `Successfully regenerated ${newLinks.length} invite links`,
      links: newLinks.map(link => ({
        id: link._id,
        channelTitle: link.channelTitle,
        channelId: link.channelId,
        inviteLink: link.link,
        createdAt: link.createdAt,
        groupName: link.groupId?.name || 'Default Group'
      })),
      totalLinks: newLinks.length,
      regenerationDetails: result
    });

  } catch (error) {
    console.error('❌ Error regenerating invite links:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate invite links',
      error: error.message
    });
  }
});

// Get all active bundles for a user by phone
router.get('/all-bundles/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    console.log(`📦 Fetching all bundles for phone: ${phone}`);
    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    // Find all successful payments for this user
    const payments = await PaymentLink.find({
      phone,
      status: 'SUCCESS'
    }).sort({ purchase_datetime: -1 });
    // Get all unique groupIds (bundles)
    const groupIds = [...new Set(payments.map(p => p.groupId?.toString()).filter(Boolean))];
    // Fetch bundle info
    const bundles = await Group.find({ _id: { $in: groupIds } });
    // Map bundle info with payment status
    const bundleList = groupIds.map(gid => {
      const bundle = bundles.find(b => b._id.toString() === gid);
      const payment = payments.find(p => p.groupId?.toString() === gid);
      return {
        groupId: gid,
        bundleName: bundle?.name || 'Unknown',
        customRoute: bundle?.customRoute || null,
        isActive: payment ? (!payment.expiry_date || new Date(payment.expiry_date) > new Date()) : false,
        expiryDate: payment?.expiry_date,
        paymentId: payment?._id,
        planName: payment?.plan_name,
        purchaseDate: payment?.purchase_datetime
      };
    });
    console.log(`✅ Found ${bundleList.length} bundles for user ${phone}`);
    res.json({
      success: true,
      bundles: bundleList
    });
  } catch (error) {
    console.error('❌ Error fetching all bundles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bundles',
      error: error.message
    });
  }
});

module.exports = router;
