const Invoice = require("../models/Invoice");
const { generatePDFBuffer } = require("../services/pdfService");
const { generateEnhancedPDFBuffer } = require("../services/enhancedPdfService");
const { sendInvoiceEmail } = require("../services/emailService");
// const cloudinary = require('../services/cloudinaryService'); // Remove or comment out this line
const User = require("../models/user.model");
const PaymentLink = require("../models/paymentLinkModel");
const { generateInvoiceNumber } = require("../utils/invoiceNumberGenerator");
const fs = require("fs");
const path = require('path'); // Add path module
// const stream = require('stream'); // This might not be needed if not streaming to Cloudinary

exports.createInvoice = async (req, res) => {
  try {
    const { billDate, userid, description, serviceStartDate, serviceEndDate, channelBundleId } = req.body;

    // Fetch user with required fields including groupId (channel bundle)
    const user = await User.findOne(
      { _id: userid },
      'firstName middleName lastName fullName phone email City state State stateCode amount transactionId adminId groupId'
    );
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

    const transactionId = payment?.link_id || payment?.transactionId || "";

    // Calculate GST amounts properly
    const gstAmount = parseFloat((basePrice * (taxPercent / 100)).toFixed(2));
    const totalAmount = parseFloat((basePrice + gstAmount).toFixed(2));

    // Generate invoice number using new format - use user's groupId as channel bundle ID
    const actualChannelBundleId = channelBundleId || user.groupId; // Use provided channelBundleId or user's groupId
    const invoiceNo = await generateInvoiceNumber(user.adminId, actualChannelBundleId);

    console.log('Invoice Generation Debug:', {
      userId: userid,
      userGroupId: user.groupId,
      providedChannelBundleId: channelBundleId,
      actualChannelBundleUsed: actualChannelBundleId,
      generatedInvoiceNo: invoiceNo
    });

    // Build invoice data
    const billedToName = (
      [user.firstName, user.middleName, user.lastName]
        .filter(Boolean)
        .join(' ') || user.fullName || ''
    ).trim();
    const invoiceData = {
      invoiceNo,
      billDate,
      userid,
      adminId: user.adminId,   // 👈 FIX: add adminId
      billedTo: {
        name: billedToName,
        phone: user.phone || "",
        email: user.email,
        address: user.City,
        stateCode: user.stateCode || "",
        stateName: user.State || user.state || undefined
      },
      creator: {
        name: "VYOM RESEARCH LLP",
        pan: "AAYFV4090K",
        gstin: "24AAYFV4090K1ZE",
        address: "Shop no. 238 Services, Gujarat",
        stateCode: "24"
      },
      description,
      serviceStartDate: serviceStartDate || payment.purchase_datetime || new Date(),
      serviceEndDate: serviceEndDate || payment.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default to 1 year from now
      price: basePrice,
      transactionId
    };

    // Determine if this is inter-state or intra-state transaction for GST
    const creatorStateCode = "24"; // Gujarat

    // Try multiple sources for buyer state code
    const buyerStateCode = (
      user.stateCode ||
      user.State ||
      payment?.stateCode ||
      payment?.customerState ||
      ""
    ).toString().trim();

    // Debug logging
    console.log('GST Calculation Debug:');
    console.log('- Creator State (Company):', creatorStateCode);
    console.log('- Buyer State Code:', buyerStateCode);
    console.log('- User State Info:', { stateCode: user.stateCode, State: user.state });
    console.log('- Payment State Info:', { stateCode: payment?.stateCode, customerState: payment?.customerState });

    // For Gujarat, also check state name if state code is missing
    const isGujaratByName = (user.State || user.state || "").toLowerCase().includes('gujarat');
    const isInterState = buyerStateCode !== creatorStateCode && !isGujaratByName;

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

    // Save to MongoDB
    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Update PaymentLink with invoiceId
    if (payment) {
      payment.invoiceId = invoice._id;
      await payment.save();
    }

    // Generate enhanced PDF as a buffer (attach minimal user fields for fallback state rendering)
    const invoiceForPdf = Object.assign({}, invoice.toObject ? invoice.toObject() : invoice, {
      user: {
        State: user.State || user.state,
        state: user.state,
        stateCode: user.stateCode,
        address: { state: user.State || user.state }
      },
      // Add service dates from paymentLinkModel if available
      serviceStartDate: invoice.serviceStartDate,
      serviceEndDate: invoice.serviceEndDate
    });
    const pdfBuffer = await generateEnhancedPDFBuffer(invoiceForPdf);

    // Define local path for saving the PDF using invoice number
    const uploadDir = path.join(__dirname, '../public/uploads/invoices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    // Use invoice number for filename instead of ObjectId
    const safeInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9-]/g, '_'); // Replace special chars with underscore
    const localPdfPath = path.join(uploadDir, `${safeInvoiceNo}.pdf`);

    // Save PDF buffer to local file
    fs.writeFileSync(localPdfPath, pdfBuffer);

    // Update invoice with local PDF path
    invoice.localPdfPath = localPdfPath;
    await invoice.save();

    console.log('Invoice PDF saved locally at:', localPdfPath);

    // Send invoice email with local PDF path
    await sendInvoiceEmail(
      user.email,
      {
        creatorName: invoiceData.creator.name,
        billedToName: invoiceData.billedTo.name,
        billedToState: invoiceData.billedTo.stateName || invoiceData.billedTo.state || invoiceData.billedTo.address,
        total: invoiceData.total,
        igst: invoiceData.igst,
        igstAmt: invoiceData.igstAmt,
        cgst: invoiceData.cgst,
        cgstAmt: invoiceData.cgstAmt,
        sgst: invoiceData.sgst,
        sgstAmt: invoiceData.sgstAmt,
        invoiceNo: invoiceData.invoiceNo,
        billDate: invoiceData.billDate,
        description: invoiceData.description,
      },
      localPdfPath
    );

    res.status(201).json({ message: "Invoice created and saved locally", invoice });
  } catch (err) {
    console.error("Invoice creation error:", err);
    res.status(500).json({ error: "Invoice creation failed" });
  }
};

exports.downloadInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const Invoice = require("../models/Invoice");
    const invoice = await Invoice.findById(invoiceId);
    // Change from cloudinaryUrl to localPdfPath
    if (!invoice || !invoice.localPdfPath || !fs.existsSync(invoice.localPdfPath)) {
      return res.status(404).json({ error: "Invoice PDF not found locally" });
    }
    // Serve the local PDF file
    res.download(invoice.localPdfPath); // Use res.download to send the file
  } catch (err) {
    res.status(500).json({ error: "Error downloading invoice" });
  }
};

// Resend invoice email by invoice ID (regenerates PDF and emails user)
exports.resendInvoiceEmail = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId).lean();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Regenerate enhanced PDF
    const pdfBuffer = await generateEnhancedPDFBuffer(invoice);
    const uploadDir = path.join(__dirname, '../public/uploads/invoices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    // Use invoice number for filename
    const safeInvoiceNo = invoice.invoiceNo.replace(/[^a-zA-Z0-9-]/g, '_');
    const localPdfPath = path.join(uploadDir, `${safeInvoiceNo}.pdf`);
    fs.writeFileSync(localPdfPath, pdfBuffer);

    // Send email to billedTo email
    const to = invoice?.billedTo?.email;
    if (!to) return res.status(400).json({ error: 'Invoice has no billedTo.email' });

    await sendInvoiceEmail(
      to,
      {
        creatorName: invoice.creator?.name || 'VYOM RESEARCH LLP',
        billedToName: invoice.billedTo?.name || '',
        billedToState: invoice.billedTo?.stateName || invoice.billedTo?.state || invoice.billedTo?.address,
        planName: invoice.description,
        total: invoice.total,
        igst: invoice.igst,
        igstAmt: invoice.igstAmt,
        cgst: invoice.cgst,
        cgstAmt: invoice.cgstAmt,
        sgst: invoice.sgst,
        sgstAmt: invoice.sgstAmt,
        invoiceNo: invoice.invoiceNo,
        billDate: invoice.billDate,
        description: invoice.description
      },
      localPdfPath
    );

    return res.json({ success: true, message: 'Invoice email resent', to });
  } catch (err) {
    console.error('Resend invoice email error:', err);
    return res.status(500).json({ error: 'Failed to resend invoice email' });
  }
};

