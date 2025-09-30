const Invoice = require("../models/Invoice");
const { generateEnhancedPDFBuffer } = require("../services/enhancedPdfService");
const { sendInvoiceEmail } = require("../services/emailService");
const User = require("../models/user.model");
const PaymentLink = require("../models/paymentLinkModel");
const { generateInvoiceNumber } = require("../utils/invoiceNumberGenerator");
const fs = require("fs");
const path = require('path');

// Create enhanced invoice with professional design
exports.createEnhancedInvoice = async (req, res) => {
  try {
    const {
      billDate,
      userid,
      description,
      serviceStartDate,
      serviceEndDate,
      channelBundleId,               // New: for invoice number generation
      templateType = 'professional', // New: template selection
      customBranding = {},            // New: custom branding options
      paymentTerms = 30,             // New: payment terms in days
      includeNotes = true,           // New: include additional notes
      currency = 'INR'               // New: currency support
    } = req.body;

    // Fetch user with required fields including groupId (channel bundle)
    const user = await User.findOne({ _id: userid }, 'firstName middleName lastName phone email City stateCode amount transactionId adminId groupId');
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const payment = await PaymentLink.findOne({ userid: userid });

    // Use the exact payment amount as shown in admin transactions
    const paymentTotal = Number(payment?.amount);
    if (isNaN(paymentTotal) || paymentTotal <= 0) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }

    // Calculate base price: payment amount / 1.18 (for 18% GST)
    const taxPercent = 18;
    const basePrice = parseFloat((paymentTotal / (1 + (taxPercent / 100))).toFixed(2));

    if (isNaN(basePrice)) {
      return res.status(400).json({ error: "Invalid amount in user data" });
    }

    const transactionId = payment?.link_id || payment?.transactionId || "";

    // Determine GST type based on state (intra-state vs inter-state)
    const creatorStateCode = (customBranding.stateCode || "24").toString().trim();
    const buyerStateCode = (user.stateCode || "").toString().trim();
    const buyerStateName = (user.State || user.state || "").toString().trim();
    const isIntraState = (buyerStateCode && buyerStateCode === creatorStateCode) || /gujarat/i.test(buyerStateName);

    // Enhanced invoice data with additional fields
    const invoiceData = {
      invoiceNo,
      billDate: new Date(billDate),
      userid,
      billedTo: {
        name: `${user.firstName} ${user.middleName || ""} ${user.lastName}`.trim(),
        phone: user.phone || "",
        email: user.email,
        address: user.City,
        stateCode: user.stateCode || payment?.userid?.stateCode || payment?.stateCode || "",
        stateName: user.State || user.state || payment?.userid?.State || payment?.userid?.state || payment?.customerState || payment?.state || ""
      },
      creator: {
        name: customBranding.companyName || "VYOM RESEARCH LLP",
        pan: customBranding.pan || "AAYFV4090K",
        gstin: customBranding.gstin || "24AAYFV4090K1ZE",
        address: customBranding.address || "Shop no. 238 Services, Gujarat",
        stateCode: customBranding.stateCode || "24",
        email: customBranding.email || "info@vyomresearch.com",
        phone: customBranding.phone || "+91 XXXXXXXXXX",
        website: customBranding.website || "www.vyomresearch.com"
      },
      description,
      serviceStartDate: serviceStartDate || payment.purchase_datetime || new Date(),
      serviceEndDate: serviceEndDate || payment.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default to 1 year from now
      price: basePrice,
      transactionId,
      templateType,
      paymentTerms,
      currency,
      status: 'Generated',
      adminId: req.adminContext?.adminId || req.admin?._id,
      
      // Additional metadata
      metadata: {
        generatedBy: req.admin?.name || 'System',
        generatedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    // Calculate GST amounts properly
    const gstAmount = parseFloat((basePrice * (taxPercent / 100)).toFixed(2));

    // Generate invoice number using new format - use user's groupId as channel bundle ID
    const actualChannelBundleId = channelBundleId || user.groupId; // Use provided channelBundleId or user's groupId
    const invoiceNo = await generateInvoiceNumber(user.adminId, actualChannelBundleId);

    console.log('Enhanced Invoice Generation Debug:', {
      userId: userid,
      userGroupId: user.groupId,
      providedChannelBundleId: channelBundleId,
      actualChannelBundleUsed: actualChannelBundleId,
      generatedInvoiceNo: invoiceNo
    });

    // Determine if this is inter-state or intra-state transaction for GST
    // Reuse the existing creatorStateCode from above

    // Get the most reliable state code - reuse buyerStateCode from above or get fresh
    const finalBuyerStateCode = (
      buyerStateCode ||
      user.stateCode ||
      user.State ||
      payment?.stateCode ||
      payment?.customerState ||
      ""
    ).toString().trim();

    // Debug logging
    console.log('Enhanced GST Calculation Debug:');
    console.log('- Creator State (Company):', creatorStateCode);
    console.log('- Final Buyer State Code:', finalBuyerStateCode);
    console.log('- Original buyerStateCode:', buyerStateCode);
    console.log('- User State Info:', { stateCode: user.stateCode, State: user.State });

    // For Gujarat, also check state name if state code is missing
    const isGujaratByName = (user.State || user.state || "").toLowerCase().includes('gujarat');
    const isInterState = finalBuyerStateCode !== creatorStateCode && !isGujaratByName;

    console.log('- Is Gujarat by name?', isGujaratByName);
    console.log('- Final decision - Is Inter State?', isInterState);

    // Set appropriate GST structure
    if (isInterState) {
      // Inter-state: IGST
      invoiceData.igst = taxPercent;
      invoiceData.igstAmt = gstAmount;
      invoiceData.gstLabel = `IGST@${taxPercent}%`;
    } else {
      // Intra-state: CGST + SGST
      const cgstRate = taxPercent / 2;
      const sgstRate = taxPercent / 2;
      const cgstAmt = parseFloat((basePrice * (cgstRate / 100)).toFixed(2));
      const sgstAmt = parseFloat((basePrice * (sgstRate / 100)).toFixed(2));

      invoiceData.cgst = cgstRate;
      invoiceData.cgstAmt = cgstAmt;
      invoiceData.sgst = sgstRate;
      invoiceData.sgstAmt = sgstAmt;
      invoiceData.gstLabel = `CGST@${cgstRate}% + SGST@${sgstRate}%`;
    }

    // Set final amounts - ensure total matches the payment amount exactly
    invoiceData.total = paymentTotal;
    
    // Add tax breakdown for transparency
    invoiceData.taxBreakdown = {
      taxableAmount: basePrice,
      igstRate: invoiceData.igst,
      igstAmount: invoiceData.igstAmt,
      cgstRate: invoiceData.cgst,
      cgstAmount: invoiceData.cgstAmt,
      sgstRate: invoiceData.sgst,
      sgstAmount: invoiceData.sgstAmt,
      totalTax: (invoiceData.igstAmt || 0) + (invoiceData.cgstAmt || 0) + (invoiceData.sgstAmt || 0),
      grandTotal: paymentTotal
    };

    // Add payment terms and due date
    const dueDate = new Date(billDate);
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    invoiceData.dueDate = dueDate;
    invoiceData.paymentStatus = payment?.status === 'SUCCESS' ? 'Paid' : 'Pending';

    // Save to MongoDB
    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Update PaymentLink with invoiceId
    if (payment) {
      payment.invoiceId = invoice._id;
      await payment.save();
    }

    // Generate enhanced PDF (attach minimal user fields for fallback state rendering)
    const invoiceForPdf = Object.assign({}, invoice.toObject ? invoice.toObject() : invoice, {
      user: {
        State: user.State || user.state,
        state: user.state,
        stateCode: user.stateCode,
        address: { state: user.State || user.state }
      },
      // Add service dates from paymentLinkModel
      serviceStartDate: payment?.purchase_datetime || invoice.serviceStartDate,
      serviceEndDate: payment?.expiry_date || invoice.serviceEndDate
    });
    const pdfBuffer = await generateEnhancedPDFBuffer(invoiceForPdf);

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../public/uploads/invoices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save PDF with invoice number as filename
    const safeInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `${safeInvoiceNo}.pdf`;
    const localPdfPath = path.join(uploadDir, filename);

    fs.writeFileSync(localPdfPath, pdfBuffer);

    // Update invoice with file path and additional info
    invoice.localPdfPath = localPdfPath;
    invoice.filename = filename;
    invoice.fileSize = pdfBuffer.length;
    await invoice.save();

    console.log('Enhanced invoice PDF generated:', localPdfPath);

    // Send enhanced invoice email with derived calculation (Base = Total − Tax)
    if (user.email && includeNotes) {
      try {
        await sendInvoiceEmail(
          user.email,
          {
            creatorName: invoiceData.creator.name,
            billedToName: invoiceData.billedTo.name,
            billedToState: invoiceData.billedTo.stateName || invoiceData.billedTo.state || invoiceData.billedTo.address,
            planName: invoiceData.description,
            total: invoice.total, // show final total
            igst: invoice.igst,
            igstAmt: invoice.igstAmt,
            cgst: invoice.cgst,
            cgstAmt: invoice.cgstAmt,
            sgst: invoice.sgst,
            sgstAmt: invoice.sgstAmt,
            invoiceNo: invoiceData.invoiceNo,
            billDate: invoiceData.billDate,
            description: invoiceData.description,
            dueDate: invoiceData.dueDate,
            paymentStatus: invoiceData.paymentStatus
          },
          localPdfPath
        );
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the invoice creation if email fails
      }
    }

    res.status(201).json({ 
      success: true,
      message: "Enhanced invoice created successfully", 
      invoice: {
        id: invoice._id,
        invoiceNo: invoice.invoiceNo,
        total: invoice.total,
        status: invoice.status,
        filename: invoice.filename,
        createdAt: invoice.createdAt
      }
    });

  } catch (err) {
    console.error("Enhanced invoice creation error:", err);
    res.status(500).json({ 
      success: false,
      error: "Enhanced invoice creation failed",
      details: err.message 
    });
  }
};

// Preview invoice without saving (for admin preview)
exports.previewInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    
    // Add required fields for preview
    invoiceData.status = 'Preview';
    invoiceData.billDate = invoiceData.billDate ? new Date(invoiceData.billDate) : new Date();
    
    // Generate PDF buffer
    const pdfBuffer = await generateEnhancedPDFBuffer(invoiceData);

    // Set headers for PDF preview
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="invoice_preview.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (err) {
    console.error("Invoice preview error:", err);
    res.status(500).json({ 
      success: false,
      error: "Invoice preview failed",
      details: err.message 
    });
  }
};

// Get invoice templates
exports.getInvoiceTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 'professional',
        name: 'Professional Template',
        description: 'Modern design with company branding and detailed breakdown',
        features: ['Company logo placeholder', 'Status badges', 'Tax breakdown', 'Payment terms'],
        preview: '/api/invoices/templates/professional/preview'
      },
      {
        id: 'minimal',
        name: 'Minimal Template',
        description: 'Clean and simple design for basic invoicing needs',
        features: ['Simple layout', 'Essential information only', 'Fast generation'],
        preview: '/api/invoices/templates/minimal/preview'
      },
      {
        id: 'corporate',
        name: 'Corporate Template',
        description: 'Formal design suitable for corporate clients',
        features: ['Professional header', 'Detailed terms', 'Corporate styling'],
        preview: '/api/invoices/templates/corporate/preview'
      }
    ];

    res.json({
      success: true,
      templates
    });
  } catch (err) {
    console.error("Get templates error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to get templates" 
    });
  }
};

// Get invoice analytics
exports.getInvoiceAnalytics = async (req, res) => {
  try {
    const { adminId, startDate, endDate } = req.query;
    const isSuper = req.admin?.role === 'superadmin';
    
    // Build query based on admin permissions
    let matchQuery = {};
    if (!isSuper && adminId) {
      matchQuery.adminId = adminId;
    }

    if (startDate || endDate) {
      matchQuery.billDate = {};
      if (startDate) matchQuery.billDate.$gte = new Date(startDate);
      if (endDate) matchQuery.billDate.$lte = new Date(endDate);
    }

    const analytics = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          avgAmount: { $avg: '$total' },
          paidInvoices: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] }
          },
          pendingInvoices: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, 1, 0] }
          },
          totalPaidAmount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$total', 0] }
          }
        }
      }
    ]);

    const monthlyStats = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$billDate' },
            month: { $month: '$billDate' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      analytics: analytics[0] || {
        totalInvoices: 0,
        totalAmount: 0,
        avgAmount: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        totalPaidAmount: 0
      },
      monthlyStats
    });

  } catch (err) {
    console.error("Invoice analytics error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to get analytics" 
    });
  }
};

module.exports = {
  createEnhancedInvoice: exports.createEnhancedInvoice,
  previewInvoice: exports.previewInvoice,
  getInvoiceTemplates: exports.getInvoiceTemplates,
  getInvoiceAnalytics: exports.getInvoiceAnalytics
};
