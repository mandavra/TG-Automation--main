const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const requireRole = require('../middlewares/roleMiddleware');
const injectAdminContext = require('../middlewares/injectAdminContext');
const DigioDocument = require('../models/DigioDocument');
const User = require('../models/user.model');
const PaymentLink = require('../models/paymentLinkModel');
const fs = require('fs');
const path = require('path');

// Apply admin authentication and tenant isolation to all routes
router.use(adminAuth);
router.use(requireRole('admin'));
router.use(injectAdminContext);

// Admin: Get all e-signed documents with filtering and pagination
router.get('/admin', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, documentType, dateRange } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query with admin filtering - tenant isolation
    let query = {};
    
    // Apply tenant filtering - superadmin sees all, regular admin sees only their own
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    if (!isSuper) {
      query.adminId = adminId;
    }
    
    // Search by document ID, file name, or user details
    if (search) {
      // Get users matching search criteria first - handle superadmin access
      const userQuery = isSuper ? {} : { adminId };
      const matchingUsers = await User.find({
        ...userQuery,
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const userIds = matchingUsers.map(u => u._id);
      
      query.$or = [
        { userId: { $in: userIds } },
        { documentId: { $regex: search, $options: 'i' } },
        { fileName: { $regex: search, $options: 'i' } },
        { originalFileName: { $regex: search, $options: 'i' } },
        { 'signerData.email': { $regex: search, $options: 'i' } },
        { 'signerData.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Document status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Document type filter
    if (documentType && documentType !== 'all') {
      query.documentType = documentType;
    }

    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }
      
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Get documents with pagination and populate user data
    const documents = await DigioDocument.find(query)
      .populate('userId', 'firstName lastName email phone telegramJoinStatus')
      .populate('paymentLinkId', 'amount plan_name status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Process documents data
    const processedDocuments = documents.map(doc => ({
      ...doc,
      userName: doc.userId ? 
        `${doc.userId.firstName || ''} ${doc.userId.lastName || ''}`.trim() : 
        doc.signerData?.name || 'N/A',
      userEmail: doc.userId?.email || doc.signerData?.email || 'N/A',
      userPhone: doc.userId?.phone || doc.signerData?.phone || 'N/A',
      isExpired: doc.expiresAt ? new Date() > new Date(doc.expiresAt) : false,
      canDownload: ['signed', 'completed'].includes(doc.status),
      fileSize: doc.metadata?.fileSize ? (doc.metadata.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A',
      signedDaysAgo: doc.signedAt ? Math.floor((new Date() - new Date(doc.signedAt)) / (1000 * 60 * 60 * 24)) : null
    }));

    // Get total count and stats
    const statsQuery = isSuper ? {} : { adminId };
    const [total, stats] = await Promise.all([
      DigioDocument.countDocuments(query),
      DigioDocument.aggregate([
        { $match: statsQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalSize: { $sum: '$metadata.fileSize' }
          }
        }
      ])
    ]);

    const pages = Math.ceil(total / limitNum);

    res.json({
      documents: processedDocuments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages
      },
      stats: {
        total,
        pages,
        statusBreakdown: stats
      }
    });
  } catch (err) {
    console.error('Admin documents fetch error:', err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Admin: Get document details by ID
router.get('/admin/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    // Find document with tenant filtering - superadmin can access any document
    const docQuery = isSuper ? { documentId: documentId } : { documentId: documentId, adminId: adminId };
    const document = await DigioDocument.findOne(docQuery)
    .populate('userId')
    .populate('paymentLinkId')
    .populate('groupId', 'name description');
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Build document timeline
    const timeline = [
      {
        event: 'Document Uploaded',
        timestamp: document.uploadedAt || document.createdAt,
        status: 'uploaded'
      }
    ];

    if (document.sentForSigningAt) {
      timeline.push({
        event: 'Sent for Signing',
        timestamp: document.sentForSigningAt,
        status: 'sent_for_signing'
      });
    }

    if (document.signedAt) {
      timeline.push({
        event: 'Document Signed',
        timestamp: document.signedAt,
        status: 'signed',
        signer: document.signerData
      });
    }

    if (document.completedAt) {
      timeline.push({
        event: 'Process Completed',
        timestamp: document.completedAt,
        status: 'completed'
      });
    }

    // Add error events
    document.errors.forEach(error => {
      timeline.push({
        event: 'Error Occurred',
        timestamp: error.timestamp,
        status: 'error',
        details: error.message,
        type: error.type
      });
    });

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
      document: {
        ...document.toObject(),
        userName: document.userId ? 
          `${document.userId.firstName || ''} ${document.userId.lastName || ''}`.trim() : 
          document.signerData?.name || 'N/A',
        isExpired: document.isExpired(),
        canDownload: document.canBeDownloaded(),
        fileSize: document.metadata?.fileSize ? 
          (document.metadata.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'
      },
      timeline,
      relatedPayment: document.paymentLinkId,
      relatedGroup: document.groupId
    });
  } catch (err) {
    console.error('Document details fetch error:', err);
    res.status(500).json({ error: "Failed to fetch document details" });
  }
});

// Admin: Download original document
router.get('/admin/:documentId/download/original', async (req, res) => {
  try {
    const { documentId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    const docQuery = isSuper ? { documentId: documentId } : { documentId: documentId, adminId: adminId };
    const document = await DigioDocument.findOne(docQuery);
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (!document.originalFilePath || !fs.existsSync(document.originalFilePath)) {
      return res.status(404).json({ error: "Original document file not found" });
    }

    const fileName = document.originalFileName || document.fileName || `document_${documentId}.pdf`;
    res.download(document.originalFilePath, fileName);
  } catch (err) {
    console.error('Document download error:', err);
    res.status(500).json({ error: "Failed to download document" });
  }
});

// Admin: Download signed document
router.get('/admin/:documentId/download/signed', async (req, res) => {
  try {
    const { documentId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    const docQuery = isSuper ? { documentId: documentId } : { documentId: documentId, adminId: adminId };
    const document = await DigioDocument.findOne(docQuery);
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (!document.canBeDownloaded()) {
      return res.status(400).json({ error: "Document is not yet signed or completed" });
    }

    // Try local file first
    if (document.signedFilePath && fs.existsSync(document.signedFilePath)) {
      const fileName = `signed_${document.originalFileName || document.fileName || `document_${documentId}.pdf`}`;
      return res.download(document.signedFilePath, fileName);
    }

    // If no local file, try to download from Digio
    if (document.signedDownloadUrl) {
      return res.redirect(document.signedDownloadUrl);
    }

    res.status(404).json({ error: "Signed document not available for download" });
  } catch (err) {
    console.error('Signed document download error:', err);
    res.status(500).json({ error: "Failed to download signed document" });
  }
});

// Admin: Get document statistics dashboard
router.get('/admin/stats/dashboard', async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    const { dateRange = '30d' } = req.query;

    // Calculate date filter
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const baseQuery = isSuper ? {} : { adminId };
    const dateQuery = { ...baseQuery, createdAt: { $gte: startDate, $lte: now } };

    // Document statistics
    const [
      totalDocuments,
      newDocuments,
      signedDocuments,
      completedDocuments,
      expiredDocuments,
      recentDocuments,
      documentsByStatus,
      documentsByType,
      averageSigningTime
    ] = await Promise.all([
      DigioDocument.countDocuments(baseQuery),
      DigioDocument.countDocuments(dateQuery),
      DigioDocument.countDocuments({ ...baseQuery, status: 'signed' }),
      DigioDocument.countDocuments({ ...baseQuery, status: 'completed' }),
      DigioDocument.countDocuments({ 
        ...baseQuery, 
        expiresAt: { $lt: now },
        status: { $nin: ['signed', 'completed'] }
      }),
      DigioDocument.find(baseQuery)
        .populate('userId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('documentId fileName status createdAt signedAt userId documentType'),
      DigioDocument.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      DigioDocument.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$documentType', count: { $sum: 1 } } }
      ]),
      DigioDocument.aggregate([
        { 
          $match: { 
            ...baseQuery, 
            uploadedAt: { $exists: true },
            signedAt: { $exists: true }
          }
        },
        {
          $project: {
            signingTime: { 
              $subtract: ['$signedAt', '$uploadedAt'] 
            }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$signingTime' }
          }
        }
      ])
    ]);

    const completionRate = totalDocuments > 0 ? 
      (((signedDocuments + completedDocuments) / totalDocuments) * 100).toFixed(2) : 0;

    const avgSigningHours = averageSigningTime.length > 0 ? 
      (averageSigningTime[0].avgTime / (1000 * 60 * 60)).toFixed(1) : 0;

    res.json({
      stats: {
        totalDocuments,
        newDocuments,
        signedDocuments,
        completedDocuments,
        expiredDocuments,
        completionRate,
        avgSigningHours
      },
      recentDocuments: recentDocuments.map(doc => ({
        ...doc.toObject(),
        userName: doc.userId ? 
          `${doc.userId.firstName || ''} ${doc.userId.lastName || ''}`.trim() : 'N/A'
      })),
      documentsByStatus,
      documentsByType,
      dateRange
    });
  } catch (err) {
    console.error('Document stats fetch error:', err);
    res.status(500).json({ error: "Failed to fetch document statistics" });
  }
});

// Admin: Resend document for signing
router.post('/admin/:documentId/resend', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { email, name } = req.body;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    const docQuery = isSuper ? { documentId: documentId } : { documentId: documentId, adminId: adminId };
    const document = await DigioDocument.findOne(docQuery);
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (!['uploaded', 'sent_for_signing', 'failed'].includes(document.status)) {
      return res.status(400).json({ 
        error: "Document cannot be resent. Current status: " + document.status 
      });
    }

    // Update signer data if provided
    if (email || name) {
      document.signerData = {
        ...document.signerData,
        ...(email && { email }),
        ...(name && { name })
      };
    }

    // TODO: Implement actual Digio API call to resend document
    // For now, just update status and timestamp
    await document.updateStatus('sent_for_signing');

    res.json({ 
      message: "Document resent for signing successfully",
      document 
    });
  } catch (err) {
    console.error('Document resend error:', err);
    res.status(500).json({ error: "Failed to resend document" });
  }
});

// Admin: Delete document (soft delete by updating status)
router.delete('/admin/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { reason } = req.body;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    const docQuery = isSuper ? { documentId: documentId } : { documentId: documentId, adminId: adminId };
    const document = await DigioDocument.findOne(docQuery);
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Add deletion reason as an error log
    if (reason) {
      await document.addError('deletion', `Document deleted by admin: ${reason}`);
    }

    // Mark as failed instead of hard delete to maintain audit trail
    await document.updateStatus('failed');

    res.json({ 
      message: "Document deleted successfully",
      documentId 
    });
  } catch (err) {
    console.error('Document deletion error:', err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

module.exports = router;