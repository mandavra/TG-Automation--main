const express = require("express");
const router = express.Router();
const {
  createEnhancedInvoice,
  previewInvoice,
  getInvoiceTemplates,
  getInvoiceAnalytics
} = require("../controllers/enhancedInvoiceController");
const adminAuth = require('../middlewares/adminAuth');
const injectAdminContext = require('../middlewares/injectAdminContext');

// Enhanced invoice creation with professional design
router.post('/enhanced', adminAuth, injectAdminContext, createEnhancedInvoice);

// Preview invoice without saving (for testing designs)
router.post('/preview', adminAuth, injectAdminContext, previewInvoice);

// Get available invoice templates
router.get('/templates', adminAuth, getInvoiceTemplates);

// Get invoice analytics and statistics
router.get('/analytics', adminAuth, injectAdminContext, getInvoiceAnalytics);

// Batch invoice operations
router.post('/batch/create', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { userIds, commonData } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "User IDs array is required"
      });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const invoiceData = {
          ...commonData,
          userid: userId,
          invoiceNo: `${commonData.invoicePrefix || 'INV'}-${Date.now()}-${userId.slice(-4)}`
        };

        // You would call createEnhancedInvoice here with invoiceData
        // For now, we'll just simulate success
        results.push({
          userId,
          invoiceNo: invoiceData.invoiceNo,
          status: 'success'
        });
      } catch (error) {
        errors.push({
          userId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${userIds.length} invoices`,
      results,
      errors,
      summary: {
        total: userIds.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (err) {
    console.error('Batch invoice creation error:', err);
    res.status(500).json({
      success: false,
      error: 'Batch invoice creation failed'
    });
  }
});

// Invoice template customization
router.post('/customize-template', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const {
      templateId,
      customizations
    } = req.body;

    // Here you would save template customizations for the admin
    // For now, return success response
    res.json({
      success: true,
      message: 'Template customization saved successfully',
      templateId,
      customizations
    });

  } catch (err) {
    console.error('Template customization error:', err);
    res.status(500).json({
      success: false,
      error: 'Template customization failed'
    });
  }
});

// Get custom branding for admin
router.get('/branding/:adminId?', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const adminId = req.params.adminId || req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    // Only superadmin can access other admin's branding
    if (!isSuper && adminId !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Default branding configuration
    const defaultBranding = {
      companyName: "VYOM RESEARCH LLP",
      pan: "AAYFV4090K",
      gstin: "24AAYFV4090K1ZE",
      address: "Shop no. 238 Services, Gujarat",
      stateCode: "24",
      email: "info@vyomresearch.com",
      phone: "+91 XXXXXXXXXX",
      website: "www.vyomresearch.com",
      logo: null,
      primaryColor: "#1e3d59",
      secondaryColor: "#17a2b8"
    };

    res.json({
      success: true,
      branding: defaultBranding
    });

  } catch (err) {
    console.error('Get branding error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get branding information'
    });
  }
});

// Update custom branding
router.put('/branding', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId || req.admin._id;
    const brandingData = req.body;

    // Here you would save the branding data for the admin
    // For now, return success response
    res.json({
      success: true,
      message: 'Branding updated successfully',
      adminId,
      branding: brandingData
    });

  } catch (err) {
    console.error('Update branding error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update branding'
    });
  }
});

// Export/download invoices in different formats
router.post('/export', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { 
      invoiceIds, 
      format = 'pdf', 
      includeDetails = true 
    } = req.body;

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invoice IDs array is required'
      });
    }

    // For now, return success response
    // In a real implementation, you'd generate the export file
    res.json({
      success: true,
      message: `Export initiated for ${invoiceIds.length} invoices`,
      format,
      downloadUrl: `/api/invoices/download/export_${Date.now()}.${format}`,
      expiresIn: '24 hours'
    });

  } catch (err) {
    console.error('Invoice export error:', err);
    res.status(500).json({
      success: false,
      error: 'Invoice export failed'
    });
  }
});

// Send invoice reminder emails
router.post('/send-reminders', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { invoiceIds, reminderType = 'payment' } = req.body;

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invoice IDs array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const invoiceId of invoiceIds) {
      try {
        // Here you would send the reminder email
        // For now, simulate success
        results.push({
          invoiceId,
          status: 'sent',
          sentAt: new Date()
        });
      } catch (error) {
        errors.push({
          invoiceId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Reminders processed for ${invoiceIds.length} invoices`,
      reminderType,
      results,
      errors,
      summary: {
        total: invoiceIds.length,
        sent: results.length,
        failed: errors.length
      }
    });

  } catch (err) {
    console.error('Send reminders error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to send reminders'
    });
  }
});

// Get invoice status summary
router.get('/status-summary', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';

    // Mock data - replace with actual database queries
    const statusSummary = {
      total: 150,
      paid: 120,
      pending: 25,
      overdue: 5,
      draft: 0,
      byMonth: [
        { month: 'Jan', total: 45, paid: 40, pending: 5 },
        { month: 'Feb', total: 52, paid: 45, pending: 7 },
        { month: 'Mar', total: 53, paid: 35, pending: 13, overdue: 5 }
      ],
      recentActivity: [
        {
          invoiceNo: 'INV-2024-001',
          customerName: 'John Doe',
          amount: 5000,
          status: 'paid',
          paidAt: new Date()
        }
      ]
    };

    res.json({
      success: true,
      summary: statusSummary
    });

  } catch (err) {
    console.error('Status summary error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get status summary'
    });
  }
});

module.exports = router;