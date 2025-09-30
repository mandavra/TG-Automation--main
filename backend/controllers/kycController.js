const userService = require('../services/kycService');
const PaymentLink = require('../models/paymentLinkModel');
const { checkPaymentStatus } = require('../services/cashfreeService');
const Invoice = require("../models/Invoice");
const { generatePDF } = require("../services/pdfService");
const path = require("path");
const fs = require("fs");
const { triggerTelegramLinksIfReady } = require('../utils/stepCompletionChecker');

// Check if user exists by phone (for quick login check)
exports.checkUserByPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }

    const user = await userService.getUserByPhone(phone);
    
    res.json({
      success: true,
      userExists: !!user,
      user: user || null,
      message: user ? 'User found' : 'User not found'
    });
    
  } catch (err) {
    console.error('Error in checkUserByPhone:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Phone-based user creation/login (for frontend)
exports.createUserByPhone = async (req, res) => {
  try {
    console.log('Creating/updating user with phone-based data:', req.body);
    
    const result = await userService.upsertUserByPhone(req.body);
    
    // Emit notification for new users only
    if (result.isNewUser) {
      const io = req.app.get('io');
      if (io) {
        io.emit('newUser', result.user);
      }
    }
    
    res.status(result.isNewUser ? 201 : 200).json({
      success: true,
      user: result.user,
      isNewUser: result.isNewUser,
      message: result.message
    });
    
  } catch (err) {
    console.error('Error in createUserByPhone:', err);
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Legacy email-based user creation (keep for backward compatibility)
exports.createUser = async (req, res) => {
  try {
    const user = await userService.upsertUserByEmail(req.body);
    
    // Emit notification for new user
    const io = req.app.get('io');
    if (io) {
      io.emit('newUser', user);
    }
    
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId;
    
    // Super admin sees all users, regular admin sees only their users
    const userQuery = req.adminContext?.role === 'superadmin' ? {} : { adminId: adminId };
    const users = await userService.getAllUsers(userQuery);
    
    // Get payment links for admin-specific users
    const paymentLinks = await PaymentLink.find({ 
      userid: { $in: users.map(user => user._id) },
      ...(req.adminContext?.role !== 'superadmin' && { adminId: adminId })
    });
    // Map to get latest payment link per user (by createdAt)
    const latestPaymentLinks = {};
    paymentLinks.forEach(link => {
      if (!latestPaymentLinks[link.userid] || new Date(link.createdAt) > new Date(latestPaymentLinks[link.userid].createdAt)) {
        latestPaymentLinks[link.userid] = link;
      }
    });

    // For each latest payment link, check real-time status from Cashfree
    const updatedPaymentDetails = {};
    for (const userId of Object.keys(latestPaymentLinks)) {
      const link = latestPaymentLinks[userId];
      let status = link.status;
      try {
        const paymentStatusResp = await checkPaymentStatus(link.link_id);
        // Cashfree returns status in link_status or status
        let realStatus = (paymentStatusResp.link_status || paymentStatusResp.status || '').toUpperCase();
        // Map Cashfree status to internal status
        if (realStatus === 'PAID' || realStatus === 'ACTIVE') realStatus = 'SUCCESS';
        else if (realStatus === 'EXPIRED') realStatus = 'EXPIRED';
        else if (realStatus === 'CANCELLED' || realStatus === 'FAILED') realStatus = 'FAILED';
        else if (realStatus === 'PENDING' || realStatus === 'UNPAID') realStatus = 'PENDING';
        if (realStatus && realStatus !== status) {
          // Update in DB if changed
          link.status = realStatus;
          await link.save();
          status = realStatus;
        }
      } catch (e) {
        // If error, keep old status
      }
      updatedPaymentDetails[userId] = { ...link.toObject(), status };
    }

    const transformedUsers = users.map(user => {
      const payment = updatedPaymentDetails[user._id] || {};
      return {
        ...user.toObject(),
        orderId: payment.link_id || 'N/A',
        selectedPlan: payment.plan_name || 'N/A',
        paymentStatus: payment.status || 'PENDING',
        amount: payment.amount || 0,
        invoiceNo: `INV-${Date.now()}`,
        invoiceId: payment.invoiceId || null
      };
    });

    res.json(transformedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: 'Invalid user ID' });
  }
};

exports.updateUserById = async (req, res) => {
  try {
    const user = await userService.updateUserById(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Emit payment notification if payment status is updated
    if (req.body.paymentStatus === 'Success' || req.body.paymentStatus === 'Failed') {
      const io = req.app.get('io');
      if (io) {
        // Get payment details from PaymentLink
        const paymentDetails = await PaymentLink.findOne({ userid: req.params.id })
          .sort({ createdAt: -1 })
          .limit(1);

        io.emit('payment', {
          user: {
            id: user._id,
            name: `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim(),
            email: user.email,
            phone: user.phone,
            dob: user.dob,
            panNumber: user.panNumber,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          },
          amount: paymentDetails?.amount || req.body.amount || 'N/A',
          plan: paymentDetails?.plan_name || req.body.selectedPlan || 'N/A',
          orderId: paymentDetails?.link_id || req.body.orderId || 'N/A',
          invoice: {
            invoiceNo: `INV-${Date.now()}`,
            amount: paymentDetails?.amount || req.body.amount,
            plan: paymentDetails?.plan_name || req.body.selectedPlan,
            status: req.body.paymentStatus,
            date: new Date().toISOString(),
            customerDetails: {
              name: `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim(),
              email: user.email,
              phone: user.phone,
              panNumber: user.panNumber
            }
          },
          status: req.body.paymentStatus,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Auto-create and link invoice if paymentStatus is 'Success'
    if (req.body.paymentStatus === 'Success') {
      // Get latest payment link for this user
      const payment = await PaymentLink.findOne({ userid: req.params.id }).sort({ createdAt: -1 });
      if (payment && !payment.invoiceId) {
        // Build invoice data
        const invoiceData = {
          invoiceNo: `INV-${Date.now()}`,
          billDate: new Date(),
          userid: user._id,
          billedTo: {
            name: `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim(),
            phone: user.phone || '',
            email: user.email,
            address: user.City,
            stateCode: user.stateCode || ''
          },
          creator: {
            name: "VYOM RESEARCH LLP",
            pan: "AAYFV4090K",
            gstin: "24AAYFV4090K1ZE",
            address: "Shop no. 238 Services, Gujarat",
            stateCode: "24"
          },
          description: payment.plan_name || 'Plan Purchase',
          serviceStartDate: payment.purchase_datetime || new Date(),
          serviceEndDate: payment.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default to 1 year from now
          price: payment.amount,
          transactionId: payment.link_id
        };
        // GST logic
        const taxPercent = 18;
        let total = payment.amount;
        if (user.stateCode && user.stateCode !== "24") {
          // IGST
          const igst = taxPercent;
          const igstAmt = parseFloat(((payment.amount * igst) / 100).toFixed(2));
          invoiceData.igst = igst;
          invoiceData.igstAmt = igstAmt;
          total += igstAmt;
        } else {
          // CGST + SGST
          const cgst = taxPercent / 2;
          const sgst = taxPercent / 2;
          const cgstAmt = parseFloat(((payment.amount * cgst) / 100).toFixed(2));
          const sgstAmt = parseFloat(((payment.amount * sgst) / 100).toFixed(2));
          invoiceData.cgst = cgst;
          invoiceData.cgstAmt = cgstAmt;
          invoiceData.sgst = sgst;
          invoiceData.sgstAmt = sgstAmt;
          total += cgstAmt + sgstAmt;
        }
        invoiceData.total = parseFloat(total.toFixed(2));
        // Save invoice
        const invoice = new Invoice(invoiceData);
        await invoice.save();
        // Generate PDF with invoice number as filename
        const safeInvoiceNo = invoice.invoiceNo.replace(/[^a-zA-Z0-9-]/g, '_');
        const pdfPath = path.join(__dirname, `../invoices/${safeInvoiceNo}.pdf`);
        await generatePDF(invoice, pdfPath);
        invoice.pdfPath = pdfPath;
        await invoice.save();
        // Link invoice to payment
        payment.invoiceId = invoice._id;
        await payment.save();
      }
    }

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteUserById = async (req, res) => {
  try {
    const user = await userService.deleteUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid user ID' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    const paymentDetails = await PaymentLink.find({ userid: { $in: users.map(user => user._id) } })
      .then(details => details.reduce((acc, detail) => ({ ...acc, [detail.userid]: detail }), {}));

    const searchTerm = req.query.term;
    const filteredUsers = users.filter(user => {
      const userPayment = paymentDetails[user._id] || {};
      return (
        (user?.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user?.middleName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user?.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user?.phone || '').includes(searchTerm) ||
        (userPayment?.plan_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (userPayment?.link_id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    });

    const transformedUsers = filteredUsers.map(user => ({
      ...user.toObject(),
      orderId: paymentDetails[user._id]?.link_id || 'N/A',
      selectedPlan: paymentDetails[user._id]?.plan_name || 'N/A',
      paymentStatus: paymentDetails[user._id]?.status || 'PENDING',
      amount: paymentDetails[user._id]?.amount || 0,
      invoiceNo: `INV-${Date.now()}`
    }));

    res.json(transformedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTodayUsers = async (req, res) => {
  try {
    const adminId = req.adminContext?.adminId;
    
    // Super admin sees all today's users, regular admin sees only their users
    const userQuery = req.adminContext?.role === 'superadmin' ? {} : { adminId: adminId };
    const users = await userService.getTodayUsers(userQuery);
    
    res.json({ 
      users, 
      count: users.length,
      adminSpecific: req.adminContext?.role !== 'superadmin' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark KYC as completed and trigger telegram link generation if all steps are done
exports.completeKYC = async (req, res) => {
  try {
    const { phone, userId } = req.body;
    
    if (!phone && !userId) {
      return res.status(400).json({
        success: false,
        error: 'Either phone or userId is required'
      });
    }

    console.log(`📋 KYC completion request for ${phone ? 'phone: ' + phone : 'userId: ' + userId}`);

    // Find user
    let user;
    if (phone) {
      user = await userService.getUserByPhone(phone);
    } else {
      const User = require('../models/user.model');
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Mark user as KYC completed (you may want to add a kycCompleted field to user model)
    // For now, we'll assume KYC is complete if this endpoint is called
    user.kycCompleted = true;
    user.kycCompletedAt = new Date();
    await user.save();

    console.log(`✅ KYC marked as completed for user: ${user._id}`);

    // Check if all required steps are now complete and generate telegram links if ready
    const linkResult = await triggerTelegramLinksIfReady(user._id.toString());

    res.json({
      success: true,
      message: 'KYC completed successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        kycCompleted: user.kycCompleted
      },
      telegramLinks: {
        generated: linkResult.linksGenerated,
        reason: linkResult.reason,
        ...(linkResult.result && { details: linkResult.result })
      }
    });

  } catch (error) {
    console.error('❌ Error completing KYC:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
