const express = require("express");
const { createInvoice, downloadInvoice, resendInvoiceEmail } = require("../controllers/invoiceController");
const router = express.Router();
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // Import multer
const adminAuth = require('../middlewares/adminAuth');
const injectAdminContext = require('../middlewares/injectAdminContext');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'backend/public/uploads/invoices'); // Destination folder for invoice uploads
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename
  }
});
const upload = multer({ storage: storage });

const Invoice = require("../models/Invoice");

router.post("/", upload.single('invoiceFile'), createInvoice); // Add Multer middleware here
router.get("/download/:invoiceId", downloadInvoice);
// Resend invoice email by ID
router.post('/resend-email/:invoiceId', async (req, res) => {
  return require('../controllers/invoiceController').resendInvoiceEmail(req, res);
});

// POST /api/invoices/download-zip
router.post('/download-zip', async (req, res) => {
  try {
    const { invoiceIds } = req.body;
    console.log('Received invoiceIds:', invoiceIds);

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({ error: 'No invoice IDs provided' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.zip');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const invoiceId of invoiceIds) {
      const filePath = path.join(__dirname, '../invoices', `invoice_${invoiceId}.pdf`);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `invoice_${invoiceId}.pdf` });
      } else {
        console.log('File not found:', filePath);
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('ZIP download error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all invoices for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const invoices = await Invoice.find({ userid: req.params.userId }).sort({ billDate: -1 });
    res.json({ invoices });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// Admin: Get all invoices with filtering and pagination
router.get('/admin', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, dateRange } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query with admin filtering
    let query = {};
    
    // Apply tenant filtering - superadmin sees all, regular admin sees only their own
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    if (!isSuper) {
      query.adminId = adminId;
    }
    
    // Search by invoice number or customer name
    if (search) {
      query.$or = [
        { invoiceNo: { $regex: search, $options: 'i' } },
        { 'billedTo.name': { $regex: search, $options: 'i' } },
        { 'billedTo.phone': { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
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
        query.billDate = { $gte: startDate };
      }
    }

    // Get invoices with pagination
    const invoices = await Invoice.find(query)
      .sort({ billDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Add customer info to response
    const processedInvoices = invoices.map(invoice => ({
      ...invoice,
      customerName: invoice.billedTo?.name || 'N/A',
      customerPhone: invoice.billedTo?.phone || 'N/A',
      status: invoice.status || 'generated'
    }));

    // Get total count
    const total = await Invoice.countDocuments(query);
    const pages = Math.ceil(total / limitNum);

    res.json({
      invoices: processedInvoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages
      },
      total,
      pages
    });
  } catch (err) {
    console.error('Admin invoices fetch error:', err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// Admin: Download invoice
router.get('/:invoiceId/download', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    // Find invoice with tenant filtering - superadmin can access any invoice
    const invoiceQuery = isSuper ? { _id: invoiceId } : { _id: invoiceId, adminId: adminId };
    const invoice = await Invoice.findOne(invoiceQuery);
    
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (!invoice.localPdfPath || !fs.existsSync(invoice.localPdfPath)) {
      return res.status(404).json({ error: "Invoice PDF not found" });
    }

    // Use invoice number for download filename
    const downloadFilename = invoice.invoiceNo ? `${invoice.invoiceNo}.pdf` : `invoice_${invoice._id}.pdf`;
    res.download(invoice.localPdfPath, downloadFilename);
  } catch (err) {
    console.error('Invoice download error:', err);
    res.status(500).json({ error: "Failed to download invoice" });
  }
});

// Admin: View invoice (returns PDF as response)
router.get('/:invoiceId/view', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    // Find invoice with tenant filtering - superadmin can access any invoice
    const invoiceQuery = isSuper ? { _id: invoiceId } : { _id: invoiceId, adminId: adminId };
    const invoice = await Invoice.findOne(invoiceQuery);
    
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (!invoice.localPdfPath || !fs.existsSync(invoice.localPdfPath)) {
      return res.status(404).json({ error: "Invoice PDF not found" });
    }

    // Set headers for PDF viewing in browser
    const viewFilename = invoice.invoiceNo ? `${invoice.invoiceNo}.pdf` : `invoice_${invoice._id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${viewFilename}"`);
    
    // Stream the PDF file
    const fileStream = fs.createReadStream(invoice.localPdfPath);
    fileStream.pipe(res);
  } catch (err) {
    console.error('Invoice view error:', err);
    res.status(500).json({ error: "Failed to view invoice" });
  }
});

// Admin: Regenerate invoice
router.post('/:invoiceId/regenerate', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    // Find invoice with tenant filtering - superadmin can access any invoice
    const invoiceQuery = isSuper ? { _id: invoiceId } : { _id: invoiceId, adminId: adminId };
    const invoice = await Invoice.findOne(invoiceQuery);
    
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Here you could regenerate the PDF using your PDF service
    // For now, just return success
    res.json({ message: "Invoice regeneration functionality not implemented yet" });
  } catch (err) {
    console.error('Invoice regenerate error:', err);
    res.status(500).json({ error: "Failed to regenerate invoice" });
  }
});

// Admin: Delete invoice
router.delete('/:invoiceId', adminAuth, injectAdminContext, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const adminId = req.adminContext?.adminId || req.admin._id;
    const isSuper = req.admin?.role === 'superadmin';
    
    // Find invoice with tenant filtering - superadmin can access any invoice
    const invoiceQuery = isSuper ? { _id: invoiceId } : { _id: invoiceId, adminId: adminId };
    const invoice = await Invoice.findOne(invoiceQuery);
    
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Delete the PDF file if it exists
    if (invoice.localPdfPath && fs.existsSync(invoice.localPdfPath)) {
      try {
        fs.unlinkSync(invoice.localPdfPath);
        console.log('Deleted PDF file:', invoice.localPdfPath);
      } catch (fileErr) {
        console.warn('Could not delete PDF file:', fileErr.message);
      }
    }

    // Delete the invoice from database
    await Invoice.findByIdAndDelete(invoiceId);
    
    res.json({ message: "Invoice deleted successfully", deletedId: invoiceId });
  } catch (err) {
    console.error('Invoice delete error:', err);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

module.exports = router;
