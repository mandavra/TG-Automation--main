const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const injectAdminContext = require('../middlewares/injectAdminContext');
const User = require('../models/user.model');
const InviteLink = require('../models/InviteLink');
const PaymentLink = require('../models/paymentLinkModel');
const Group = require('../models/group.model');
const { generateInviteLinksForChannelBundle } = require('../services/generateOneTimeInviteLink');

// Get dashboard overview of all users and their link status
// GET /api/admin/link-management/dashboard
router.get('/dashboard', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { adminId } = req.admin;

    // Get summary statistics
    const totalPayments = await PaymentLink.countDocuments({ 
      adminId: adminId,
      status: 'SUCCESS' 
    });

    const activePayments = await PaymentLink.countDocuments({ 
      adminId: adminId,
      status: 'SUCCESS',
      expiry_date: { $gte: new Date() }
    });

    const totalLinks = await InviteLink.countDocuments({ adminId: adminId });
    const unusedLinks = await InviteLink.countDocuments({ 
      adminId: adminId,
      is_used: false 
    });
    
    const usersNeedingLinks = await PaymentLink.aggregate([
      {
        $match: {
          adminId: adminId,
          status: 'SUCCESS',
          expiry_date: { $gte: new Date() }
        }
      },
      {
        $lookup: {
          from: 'invitelinks',
          localField: '_id',
          foreignField: 'paymentLinkId',
          as: 'inviteLinks'
        }
      },
      {
        $match: {
          inviteLinks: { $size: 0 }
        }
      },
      {
        $group: {
          _id: '$userid',
          paymentCount: { $sum: 1 },
          latestPayment: { $max: '$createdAt' }
        }
      }
    ]);

    const recentActivity = await InviteLink.find({ adminId: adminId })
      .populate('userId', 'firstName lastName email phone')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      dashboard: {
        statistics: {
          totalSuccessfulPayments: totalPayments,
          activeSubscriptions: activePayments,
          totalInviteLinks: totalLinks,
          unusedLinks: unusedLinks,
          usedLinks: totalLinks - unusedLinks,
          usersNeedingLinks: usersNeedingLinks.length
        },
        usersNeedingLinks: usersNeedingLinks,
        recentActivity: recentActivity.map(link => ({
          userId: link.userId?._id,
          userName: `${link.userId?.firstName || ''} ${link.userId?.lastName || ''}`.trim(),
          userEmail: link.userId?.email,
          channelTitle: link.channelTitle,
          bundleName: link.groupId?.name,
          isUsed: link.is_used,
          createdAt: link.createdAt,
          usedAt: link.used_at
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error getting admin dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading admin dashboard',
      error: error.message
    });
  }
});

// Get all users who completed payment but missing invite links
// GET /api/admin/link-management/users-missing-links
router.get('/users-missing-links', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { adminId } = req.admin;
    const { page = 1, limit = 20 } = req.query;

    // Find payments without corresponding invite links
    const paymentsNeedingLinks = await PaymentLink.aggregate([
      {
        $match: {
          adminId: adminId,
          status: 'SUCCESS',
          expiry_date: { $gte: new Date() }
        }
      },
      {
        $lookup: {
          from: 'invitelinks',
          let: { paymentId: '$_id', userId: '$userid', groupId: '$groupId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$paymentLinkId', '$$paymentId'] },
                    { 
                      $and: [
                        { $eq: ['$userId', '$$userId'] },
                        { $eq: ['$groupId', '$$groupId'] }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: 'inviteLinks'
        }
      },
      {
        $match: {
          inviteLinks: { $size: 0 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userid',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'groups',
          localField: 'groupId',
          foreignField: '_id',
          as: 'group'
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    const totalCount = await PaymentLink.aggregate([
      {
        $match: {
          adminId: adminId,
          status: 'SUCCESS',
          expiry_date: { $gte: new Date() }
        }
      },
      {
        $lookup: {
          from: 'invitelinks',
          let: { paymentId: '$_id', userId: '$userid', groupId: '$groupId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$paymentLinkId', '$$paymentId'] },
                    { 
                      $and: [
                        { $eq: ['$userId', '$$userId'] },
                        { $eq: ['$groupId', '$$groupId'] }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: 'inviteLinks'
        }
      },
      {
        $match: {
          inviteLinks: { $size: 0 }
        }
      },
      {
        $count: "total"
      }
    ]);

    const result = paymentsNeedingLinks.map(payment => ({
      paymentId: payment._id,
      userId: payment.userid,
      user: {
        name: `${payment.user[0]?.firstName || ''} ${payment.user[0]?.lastName || ''}`.trim(),
        email: payment.user[0]?.email,
        phone: payment.user[0]?.phone
      },
      payment: {
        planName: payment.plan_name,
        amount: payment.amount,
        paymentDate: payment.createdAt,
        expiryDate: payment.expiry_date,
        daysRemaining: Math.max(0, Math.ceil((new Date(payment.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)))
      },
      bundle: {
        id: payment.groupId,
        name: payment.group[0]?.name || 'Unknown Bundle'
      }
    }));

    res.json({
      success: true,
      users: result,
      pagination: {
        currentPage: parseInt(page),
        totalUsers: totalCount[0]?.total || 0,
        totalPages: Math.ceil((totalCount[0]?.total || 0) / limit),
        hasMore: (page * limit) < (totalCount[0]?.total || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error getting users missing links:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading users missing links',
      error: error.message
    });
  }
});

// Generate missing invite links for specific user
// POST /api/admin/link-management/generate-user-links/{userId}
router.post('/generate-user-links/:userId', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { adminId } = req.admin;
    const { userId } = req.params;
    const { paymentId, forceRegenerate = false } = req.body;

    console.log(`🔧 Admin generating links for user: ${userId}`);

    // Find the user's payments
    let payments;
    if (paymentId) {
      payments = await PaymentLink.find({ 
        _id: paymentId,
        userid: userId,
        adminId: adminId,
        status: 'SUCCESS'
      }).populate('groupId');
    } else {
      payments = await PaymentLink.find({ 
        userid: userId,
        adminId: adminId,
        status: 'SUCCESS',
        expiry_date: { $gte: new Date() }
      }).populate('groupId');
    }

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active payments found for this user'
      });
    }

    const results = [];
    let totalGenerated = 0;
    let totalErrors = 0;

    for (const payment of payments) {
      if (!payment.groupId) {
        results.push({
          paymentId: payment._id,
          planName: payment.plan_name,
          error: 'No channel bundle associated with this payment'
        });
        totalErrors++;
        continue;
      }

      // Check if links already exist
      const existingLinks = await InviteLink.find({
        userId: userId,
        $or: [
          { paymentLinkId: payment._id },
          { groupId: payment.groupId._id }
        ]
      });

      if (existingLinks.length > 0 && !forceRegenerate) {
        results.push({
          paymentId: payment._id,
          planName: payment.plan_name,
          bundleName: payment.groupId.name,
          status: 'skipped',
          message: `User already has ${existingLinks.length} invite links for this bundle`,
          existingLinks: existingLinks.filter(link => !link.is_used).length
        });
        continue;
      }

      // If force regenerate, mark old links as revoked
      if (forceRegenerate && existingLinks.length > 0) {
        await InviteLink.updateMany(
          { 
            userId: userId,
            groupId: payment.groupId._id,
            is_used: false
          },
          { 
            is_used: true,
            used_at: new Date(),
            used_by: 'admin_revoked',
            revokeReason: 'admin_force_regenerate'
          }
        );
      }

      try {
        // Generate invite links
        const result = await generateInviteLinksForChannelBundle(
          userId,
          payment.groupId._id,
          payment.duration || 86400,
          payment._id,
          payment.plan_id
        );

        results.push({
          paymentId: payment._id,
          planName: payment.plan_name,
          bundleName: payment.groupId.name,
          status: 'success',
          generated: result.successCount,
          errors: result.errorCount,
          links: result.generatedLinks
        });

        totalGenerated += result.successCount;
        totalErrors += result.errorCount;

      } catch (genError) {
        results.push({
          paymentId: payment._id,
          planName: payment.plan_name,
          bundleName: payment.groupId.name,
          status: 'error',
          error: genError.message
        });
        totalErrors++;
      }
    }

    console.log(`✅ Admin link generation completed: ${totalGenerated} generated, ${totalErrors} errors`);

    res.json({
      success: true,
      message: `Generated ${totalGenerated} invite links for user`,
      userId: userId,
      totalGenerated: totalGenerated,
      totalErrors: totalErrors,
      results: results
    });

  } catch (error) {
    console.error('❌ Error in admin link generation:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating user invite links',
      error: error.message
    });
  }
});

// Bulk generate missing links for all users who need them
// POST /api/admin/link-management/bulk-generate-missing-links
router.post('/bulk-generate-missing-links', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { adminId } = req.admin;
    const { limit = 50, dryRun = false } = req.body;

    console.log(`🚀 Starting bulk link generation (dryRun: ${dryRun}, limit: ${limit})`);

    // Find payments without corresponding invite links
    const paymentsNeedingLinks = await PaymentLink.aggregate([
      {
        $match: {
          adminId: adminId,
          status: 'SUCCESS',
          expiry_date: { $gte: new Date() }
        }
      },
      {
        $lookup: {
          from: 'invitelinks',
          let: { paymentId: '$_id', userId: '$userid', groupId: '$groupId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$paymentLinkId', '$$paymentId'] },
                    { 
                      $and: [
                        { $eq: ['$userId', '$$userId'] },
                        { $eq: ['$groupId', '$$groupId'] }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: 'inviteLinks'
        }
      },
      {
        $match: {
          inviteLinks: { $size: 0 }
        }
      },
      {
        $lookup: {
          from: 'groups',
          localField: 'groupId',
          foreignField: '_id',
          as: 'group'
        }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    console.log(`📊 Found ${paymentsNeedingLinks.length} payments needing invite links`);

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        message: `Would generate invite links for ${paymentsNeedingLinks.length} payments`,
        paymentsNeedingLinks: paymentsNeedingLinks.map(payment => ({
          paymentId: payment._id,
          userId: payment.userid,
          planName: payment.plan_name,
          bundleName: payment.group[0]?.name
        }))
      });
    }

    const results = [];
    let totalGenerated = 0;
    let totalErrors = 0;

    for (const payment of paymentsNeedingLinks) {
      if (!payment.groupId) {
        results.push({
          paymentId: payment._id,
          userId: payment.userid,
          error: 'No channel bundle associated'
        });
        totalErrors++;
        continue;
      }

      try {
        const result = await generateInviteLinksForChannelBundle(
          payment.userid,
          payment.groupId,
          payment.duration || 86400,
          payment._id,
          payment.plan_id
        );

        results.push({
          paymentId: payment._id,
          userId: payment.userid,
          planName: payment.plan_name,
          bundleName: payment.group[0]?.name,
          generated: result.successCount,
          errors: result.errorCount
        });

        totalGenerated += result.successCount;
        totalErrors += result.errorCount;

        // Small delay to prevent overwhelming the Telegram API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (genError) {
        console.error(`❌ Failed to generate links for payment ${payment._id}:`, genError.message);
        results.push({
          paymentId: payment._id,
          userId: payment.userid,
          error: genError.message
        });
        totalErrors++;
      }
    }

    console.log(`✅ Bulk generation completed: ${totalGenerated} links generated, ${totalErrors} errors`);

    res.json({
      success: true,
      message: `Bulk generation completed: ${totalGenerated} links generated`,
      totalProcessed: paymentsNeedingLinks.length,
      totalGenerated: totalGenerated,
      totalErrors: totalErrors,
      results: results
    });

  } catch (error) {
    console.error('❌ Error in bulk link generation:', error);
    res.status(500).json({
      success: false,
      message: 'Error in bulk link generation',
      error: error.message
    });
  }
});

// Get detailed user link status
// GET /api/admin/link-management/user/{userId}/details
router.get('/user/:userId/details', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { adminId } = req.admin;
    const { userId } = req.params;

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's payments for this admin
    const payments = await PaymentLink.find({ 
      userid: userId,
      adminId: adminId 
    }).populate('groupId').sort({ createdAt: -1 });

    // Get user's invite links for this admin
    const inviteLinks = await InviteLink.find({ 
      userId: userId,
      adminId: adminId 
    }).populate('groupId').sort({ createdAt: -1 });

    // Organize data
    const paymentSummary = payments.map(payment => {
      const relatedLinks = inviteLinks.filter(link => 
        link.paymentLinkId?.toString() === payment._id.toString() ||
        link.groupId?._id?.toString() === payment.groupId?._id?.toString()
      );

      return {
        paymentId: payment._id,
        planName: payment.plan_name,
        amount: payment.amount,
        status: payment.status,
        paymentDate: payment.createdAt,
        expiryDate: payment.expiry_date,
        isExpired: new Date() > new Date(payment.expiry_date),
        bundle: {
          id: payment.groupId?._id,
          name: payment.groupId?.name
        },
        inviteLinks: {
          total: relatedLinks.length,
          unused: relatedLinks.filter(link => !link.is_used).length,
          used: relatedLinks.filter(link => link.is_used).length,
          links: relatedLinks.map(link => ({
            id: link._id,
            channelTitle: link.channelTitle,
            inviteLink: link.link,
            isUsed: link.is_used,
            usedAt: link.used_at,
            createdAt: link.createdAt
          }))
        }
      };
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt
      },
      summary: {
        totalPayments: payments.length,
        successfulPayments: payments.filter(p => p.status === 'SUCCESS').length,
        activeSubscriptions: payments.filter(p => p.status === 'SUCCESS' && new Date() < new Date(p.expiry_date)).length,
        totalInviteLinks: inviteLinks.length,
        unusedLinks: inviteLinks.filter(link => !link.is_used).length
      },
      payments: paymentSummary
    });

  } catch (error) {
    console.error('❌ Error getting user details:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading user details',
      error: error.message
    });
  }
});

module.exports = router;
