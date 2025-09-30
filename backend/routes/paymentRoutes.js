//   // // routes/paymentRoutes.js
//   // const express = require('express');
//   // const { createPaymentLinkWithRetry, checkPaymentStatus, handlePaymentWebhook } = require('../services/cashfreeService');
//   // const PaymentLink = require('../models/paymentLinkModel');
//   // const paymentController = require('../controllers/paymentController');
//   // const axios = require('axios');
//   // const User = require('../models/user.model');
//   // const adminAuth = require('../middlewares/adminAuth');
//   // const injectAdminContext = require('../middlewares/injectAdminContext');
//   // const notificationService = require('../services/notificationService');
//   // const mongoose = require('mongoose');

//   // const router = express.Router();

//   // // Input validation middleware
//   // const validatePaymentRequest = (req, res, next) => {
//   //   const { customer_id, phone, amount, userid } = req.body;

//   //   // Validate required fields
//   //   if (!customer_id || !phone || !amount || !userid) {
//   //     return res.status(400).json({
//   //       success: false,
//   //       message: 'Missing required fields: customer_id, phone, amount, userid'
//   //     });
//   //   }

//   //   // Validate amount is a positive number
//   //   const amountNum = parseFloat(amount);
//   //   if (isNaN(amountNum) || amountNum <= 0) {
//   //     return res.status(400).json({
//   //       success: false,
//   //       message: 'Amount must be a positive number'
//   //     });
//   //   }

//   //   // Validate phone number format (basic validation)
//   //   const phoneRegex = /^[0-9]{10,15}$/;
//   //   if (!phoneRegex.test(phone)) {
//   //     return res.status(400).json({
//   //       success: false,
//   //       message: 'Invalid phone number format'
//   //     });
//   //   }

//   //   // Validate user ID format (MongoDB ObjectId)
//   //   if (!mongoose.Types.ObjectId.isValid(userid)) {
//   //     return res.status(400).json({
//   //       success: false,
//   //       message: 'Invalid user ID format'
//   //     });
//   //   }

//   //   // If we got here, all validations passed
//   //   next();
//   // };

//   // // Apply rate limiting to payment endpoints
//   // const rateLimit = require('express-rate-limit');

//   // const paymentLimiter = rateLimit({
//   //   windowMs: 15 * 60 * 1000, // 15 minutes
//   //   max: 100, // limit each IP to 100 requests per windowMs
//   //   message: {
//   //     success: false,
//   //     message: 'Too many payment requests, please try again later'
//   //   }
//   // });

//   // router.post('/create-payment-link', paymentLimiter, validatePaymentRequest, async (req, res) => {
//   //   const session = await mongoose.startSession();
//   //   try {
//   //     await session.startTransaction();

//   //     let {
//   //       customer_id,
//   //       phone,
//   //       amount,
//   //       plan_id = 'default_plan',
//   //       plan_name = 'Subscription Plan',
//   //       userid,
//   //       groupId,
//   //       bundleId,
//   //       expiry_date,
//   //       duration,
//   //       purchase_datetime
//   //     } = req.body;

//   //     // Convert amount to number and round to 2 decimal places
//   //     amount = parseFloat(amount);

//   //     console.log("⚡-------------------------⚡");
//   //     console.log("📞 Phone:", phone);

//   //     // Check existing plan by phone (not necessarily within session - read-only)
//   //     const existingPaymentLink = await PaymentLink.findOne({ phone });
//   //     console.log("🔍 Existing Payment Link: ", existingPaymentLink);
//   //     if (existingPaymentLink) {
//   //       const newExpiryDateLog = new Date(existingPaymentLink.expiry_date);
//   //       newExpiryDateLog.setDate(newExpiryDateLog.getDate() + 30);
//   //       existingPaymentLink.expiry_date = newExpiryDateLog;
//   //       // existingPaymentLink.isExtension = true;
//   //       await existingPaymentLink.save();
//   //       console.log("✅ Update Data: ", existingPaymentLink);
//   //       console.log("✅ Expiry Date Updated To: ", existingPaymentLink.expiry_date);
//   //     } else {
//   //       console.log("❌ No existing plan found. 🆕 Creating new plan...");
//   //     }

//   //     console.log("⚡-------------------------⚡");

//   //     // Check for duplicate pending payments within last 24 hours (session-scoped)
//   //     const existingPayment = await PaymentLink.findOne({
//   //       phone: phone,
//   //       status: 'PENDING',
//   //       createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
//   //     }).session(session);

//   //     if (existingPayment) {
//   //       await session.abortTransaction();
//   //       return res.status(400).json({
//   //         success: false,
//   //         message: 'A pending payment already exists for this phone number',
//   //         existingPaymentId: existingPayment._id
//   //       });
//   //     }

//   //     console.log('Received payment request:', {
//   //       customer_id,
//   //       phone,
//   //       amount,
//   //       plan_id,
//   //       plan_name,
//   //       userid,
//   //       purchase_datetime,
//   //       expiry_date,
//   //       duration
//   //     });

//   //     // Enhanced validation
//   //     const missingFields = [];
//   //     if (!customer_id) missingFields.push('customer_id');
//   //     if (!phone) missingFields.push('phone');
//   //     if (!amount && amount !== 0) missingFields.push('amount');
//   //     if (!userid) missingFields.push('userid');
//   //     if (!expiry_date) missingFields.push('expiry_date');
//   //     if (!duration) missingFields.push('duration');

//   //     if (missingFields.length > 0) {
//   //       // Note: using template literal for interpolation
//   //       return res.status(400).json({
//   //         success: false,
//   //         message: `Missing required fields: ${missingFields.join(', ')}`,
//   //         receivedData: { customer_id, phone, amount, userid, expiry_date, duration }
//   //       });
//   //     }

//   //     if (amount <= 0) {
//   //       return res.status(400).json({
//   //         success: false,
//   //         message: 'Amount must be greater than 0',
//   //         receivedAmount: amount
//   //       });
//   //     }

//   //     // Get adminId and groupId from plan first (if provided)
//   //     let adminId = null;

//   //     if (plan_id) {
//   //       try {
//   //         const Plan = require('../models/plan');
//   //         const plan = await Plan.findById(plan_id).session(session);
//   //         if (plan) {
//   //           adminId = plan.adminId;
//   //           // override groupId only if plan has one
//   //           if (plan.groupId) groupId = plan.groupId;
//   //         } else {
//   //           console.warn(`Plan not found for ID: ${plan_id}`);
//   //         }
//   //       } catch (error) {
//   //         console.error('Error fetching plan for adminId:', error);
//   //       }
//   //     }

//   //     if (!adminId) {
//   //       console.warn('No adminId found for payment - this may cause attribution issues');
//   //     }

//   //     // Check for existing subscription and handle extension
//   //     let isExtension = false;
//   //     let newExpiryDate = expiry_date ? new Date(expiry_date) : new Date();
//   //     // Add 30 days to newExpiryDate when it comes from plans
//   //     if (expiry_date) {
//   //       newExpiryDate.setDate(newExpiryDate.getDate() + 30);
//   //       console.log(`📅 Added 30 days to plan expiry date: ${expiry_date} -> ${newExpiryDate}`);
//   //     }

//   //     if (groupId) {
//   //       try {
//   //         const existingPayment = await PaymentLink.findOne({
//   //           phone: phone,
//   //           groupId: groupId,
//   //           status: 'SUCCESS'
//   //         }).sort({ expiry_date: -1 }).session(session);

//   //         if (existingPayment) {
//   //           const now = new Date();
//   //           const existingExpiry = new Date(existingPayment.expiry_date);

//   //           // If existing subscription is still active, extend from its expiry date
//   //           if (existingExpiry > now) {
//   //             console.log('🔄 Extending active subscription');
//   //             isExtension = true;

//   //             // Calculate new expiry by adding duration to existing expiry
//   //             const durationStr = (duration || '').toString().toLowerCase();
//   //             const durationDays = durationStr.includes('month') ? 30 :
//   //               durationStr.includes('year') ? 365 :
//   //                 parseInt(duration) || 30;

//   //             newExpiryDate = new Date(existingExpiry);
//   //             newExpiryDate.setDate(newExpiryDate.getDate() + durationDays);

//   //             console.log(`Extension: Old expiry: ${existingExpiry}, New expiry: ${newExpiryDate}`);
//   //           } else {
//   //             // If expired, extend from current date
//   //             console.log('🔄 Renewing expired subscription');
//   //             isExtension = true;
//   //             const durationStr = (duration || '').toString().toLowerCase();
//   //             const durationDays = durationStr.includes('month') ? 30 :
//   //               durationStr.includes('year') ? 365 :
//   //                 parseInt(duration) || 30;
//   //             newExpiryDate = new Date();
//   //             newExpiryDate.setDate(newExpiryDate.getDate() + durationDays);
//   //           }
//   //         }

//   //         // Smart pending payment handling
//   //         const pendingPayments = await PaymentLink.find({
//   //           phone: phone,
//   //           status: 'PENDING'
//   //         }).sort({ createdAt: -1 }).session(session);

//   //         if (pendingPayments.length > 0) {
//   //           const currentTime = new Date();
//   //           const thirtyMinutesAgo = new Date(currentTime.getTime() - 30 * 60 * 1000);

//   //           // Auto-expire old pending payments (older than 30 minutes)
//   //           const expiredPayments = pendingPayments.filter(p => p.createdAt < thirtyMinutesAgo);
//   //           if (expiredPayments.length > 0) {
//   //             await PaymentLink.updateMany(
//   //               { _id: { $in: expiredPayments.map(p => p._id) } },
//   //               {
//   //                 status: 'EXPIRED',
//   //                 statusReason: 'Auto-expired after 30 minutes of inactivity',
//   //                 expiredAt: currentTime
//   //               },
//   //               { session }
//   //             );
//   //             console.log(`🧹 Auto-expired ${expiredPayments.length} stale pending payments for phone: ${phone}`);
//   //           }

//   //           // Check for active pending payments (within 30 minutes)
//   //           const activePendingPayments = pendingPayments.filter(p => p.createdAt >= thirtyMinutesAgo);

//   //           if (activePendingPayments.length > 0) {
//   //             // Check if pending payment is for the SAME bundle
//   //             const sameBundlePending = activePendingPayments.find(p =>
//   //               p.groupId && groupId && p.groupId.toString() === groupId.toString()
//   //             );

//   //             if (sameBundlePending) {
//   //               // For same bundle: provide options to continue or cancel
//   //               await session.abortTransaction();
//   //               return res.status(409).json({
//   //                 success: false,
//   //                 message: 'You have a pending payment for this bundle.',
//   //                 code: 'PENDING_SAME_BUNDLE',
//   //                 pendingPayment: {
//   //                   id: sameBundlePending._id,
//   //                   linkUrl: sameBundlePending.link_url,
//   //                   amount: sameBundlePending.amount,
//   //                   planName: sameBundlePending.plan_name,
//   //                   createdAt: sameBundlePending.createdAt,
//   //                   timeRemaining: Math.max(0, 30 - Math.floor((new Date() - sameBundlePending.createdAt) / (60 * 1000)))
//   //                 },
//   //                 actions: {
//   //                   complete: {
//   //                     url: sameBundlePending.link_url,
//   //                     label: 'Complete Payment'
//   //                   },
//   //                   cancel: {
//   //                     url: `/api/payment/cancel/${sameBundlePending._id}`,
//   //                     label: 'Cancel & Start New'
//   //                   }
//   //                 }
//   //               });
//   //             } else {
//   //               // For different bundle: allow with warning about existing pending payments
//   //               console.log('⚠ User has pending payment for different bundle, allowing new payment creation');
//   //               console.log(`Existing pending: ${activePendingPayments.map(p => p.plan_name).join(', ')}`);
//   //               console.log(`New payment for: ${plan_name}`);
//   //             }
//   //           }
//   //         }

//   //       } catch (checkError) {
//   //         console.error('Error checking existing purchase:', checkError);
//   //         // Don't fail the request if check fails, just log and continue
//   //       }
//   //     }

//   //     console.log('Creating payment link with Cashfree...');
//   //     const paymentResponse = await createPaymentLinkWithRetry({
//   //       customer_id,
//   //       phone,
//   //       amount,
//   //       plan_id,
//   //       plan_name
//   //     });

//   //     console.log('Payment link created successfully:', {
//   //       link_id: paymentResponse.link_id,
//   //       link_url: paymentResponse.link_url
//   //     });

//   //     console.log('Saving payment to database...');
//   //     const newPayment = new PaymentLink({
//   //       userid,
//   //       link_id: paymentResponse.link_id,
//   //       link_url: paymentResponse.link_url,
//   //       customer_id,
//   //       phone,
//   //       amount,
//   //       plan_id,
//   //       plan_name,
//   //       status: 'PENDING',
//   //       purchase_datetime: purchase_datetime || new Date().toISOString(),
//   //       expiry_date: newExpiryDate, // Use calculated expiry date for extensions
//   //       duration,
//   //       adminId: adminId,
//   //       groupId: groupId,
//   //       adminCommission: amount * 1.0, // 100% commission by default
//   //       commissionRate: 100,
//   //       isExtension: isExtension // Flag to indicate if this is an extension
//   //     });

//   //     const savedPayment = await newPayment.save({ session });
//   //     console.log('Payment saved to database:', savedPayment._id);

//   //     // Send notification to admin about new payment link
//   //     try {
//   //       notificationService.notifyNewPaymentLink({
//   //         link_id: savedPayment.link_id,
//   //         amount: savedPayment.amount,
//   //         customer_id: savedPayment.customer_id,
//   //         phone: savedPayment.phone,
//   //         plan_name: savedPayment.plan_name,
//   //         adminId: savedPayment.adminId
//   //       });
//   //     } catch (nErr) {
//   //       console.warn('Notification failed:', nErr.message);
//   //     }

//   //     // Commit the transaction
//   //     await session.commitTransaction();

//   //     res.json({
//   //       success: true,
//   //       paymentLink: paymentResponse.link_url,
//   //       orderId: paymentResponse.link_id,
//   //       message: 'Payment link created and saved',
//   //       paymentId: savedPayment._id,
//   //       expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
//   //     });

//   //   } catch (error) {
//   //     // Abort transaction on error
//   //     try {
//   //       if (session.inTransaction()) {
//   //         await session.abortTransaction();
//   //       }
//   //     } catch (abortErr) {
//   //       console.error('Error aborting transaction:', abortErr);
//   //     }

//   //     console.error('Payment link creation error:', {
//   //       message: error.message,
//   //       stack: error.stack,
//   //       endpoint: '/create-payment-link',
//   //       timestamp: new Date().toISOString()
//   //     });

//   //     // Log full error in development, generic message in production
//   //     const errorMessage = process.env.NODE_ENV === 'development'
//   //       ? error.message
//   //       : 'Failed to process payment request';

//   //     // More specific error messages based on error type
//   //     let statusCode = 500;
//   //     if (error.name === 'ValidationError') {
//   //       statusCode = 400;
//   //     } else if (error.name === 'MongoError' && error.code === 11000) {
//   //       statusCode = 409; // Conflict
//   //     }

//   //     return res.status(statusCode).json({
//   //       success: false,
//   //       message: errorMessage,
//   //       code: error.code,
//   //       ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
//   //     });
//   //   } finally {
//   //     try {
//   //       session.endSession();
//   //     } catch (endErr) {
//   //       console.error('Error ending session:', endErr);
//   //     }
//   //   }
//   // });

//   // // Add a new endpoint to check subscription status
//   // router.get('/subscription-status/:userId', async (req, res) => {
//   //   try {
//   //     const { userId } = req.params;

//   //     const activeSubscription = await PaymentLink.findOne({
//   //       userid: userId,
//   //       status: 'SUCCESS',
//   //       expiry_date: { $gt: new Date() }
//   //     }).sort({ expiry_date: -1 });

//   //     if (!activeSubscription) {
//   //       return res.json({
//   //         success: true,
//   //         hasActiveSubscription: false,
//   //         message: 'No active subscription found'
//   //       });
//   //     }

//   //     res.json({
//   //       success: true,
//   //       hasActiveSubscription: true,
//   //       subscription: {
//   //         planName: activeSubscription.plan_name,
//   //         expiryDate: activeSubscription.expiry_date,
//   //         duration: activeSubscription.duration
//   //       }
//   //     });

//   //   } catch (error) {
//   //     console.error('Subscription status check error:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Failed to check subscription status',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // Check payment status
//   // router.get('/status/by-link/:linkId', async (req, res) => {
//   //   try {
//   //     const { linkId } = req.params;

//   //     if (!linkId) {
//   //       return res.status(400).json({
//   //         success: false,
//   //         message: 'Link ID is required'
//   //       });
//   //     }

//   //     const paymentStatus = await checkPaymentStatus(linkId);

//   //     res.json({
//   //       success: true,
//   //       data: paymentStatus
//   //     });

//   //   } catch (error) {
//   //     console.error('Status check error:', error.message);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Failed to check payment status',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // Get payment details by order ID (for payment success flow)
//   // router.get('/details/:orderId', async (req, res) => {
//   //   try {
//   //     const { orderId } = req.params;

//   //     if (!orderId) {
//   //       return res.status(400).json({
//   //         success: false,
//   //         message: 'Order ID is required'
//   //       });
//   //     }

//   //     // Find payment by link_id (which is the orderId from Cashfree)
//   //     const payment = await PaymentLink.findOne({ link_id: orderId })
//   //       .populate('plan_id');

//   //     if (!payment) {
//   //       return res.status(404).json({
//   //         success: false,
//   //         message: 'Payment not found'
//   //       });
//   //     }

//   //     res.json({
//   //       success: true,
//   //       orderId: payment.link_id,
//   //       userId: payment.userid,
//   //       planId: payment.plan_id,
//   //       planName: payment.plan_name,
//   //       amount: payment.amount,
//   //       status: payment.status,
//   //       bundleId: payment.groupId, // This should contain the bundle/group ID
//   //       expiryDate: payment.expiry_date,
//   //       duration: payment.duration
//   //     });

//   //   } catch (error) {
//   //     console.error('Error fetching payment details:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Error fetching payment details',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // Get subscription status
//   // router.get('/status/by-user/:userId', async (req, res) => {
//   //   try {
//   //     const { userId } = req.params;

//   //     // Find the most recent payment for this user
//   //     const payment = await PaymentLink.findOne({ userid: userId })
//   //       .sort({ expiry_date: -1 })
//   //       .populate('plan_id');

//   //     if (!payment) {
//   //       return res.status(404).json({ message: 'No subscription found' });
//   //     }

//   //     res.json({
//   //       plan_name: payment.plan_name,
//   //       expiry_date: payment.expiry_date,
//   //       status: new Date(payment.expiry_date) > new Date() ? 'active' : 'expired'
//   //     });
//   //   } catch (error) {
//   //     console.error('Error fetching subscription status:', error);
//   //     res.status(500).json({ message: 'Error fetching subscription status' });
//   //   }
//   // });

//   // // Update user's Telegram User ID
//   // router.post('/update-telegram-id', async (req, res) => {
//   //   try {
//   //     const { userId, telegramUserId } = req.body;

//   //     if (!userId || !telegramUserId) {
//   //       return res.status(400).json({
//   //         success: false,
//   //         message: 'Both userId and telegramUserId are required'
//   //       });
//   //     }

//   //     // Update user's telegramUserId
//   //     const updatedUser = await User.findByIdAndUpdate(
//   //       userId,
//   //       { telegramUserId: telegramUserId.toString() },
//   //       { new: true }
//   //     );

//   //     if (!updatedUser) {
//   //       return res.status(404).json({
//   //         success: false,
//   //         message: 'User not found'
//   //       });
//   //     }

//   //     console.log(`Updated telegramUserId for user ${userId}: ${telegramUserId}`);

//   //     res.json({
//   //       success: true,
//   //       message: 'Telegram User ID updated successfully',
//   //       user: {
//   //         id: updatedUser._id,
//   //         telegramUserId: updatedUser.telegramUserId
//   //       }
//   //     });

//   //   } catch (error) {
//   //     console.error('Error updating telegram user ID:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Error updating telegram user ID',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // Get user's pending payments with detailed info
//   // router.get('/pending/:phone', async (req, res) => {
//   //   try {
//   //     const { phone } = req.params;
//   //     console.log(`📋 Fetching pending payments for phone: ${phone}`);

//   //     // Find all pending payments for this phone number
//   //     const pendingPayments = await PaymentLink.find({
//   //       phone: phone,
//   //       status: 'PENDING'
//   //     }).populate('plan_id').sort({ createdAt: -1 });

//   //     if (pendingPayments.length === 0) {
//   //       return res.json({
//   //         success: true,
//   //         message: 'No pending payments found',
//   //         pendingPayments: []
//   //       });
//   //     }

//   //     const currentTime = new Date();
//   //     const thirtyMinutesAgo = new Date(currentTime.getTime() - 30 * 60 * 1000);

//   //     // Categorize payments by age and bundle
//   //     const categorizedPayments = pendingPayments.map(payment => {
//   //       const ageInMinutes = Math.floor((currentTime - payment.createdAt) / (60 * 1000));
//   //       const isStale = payment.createdAt < thirtyMinutesAgo;

//   //       return {
//   //         id: payment._id,
//   //         linkId: payment.link_id,
//   //         linkUrl: payment.link_url,
//   //         amount: payment.amount,
//   //         planName: payment.plan_name,
//   //         bundleId: payment.groupId,
//   //         createdAt: payment.createdAt,
//   //         ageInMinutes,
//   //         isStale,
//   //         timeRemaining: isStale ? 0 : Math.max(0, 30 - ageInMinutes),
//   //         actions: {
//   //           complete: {
//   //             url: payment.link_url,
//   //             label: 'Complete Payment',
//   //             enabled: !isStale
//   //           },
//   //           cancel: {
//   //             url: `/api/payment/cancel/${payment._id}`,
//   //             label: 'Cancel Payment',
//   //             enabled: true
//   //           }
//   //         }
//   //       };
//   //     });

//   //     // Group by bundle for better UX
//   //     const byBundle = {};
//   //     categorizedPayments.forEach(payment => {
//   //       const bundleKey = payment.bundleId ? payment.bundleId.toString() : 'unknown';
//   //       if (!byBundle[bundleKey]) {
//   //         byBundle[bundleKey] = [];
//   //       }
//   //       byBundle[bundleKey].push(payment);
//   //     });

//   //     res.json({
//   //       success: true,
//   //       message: `Found ${pendingPayments.length} pending payments`,
//   //       pendingPayments: categorizedPayments,
//   //       groupedByBundle: byBundle,
//   //       summary: {
//   //         total: pendingPayments.length,
//   //         active: categorizedPayments.filter(p => !p.isStale).length,
//   //         stale: categorizedPayments.filter(p => p.isStale).length
//   //       }
//   //     });

//   //   } catch (error) {
//   //     console.error('❌ Error fetching pending payments:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Failed to fetch pending payments',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // Auto-cleanup stale pending payments for a user
//   // router.post('/cleanup-stale/:phone', async (req, res) => {
//   //   try {
//   //     const { phone } = req.params;
//   //     console.log(`🧹 Starting cleanup of stale pending payments for phone: ${phone}`);

//   //     const currentTime = new Date();
//   //     const thirtyMinutesAgo = new Date(currentTime.getTime() - 30 * 60 * 1000);

//   //     // Find and update stale pending payments
//   //     const result = await PaymentLink.updateMany(
//   //       {
//   //         phone: phone,
//   //         status: 'PENDING',
//   //         createdAt: { $lt: thirtyMinutesAgo }
//   //       },
//   //       {
//   //         status: 'EXPIRED',
//   //         statusReason: 'Auto-expired due to inactivity (30+ minutes)',
//   //         expiredAt: currentTime
//   //       }
//   //     );

//   //     console.log(`✅ Cleanup completed: ${result.modifiedCount} payments expired`);

//   //     res.json({
//   //       success: true,
//   //       message: `Cleaned up ${result.modifiedCount} stale pending payments`,
//   //       modifiedCount: result.modifiedCount
//   //     });

//   //   } catch (error) {
//   //     console.error('❌ Error during cleanup:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Failed to cleanup stale payments',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // Check if user can proceed with new payment (smart validation)
//   // router.post('/can-proceed', async (req, res) => {
//   //   try {
//   //     const { phone, bundleId, planName } = req.body;

//   //     if (!phone) {
//   //       return res.status(400).json({
//   //         success: false,
//   //         message: 'Phone number is required'
//   //       });
//   //     }

//   //     console.log(`🔍 Checking payment eligibility for phone: ${phone}, bundle: ${bundleId}`);

//   //     // Auto-cleanup stale payments first
//   //     const currentTime = new Date();
//   //     const thirtyMinutesAgo = new Date(currentTime.getTime() - 30 * 60 * 1000);

//   //     await PaymentLink.updateMany(
//   //       {
//   //         phone: phone,
//   //         status: 'PENDING',
//   //         createdAt: { $lt: thirtyMinutesAgo }
//   //       },
//   //       {
//   //         status: 'EXPIRED',
//   //         statusReason: 'Auto-expired during eligibility check',
//   //         expiredAt: currentTime
//   //       }
//   //     );

//   //     // Check for active pending payments
//   //     const activePendingPayments = await PaymentLink.find({
//   //       phone: phone,
//   //       status: 'PENDING',
//   //       createdAt: { $gte: thirtyMinutesAgo }
//   //     });

//   //     if (activePendingPayments.length === 0) {
//   //       return res.json({
//   //         success: true,
//   //         canProceed: true,
//   //         message: 'Ready to create new payment',
//   //         conflicts: []
//   //       });
//   //     }

//   //     // Check for same-bundle conflicts
//   //     const sameBundleConflicts = activePendingPayments.filter(p =>
//   //       bundleId && p.groupId && p.groupId.toString() === bundleId.toString()
//   //     );

//   //     if (sameBundleConflicts.length > 0) {
//   //       const conflict = sameBundleConflicts[0];
//   //       const ageInMinutes = Math.floor((currentTime - conflict.createdAt) / (60 * 1000));

//   //       return res.json({
//   //         success: true,
//   //         canProceed: false,
//   //         message: `You have a pending payment for this bundle (${conflict.plan_name})`,
//   //         conflicts: [{
//   //           type: 'same_bundle',
//   //           payment: {
//   //             id: conflict._id,
//   //             linkUrl: conflict.link_url,
//   //             amount: conflict.amount,
//   //             planName: conflict.plan_name,
//   //             ageInMinutes,
//   //             timeRemaining: Math.max(0, 30 - ageInMinutes)
//   //           },
//   //           actions: {
//   //             complete: {
//   //               url: conflict.link_url,
//   //               label: 'Complete Existing Payment'
//   //             },
//   //             cancel: {
//   //               url: `/api/payment/cancel/${conflict._id}`,
//   //               label: 'Cancel & Start New'
//   //             }
//   //           }
//   //         }],
//   //         recommendation: 'complete_existing'
//   //       });
//   //     }

//   //     // Different bundle - allow with warning
//   //     return res.json({
//   //       success: true,
//   //       canProceed: true,
//   //       message: 'Can proceed, but you have pending payments for other bundles',
//   //       conflicts: activePendingPayments.map(p => ({
//   //         type: 'different_bundle',
//   //         payment: {
//   //           id: p._id,
//   //           amount: p.amount,
//   //           planName: p.plan_name,
//   //           ageInMinutes: Math.floor((currentTime - p.createdAt) / (60 * 1000))
//   //         }
//   //       })),
//   //       recommendation: 'proceed_with_warning'
//   //     });

//   //   } catch (error) {
//   //     console.error('❌ Error checking payment eligibility:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Failed to check payment eligibility',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // Cancel a pending payment
//   // router.delete('/cancel/:paymentId', async (req, res) => {
//   //   try {
//   //     const { paymentId } = req.params;
//   //     console.log(`🗑 Canceling payment request for ID: ${paymentId}`);

//   //     // Find the payment
//   //     const payment = await PaymentLink.findById(paymentId);
//   //     if (!payment) {
//   //       return res.status(404).json({
//   //         success: false,
//   //         message: 'Payment not found'
//   //       });
//   //     }

//   //     // Only allow canceling PENDING payments
//   //     if (payment.status !== 'PENDING') {
//   //       return res.status(400).json({
//   //         success: false,
//   //         message: 'Can only cancel pending payments'
//   //       });
//   //     }

//   //     // Update payment status to EXPIRED (closest to canceled in the enum)
//   //     payment.status = 'EXPIRED';
//   //     payment.canceledAt = new Date();
//   //     await payment.save();

//   //     console.log(`✅ Payment ${paymentId} canceled successfully`);

//   //     res.json({
//   //       success: true,
//   //       message: 'Payment canceled successfully',
//   //       payment: {
//   //         id: payment._id,
//   //         status: payment.status,
//   //         canceledAt: payment.canceledAt
//   //       }
//   //     });
//   //   } catch (error) {
//   //     console.error('❌ Error canceling payment:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Failed to cancel payment',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // Mark payment as successful (for handling cases where user reaches success page before webhook)
//   // router.post('/mark-success/:orderId', async (req, res) => {
//   //   try {
//   //     const { orderId } = req.params;
//   //     console.log(`🔄 Manual success marking requested for order: ${orderId}`);

//   //     // Find the payment by order ID
//   //     const payment = await PaymentLink.findOne({
//   //       $or: [
//   //         { link_id: orderId },
//   //         { order_id: orderId }
//   //       ]
//   //     });

//   //     if (!payment) {
//   //       return res.status(404).json({
//   //         success: false,
//   //         message: 'Payment not found'
//   //       });
//   //     }

//   //     // Only update if payment is not already SUCCESS
//   //     if (payment.status !== 'SUCCESS') {
//   //       // Update payment status
//   //       payment.status = 'SUCCESS';
//   //       await payment.save();

//   //       console.log(`✅ Payment ${orderId} manually marked as SUCCESS`);

//   //       // Trigger the same success handling as webhook would
//   //       try {
//   //         const { handlePaymentSuccess } = require('../services/cashfreeService');
//   //         await handlePaymentSuccess({
//   //           order: {
//   //             order_id: orderId
//   //           }
//   //         });
//   //         console.log('✅ Payment success handling completed');
//   //       } catch (handlerError) {
//   //         console.warn('⚠ Payment success handling failed:', handlerError.message);
//   //       }

//   //       res.json({
//   //         success: true,
//   //         message: 'Payment marked as successful',
//   //         payment: {
//   //           id: payment._id,
//   //           status: payment.status,
//   //           orderId: orderId
//   //         }
//   //       });
//   //     } else {
//   //       res.json({
//   //         success: true,
//   //         message: 'Payment already marked as successful',
//   //         payment: {
//   //           id: payment._id,
//   //           status: payment.status,
//   //           orderId: orderId
//   //         }
//   //       });
//   //     }
//   //   } catch (error) {
//   //     console.error('❌ Error marking payment as successful:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Failed to mark payment as successful',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // Webhook endpoint with security verification
//   // router.post('/webhook', async (req, res) => {
//   //   try {
//   //     const webhookData = req.body;

//   //     // Get signature and timestamp from headers
//   //     const signature = req.headers['x-cashfree-signature'];
//   //     const timestamp = req.headers['x-cashfree-timestamp'];
//   //     const rawPayload = JSON.stringify(webhookData);

//   //     console.log('Webhook received with headers:', {
//   //       signature: signature ? 'present' : 'missing',
//   //       timestamp: timestamp ? timestamp : 'missing',
//   //       contentType: req.headers['content-type']
//   //     });

//   //     if (!signature || !timestamp) {
//   //       console.error('Missing required webhook headers');
//   //       return res.status(400).json({
//   //         success: false,
//   //         message: 'Missing required webhook headers'
//   //       });
//   //     }

//   //     const result = await handlePaymentWebhook(webhookData, rawPayload, signature, timestamp);

//   //     res.status(200).json({
//   //       success: true,
//   //       message: 'Webhook processed successfully',
//   //       ...result
//   //     });
//   //   } catch (error) {
//   //     console.error('Webhook error:', error.message);

//   //     // Return specific error status for security failures
//   //     if (error.message && (error.message.includes('signature verification failed') ||
//   //       error.message.includes('timestamp verification failed'))) {
//   //       return res.status(401).json({
//   //         success: false,
//   //         message: 'Webhook verification failed'
//   //       });
//   //     }

//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Webhook processing failed'
//   //     });
//   //   }
//   // });

//   // // Admin-specific analytics endpoints
//   // router.get('/total-revenue', adminAuth, injectAdminContext, paymentController.getTotalRevenue);
//   // router.get('/total-transactions', adminAuth, injectAdminContext, paymentController.getTotalTransactions);
//   // router.get('/active-users', adminAuth, injectAdminContext, paymentController.getActiveUsers);
//   // router.get('/recent-successful', adminAuth, injectAdminContext, paymentController.getRecentSuccessfulTransactions);

//   // // Test endpoint to check Cashfree API configuration
//   // router.get('/test-config', async (req, res) => {
//   //   try {
//   //     const config = {
//   //       CASHFREE_BASE_URL: process.env.CASHFREE_BASE_URL,
//   //       CASHFREE_CLIENT_ID: process.env.CASHFREE_CLIENT_ID ? 'SET' : 'MISSING',
//   //       CASHFREE_CLIENT_SECRET: process.env.CASHFREE_CLIENT_SECRET ? 'SET' : 'MISSING',
//   //       FRONTEND_URL: process.env.FRONTEND_URL,
//   //       BACKEND_URL: process.env.BACKEND_URL,
//   //       NODE_ENV: process.env.NODE_ENV
//   //     };

//   //     // Test if we can reach the Cashfree API - Skip actual API call for now
//   //     let apiTest = 'Configuration appears valid';
//   //     if (!process.env.CASHFREE_BASE_URL || !process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
//   //       apiTest = 'Missing required configuration - check environment variables';
//   //     } else {
//   //       // Just validate the configuration format without making API call
//   //       if (!process.env.CASHFREE_CLIENT_ID.startsWith('TEST') && !process.env.CASHFREE_CLIENT_ID.startsWith('CF')) {
//   //         apiTest = 'Invalid Client ID format';
//   //       } else if (!process.env.CASHFREE_CLIENT_SECRET.startsWith('cfsk_')) {
//   //         apiTest = 'Invalid Client Secret format';
//   //       } else {
//   //         apiTest = 'Configuration validated - ready for payment processing';
//   //       }
//   //     }

//   //     res.json({
//   //       success: true,
//   //       config,
//   //       apiTest,
//   //       timestamp: new Date().toISOString()
//   //     });
//   //   } catch (error) {
//   //     res.status(500).json({
//   //       success: false,
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // Test endpoint to create a minimal payment link
//   // router.post('/test-create-link', async (req, res) => {
//   //   try {
//   //     const { customer_id, phone, amount } = req.body;

//   //     if (!customer_id || !phone || !amount) {
//   //       return res.status(400).json({
//   //         success: false,
//   //         message: 'Missing required fields: customer_id, phone, amount'
//   //       });
//   //     }

//   //     console.log('Testing payment link creation with:', { customer_id, phone, amount });

//   //     const testPaymentData = {
//   //       customer_id,
//   //       phone,
//   //       amount: parseFloat(amount),
//   //       plan_id: 'test-plan',
//   //       plan_name: 'Test Plan'
//   //     };

//   //     const paymentResponse = await createPaymentLinkWithRetry(testPaymentData, 1); // Only 1 retry for testing

//   //     res.json({
//   //       success: true,
//   //       paymentLink: paymentResponse.link_url,
//   //       orderId: paymentResponse.link_id,
//   //       message: 'Test payment link created successfully'
//   //     });

//   //   } catch (error) {
//   //     console.error('Test payment link creation error:', error.message);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Test payment link creation failed',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // Payment cleanup management endpoints (admin only)
//   // router.get('/cleanup/stats', adminAuth, async (req, res) => {
//   //   try {
//   //     const paymentCleanupService = require('../services/paymentCleanupService');
//   //     const stats = paymentCleanupService.getStats();
//   //     const pendingSummary = await paymentCleanupService.getPendingPaymentsSummary();
//   //     const healthCheck = paymentCleanupService.healthCheck();

//   //     res.json({
//   //       success: true,
//   //       cleanup: {
//   //         stats,
//   //         pendingSummary,
//   //         healthCheck
//   //       }
//   //     });
//   //   } catch (error) {
//   //     console.error('❌ Error getting cleanup stats:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Failed to get cleanup statistics',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // router.post('/cleanup/force', adminAuth, async (req, res) => {
//   //   try {
//   //     const paymentCleanupService = require('../services/paymentCleanupService');
//   //     console.log('🔧 Admin triggered manual payment cleanup');

//   //     const result = await paymentCleanupService.forceCleanup();

//   //     res.json({
//   //       success: true,
//   //       message: 'Manual cleanup completed',
//   //       result
//   //     });
//   //   } catch (error) {
//   //     console.error('❌ Error during manual cleanup:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Manual cleanup failed',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // router.post('/cleanup/start', adminAuth, async (req, res) => {
//   //   try {
//   //     const paymentCleanupService = require('../services/paymentCleanupService');
//   //     paymentCleanupService.startAutoCleanup();

//   //     res.json({
//   //       success: true,
//   //       message: 'Payment cleanup service started',
//   //       stats: paymentCleanupService.getStats()
//   //     });
//   //   } catch (error) {
//   //     console.error('❌ Error starting cleanup service:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Failed to start cleanup service',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // router.post('/cleanup/stop', adminAuth, async (req, res) => {
//   //   try {
//   //     const paymentCleanupService = require('../services/paymentCleanupService');
//   //     paymentCleanupService.stopAutoCleanup();

//   //     res.json({
//   //       success: true,
//   //       message: 'Payment cleanup service stopped',
//   //       stats: paymentCleanupService.getStats()
//   //     });
//   //   } catch (error) {
//   //     console.error('❌ Error stopping cleanup service:', error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: 'Failed to stop cleanup service',
//   //       error: error.message
//   //     });
//   //   }
//   // });

//   // // New endpoints for dynamic fee management
//   // router.post('/process-with-fee', adminAuth, paymentController.processPaymentWithFee);
//   // router.patch('/:paymentId/update-with-fee', adminAuth, paymentController.updatePaymentWithFee);
//   // router.get('/:paymentId/fee-details', adminAuth, paymentController.getPaymentWithFeeDetails);
//   // router.post('/bulk-recalculate-fees', adminAuth, paymentController.bulkRecalculateFees);
//   // router.post('/:paymentId/recalculate-fees', adminAuth, paymentController.recalculatePaymentFees);

//   // module.exports = router;
// // const express = require('express');
// // const { createPaymentLink, createPaymentLinkWithRetry, checkPaymentStatus, handlePaymentWebhook } = require('../services/cashfreeService');
// // const PaymentLink = require('../models/paymentLinkModel');

// // const router = express.Router();

// // // Create payment link endpoint
// // // router.post('/create-payment-link', async (req, res) => {
// // //   try {
// // //     const { customer_id, phone, amount, plan_id, plan_name } = req.body;
// // //     console.log(req.body);
    

// // //     // Validation
// // //     if (!customer_id || !phone || !amount) {
// // //       return res.status(400).json({
// // //         success: false,
// // //         message: 'Missing required fields: customer_id, phone, amount'
// // //       });
// // //     }

// // //     if (amount <= 0) {
// // //       return res.status(400).json({
// // //         success: false,
// // //         message: 'Amount must be greater than 0'
// // //       });
// // //     }

// // //     // Create payment link
// // //     const paymentResponse = await createPaymentLinkWithRetry({
// // //       customer_id,
// // //       phone,
// // //       amount,
// // //       plan_id,
// // //       plan_name
// // //     });

// // //     res.json({
// // //       success: true,
// // //       paymentLink: paymentResponse.link_url,
// // //       orderId: paymentResponse.link_id,
// // //       message: 'Payment link created successfully'
// // //     });

// // //   } catch (error) {
// // //     console.error('Payment link creation error:', error.message);
// // //     res.status(500).json({
// // //       success: false,
// // //       message: 'Failed to create payment link',
// // //       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
// // //     });
// // //   }
// // // });
// // router.post('/create-payment-link', async (req, res) => {
// //   try {
// //     const { customer_id, phone, amount, plan_id, plan_name, userid } = req.body;

// //     // Validation
// //     if (!customer_id || !phone || !amount || !userid) {
// //       return res.status(400).json({
// //         success: false,
// //         message: 'Missing required fields: customer_id, phone, amount, userid'
// //       });
// //     }

// //     if (amount <= 0) {
// //       return res.status(400).json({
// //         success: false,
// //         message: 'Amount must be greater than 0'
// //       });
// //     }

// //     // Create payment link using Cashfree
// //     const paymentResponse = await createPaymentLinkWithRetry({
// //       customer_id,
// //       phone,
// //       amount,
// //       plan_id,
// //       plan_name
// //     });

// //     // Save in MONGODB
// //     const newPayment = new PaymentLink({
// //       userid,
// //       link_id: paymentResponse.link_id,
// //       link_url: paymentResponse.link_url,
// //       customer_id,
// //       phone,
// //       amount,
// //       plan_id,
// //       plan_name,
// //       status: 'PENDING'
// //     });

// //     await newPayment.save();

// //     // Response
// //     res.json({
// //       success: true,
// //       paymentLink: paymentResponse.link_url,
// //       orderId: paymentResponse.link_id,
// //       message: 'Payment link created and saved successfully'
// //     });

// //   } catch (error) {
// //     console.error('Payment link creation error:', error.message);
// //     res.status(500).json({
// //       success: false,
// //       message: 'Failed to create payment link',
// //       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
// //     });
// //   }
// // });


// // // Check payment status endpoint
// // router.get('/status/:linkId', async (req, res) => {
// //   try {
// //     const { linkId } = req.params;

// //     if (!linkId) {
// //       return res.status(400).json({
// //         success: false,
// //         message: 'Link ID is required'
// //       });
// //     }

// //     const paymentStatus = await checkPaymentStatus(linkId);

// //     res.json({
// //       success: true,
// //       data: paymentStatus
// //     });

// //   } catch (error) {
// //     console.error('Payment status check error:', error.message);
// //     res.status(500).json({
// //       success: false,
// //       message: 'Failed to check payment status',
// //       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
// //     });
// //   }
// // });

// // // Webhook endpoint
// // router.post('/webhook', async (req, res) => {
// //   try {
// //     const webhookData = req.body;
// //     const result = await handlePaymentWebhook(webhookData); // <-- now async

// //     res.status(200).json({
// //       success: true,
// //       message: 'Webhook processed successfully',
// //       ...result
// //     });
// //   } catch (error) {
// //     console.error('Webhook processing error:', error.message);
// //     res.status(500).json({
// //       success: false,
// //       message: 'Webhook processing failed'
// //     });
// //   }
// // });

// // module.exports = router;


// // routes/paymentRoutes.js
// const express = require('express');
// const { createPaymentLinkWithRetry, checkPaymentStatus, handlePaymentWebhook } = require('../services/cashfreeService');
// const PaymentLink = require('../models/paymentLinkModel');
// const paymentController = require('../controllers/paymentController');
// const axios = require('axios');
// const User = require('../models/user.model');
// const adminAuth = require('../middlewares/adminAuth');
// const injectAdminContext = require('../middlewares/injectAdminContext');
// const notificationService = require('../services/notificationService');
// const mongoose = require('mongoose');

// const router = express.Router();

// // Input validation middleware
// const validatePaymentRequest = (req, res, next) => {
//   const { customer_id, phone, amount, userid } = req.body;
  
//   // Validate required fields
//   if (!customer_id || !phone || !amount || !userid) {
//     return res.status(400).json({
//       success: false,
//       message: 'Missing required fields: customer_id, phone, amount, userid'
//     });
//   }

//   // Validate amount is a positive number
//   const amountNum = parseFloat(amount);
//   if (isNaN(amountNum) || amountNum <= 0) {
//     return res.status(400).json({
//       success: false,
//       message: 'Amount must be a positive number'
//     });
//   }

//   // Validate phone number format (basic validation)
//   const phoneRegex = /^[0-9]{10,15}$/;
//   if (!phoneRegex.test(phone)) {
//     return res.status(400).json({
//       success: false,
//       message: 'Invalid phone number format'
//     });
//   }

//   // Validate user ID format (MongoDB ObjectId)
//   if (!mongoose.Types.ObjectId.isValid(userid)) {
//     return res.status(400).json({
//       success: false,
//       message: 'Invalid user ID format'
//     });
//   }

//   // If we got here, all validations passed
//   next();
// };

// // Apply rate limiting to payment endpoints
// const rateLimit = require('express-rate-limit');

// const paymentLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many payment requests, please try again later'
//   }
// });

// router.post('/create-payment-link', paymentLimiter, validatePaymentRequest, async (req, res) => {
//   const session = await mongoose.startSession();
  
//   try {
//     await session.startTransaction();
    
//     const { 
//       customer_id, 
//       phone, 
//       amount, 
//       plan_id = 'default_plan',
//       plan_name = 'Subscription Plan',
//       userid,
//       groupId,
//       bundleId,
//       expiry_date,
//       duration,
//       purchase_datetime
//     } = req.body;
    
//     // Convert amount to number and round to 2 decimal places
//     const amountNum = parseFloat(amount).toFixed(2);
    
//     // Check for duplicate pending payments
//     const existingPayment = await PaymentLink.findOne({
//       phone: phone,
//       status: 'PENDING',
//       createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
//     }).session(session);
    
//     if (existingPayment) {
//       await session.abortTransaction();
//       return res.status(400).json({
//         success: false,
//         message: 'A pending payment already exists for this phone number',
//         existingPaymentId: existingPayment._id
//       });
//     }

//     console.log('Received payment request:', {
//       customer_id,
//       phone,
//       amount,
//       plan_id,
//       plan_name,
//       userid,
//       purchase_datetime,
//       expiry_date,
//       duration
//     });

//     // Enhanced validation
//     const missingFields = [];
//     if (!customer_id) missingFields.push('customer_id');
//     if (!phone) missingFields.push('phone');
//     if (!amount) missingFields.push('amount');
//     if (!userid) missingFields.push('userid');
//     if (!expiry_date) missingFields.push('expiry_date');
//     if (!duration) missingFields.push('duration');

//     if (missingFields.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: `Missing required fields: ${missingFields.join(', ')}`,
//         receivedData: { customer_id, phone, amount, userid, expiry_date, duration }
//       });
//     }

//     if (amount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Amount must be greater than 0',
//         receivedAmount: amount
//       });
//     }

//     // Get adminId and groupId from plan first
//     let adminId = null;
//     // let groupId = null;
    
//     if (plan_id) {
//       try {
//         const Plan = require('../models/plan');
//         const plan = await Plan.findById(plan_id);
//         if (plan) {
//           adminId = plan.adminId;
//           groupId = plan.groupId;
//         } else {
//           console.warn(`Plan not found for ID: ${plan_id}`);
//         }
//       } catch (error) {
//         console.error('Error fetching plan for adminId:', error);
//       }
//     }
    
//     // If no adminId from plan, we need to handle this case
//     if (!adminId) {
//       console.warn('No adminId found for payment - this may cause attribution issues');
//     }

//     // Check for existing subscription and handle extension
//     let isExtension = false;
//     let newExpiryDate = expiry_date ? new Date(expiry_date) : new Date();
    
//     if (groupId) {
//       try {
//         const existingPayment = await PaymentLink.findOne({
//           phone: phone,
//           groupId: groupId,
//           status: 'SUCCESS'
//         }).sort({ expiry_date: -1 });

//         if (existingPayment) {
//           const now = new Date();
//           const existingExpiry = new Date(existingPayment.expiry_date);
          
//           // If existing subscription is still active, extend from its expiry date
//           if (existingExpiry > now) {
//             console.log('🔄 Extending active subscription');
//             isExtension = true;
            
//             // Calculate new expiry by adding duration to existing expiry
//             const durationStr = duration.toLowerCase();
//             let durationDays = 30;
//             if (durationStr.includes('month')) {
//               const months = parseInt(durationStr.match(/\d+/)?.[0] || '1');
//               durationDays = months * 30;
//             } else if (durationStr.includes('year')) {
//               const years = parseInt(durationStr.match(/\d+/)?.[0] || '1');
//               durationDays = years * 365;
//             } else if (durationStr.includes('week')) {
//               const weeks = parseInt(durationStr.match(/\d+/)?.[0] || '1');
//               durationDays = weeks * 7;
//             } else {
//               const days = parseInt(durationStr.match(/\d+/)?.[0] || '30');
//               durationDays = days;
//             }
            
//             newExpiryDate = new Date(existingExpiry);
//             newExpiryDate.setDate(newExpiryDate.getDate() + durationDays);
            
//             console.log(`Extension: Old expiry: ${existingExpiry}, New expiry: ${newExpiryDate}`);
//           } else {
//             // If expired, extend from current date
//             console.log('🔄 Renewing expired subscription');
//             isExtension = true;
//             const durationStr = (duration || '').toString().toLowerCase();
//             let durationDays = 30;
//             if (durationStr.includes('month')) {
//               const months = parseInt(durationStr.match(/\d+/)?.[0] || '1');
//               durationDays = months * 30;
//             } else if (durationStr.includes('year')) {
//               const years = parseInt(durationStr.match(/\d+/)?.[0] || '1');
//               durationDays = years * 365;
//             } else if (durationStr.includes('week')) {
//               const weeks = parseInt(durationStr.match(/\d+/)?.[0] || '1');
//               durationDays = weeks * 7;
//             } else {
//               const days = parseInt(durationStr.match(/\d+/)?.[0] || '30');
//               durationDays = days;
//             }
//             newExpiryDate = new Date();
//             newExpiryDate.setDate(newExpiryDate.getDate() + durationDays);
//           }
//         }
        
//         // Smart pending payment handling
//         const pendingPayments = await PaymentLink.find({
//           phone: phone,
//           status: 'PENDING'
//         }).sort({ createdAt: -1 });
        
//         if (pendingPayments.length > 0) {
//           const currentTime = new Date();
//           const thirtyMinutesAgo = new Date(currentTime - 30 * 60 * 1000);
          
//           // Auto-expire old pending payments (older than 30 minutes)
//           const expiredPayments = pendingPayments.filter(p => p.createdAt < thirtyMinutesAgo);
//           if (expiredPayments.length > 0) {
//             await PaymentLink.updateMany(
//               { _id: { $in: expiredPayments.map(p => p._id) } },
//               { 
//                 status: 'EXPIRED', 
//                 statusReason: 'Auto-expired after 30 minutes of inactivity',
//                 expiredAt: currentTime
//               }
//             );
//             console.log(`🧹 Auto-expired ${expiredPayments.length} stale pending payments for phone: ${phone}`);
//           }
          
//           // Check for active pending payments (within 30 minutes)
//           const activePendingPayments = pendingPayments.filter(p => p.createdAt >= thirtyMinutesAgo);
          
//           if (activePendingPayments.length > 0) {
//             // Check if pending payment is for the SAME bundle
//             const sameBundlePending = activePendingPayments.find(p => 
//               p.groupId && p.groupId.toString() === groupId.toString()
//             );
            
//             if (sameBundlePending) {
//               // For same bundle: provide options to continue or cancel
//               return res.status(409).json({
//                 success: false,
//                 message: 'You have a pending payment for this bundle.',
//                 code: 'PENDING_SAME_BUNDLE',
//                 pendingPayment: {
//                   id: sameBundlePending._id,
//                   linkUrl: sameBundlePending.link_url,
//                   amount: sameBundlePending.amount,
//                   planName: sameBundlePending.plan_name,
//                   createdAt: sameBundlePending.createdAt,
//                   timeRemaining: Math.max(0, 30 - Math.floor((currentTime - sameBundlePending.createdAt) / (60 * 1000)))
//                 },
//                 actions: {
//                   complete: {
//                     url: sameBundlePending.link_url,
//                     label: 'Complete Payment'
//                   },
//                   cancel: {
//                     url: `/api/payment/cancel/${sameBundlePending._id}`,
//                     label: 'Cancel & Start New'
//                   }
//                 }
//               });
//             } else {
//               // For different bundle: allow with warning about existing pending payments
//               console.log(`⚠️ User has pending payment for different bundle, allowing new payment creation`);
//               console.log(`Existing pending: ${activePendingPayments.map(p => p.plan_name).join(', ')}`);
//               console.log(`New payment for: ${plan_name}`);
//             }
//           }
//         }
        
//       } catch (checkError) {
//         console.error('Error checking existing purchase:', checkError);
//         // Don't fail the request if check fails, just log and continue
//       }
//     }

//     console.log('Creating payment link with Cashfree...');
//     const paymentResponse = await createPaymentLinkWithRetry({
//       customer_id,
//       phone,
//       amount,
//       plan_id,
//       plan_name
//     });

//     console.log('Payment link created successfully:', {
//       link_id: paymentResponse.link_id,
//       link_url: paymentResponse.link_url
//     });

//     console.log('Saving payment to database...');
//     const newPayment = new PaymentLink({
//       userid,
//       link_id: paymentResponse.link_id,
//       link_url: paymentResponse.link_url,
//       customer_id,
//       phone,
//       amount,
//       plan_id,
//       plan_name,
//       status: 'PENDING',
//       purchase_datetime: purchase_datetime || new Date().toISOString(),
//       expiry_date: newExpiryDate, // Use calculated expiry date for extensions
//       duration,
//       adminId: adminId,
//       groupId: groupId,
//       adminCommission: amount * 1.0, // 100% commission by default
//       commissionRate: 100,
//       isExtension: isExtension // Flag to indicate if this is an extension
//     });

//     const savedPayment = await newPayment.save();
//     console.log('Payment saved to database:', savedPayment._id);

//     // Send notification to admin about new payment link
//     notificationService.notifyNewPaymentLink({
//       link_id: savedPayment.link_id,
//       amount: savedPayment.amount,
//       customer_id: savedPayment.customer_id,
//       phone: savedPayment.phone,
//       plan_name: savedPayment.plan_name,
//       adminId: savedPayment.adminId
//     });

//     // Commit the transaction
//     await session.commitTransaction();

//     res.json({
//       success: true,
//       paymentLink: paymentResponse.link_url,
//       orderId: paymentResponse.link_id,
//       message: 'Payment link created and saved',
//       paymentId: newPayment._id,
//       expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
//     });

//   } catch (error) {
//     // Abort transaction on error
//     if (session.inTransaction()) {
//       await session.abortTransaction();
//     }
    
//     console.error('Payment link creation error:', {
//       message: error.message,
//       stack: error.stack,
//       endpoint: '/create-payment-link',
//       timestamp: new Date().toISOString()
//     });
    
//     // Log full error in development, generic message in production
//     const errorMessage = process.env.NODE_ENV === 'development' 
//       ? error.message 
//       : 'Failed to process payment request';
    
//     // More specific error messages based on error type
//     let statusCode = 500;
//     if (error.name === 'ValidationError') {
//       statusCode = 400;
//     } else if (error.name === 'MongoError' && error.code === 11000) {
//       statusCode = 409; // Conflict
//     }
    
//     return res.status(statusCode).json({
//       success: false,
//       message: errorMessage,
//       code: error.code,
//       ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
//     });
//   }
// });

// // Add a new endpoint to check subscription status
// router.get('/subscription-status/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;
    
//     const activeSubscription = await PaymentLink.findOne({
//       userid: userId,
//       status: 'SUCCESS',
//       expiry_date: { $gt: new Date() }
//     }).sort({ expiry_date: -1 });

//     if (!activeSubscription) {
//       return res.json({
//         success: true,
//         hasActiveSubscription: false,
//         message: 'No active subscription found'
//       });
//     }

//     res.json({
//       success: true,
//       hasActiveSubscription: true,
//       subscription: {
//         planName: activeSubscription.plan_name,
//         expiryDate: activeSubscription.expiry_date,
//         duration: activeSubscription.duration
//       }
//     });

//   } catch (error) {
//     console.error('Subscription status check error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to check subscription status',
//       error: error.message
//     });
//   }
// });

// // Check payment status
// router.get('/status/by-link/:linkId', async (req, res) => {
//   try {
//     const { linkId } = req.params;

//     if (!linkId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Link ID is required'
//       });
//     }

//     const paymentStatus = await checkPaymentStatus(linkId);

//     res.json({
//       success: true,
//       data: paymentStatus
//     });

//   } catch (error) {
//     console.error('Status check error:', error.message);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to check payment status',
//       error: error.message
//     });
//   }
// });

// // Get payment details by order ID (for payment success flow)
// router.get('/details/:orderId', async (req, res) => {
//   try {
//     const { orderId } = req.params;
    
//     if (!orderId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Order ID is required'
//       });
//     }

//     // Find payment by link_id (which is the orderId from Cashfree)
//     const payment = await PaymentLink.findOne({ link_id: orderId })
//       .populate('plan_id');

//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Payment not found'
//       });
//     }

//     res.json({
//       success: true,
//       orderId: payment.link_id,
//       userId: payment.userid,
//       planId: payment.plan_id,
//       planName: payment.plan_name,
//       amount: payment.amount,
//       status: payment.status,
//       bundleId: payment.groupId, // This should contain the bundle/group ID
//       expiryDate: payment.expiry_date,
//       duration: payment.duration
//     });

//   } catch (error) {
//     console.error('Error fetching payment details:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching payment details',
//       error: error.message
//     });
//   }
// });

// // Get subscription status
// router.get('/status/by-user/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;
    
//     // Find the most recent payment for this user
//     const payment = await PaymentLink.findOne({ userid: userId })
//       .sort({ expiry_date: -1 })
//       .populate('plan_id');
    
//     if (!payment) {
//       return res.status(404).json({ message: 'No subscription found' });
//     }

//     res.json({
//       plan_name: payment.plan_name,
//       expiry_date: payment.expiry_date,
//       status: new Date(payment.expiry_date) > new Date() ? 'active' : 'expired'
//     });
//   } catch (error) {
//     console.error('Error fetching subscription status:', error);
//     res.status(500).json({ message: 'Error fetching subscription status' });
//   }
// });

// // Update user's Telegram User ID
// router.post('/update-telegram-id', async (req, res) => {
//   try {
//     const { userId, telegramUserId } = req.body;
    
//     if (!userId || !telegramUserId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Both userId and telegramUserId are required'
//       });
//     }

//     // Update user's telegramUserId
//     const updatedUser = await User.findByIdAndUpdate(
//       userId,
//       { telegramUserId: telegramUserId.toString() },
//       { new: true }
//     );

//     if (!updatedUser) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     console.log(`Updated telegramUserId for user ${userId}: ${telegramUserId}`);

//     res.json({
//       success: true,
//       message: 'Telegram User ID updated successfully',
//       user: {
//         id: updatedUser._id,
//         telegramUserId: updatedUser.telegramUserId
//       }
//     });

//   } catch (error) {
//     console.error('Error updating telegram user ID:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error updating telegram user ID',
//       error: error.message
//     });
//   }
// });

// // Get user's pending payments with detailed info
// router.get('/pending/:phone', async (req, res) => {
//   try {
//     const { phone } = req.params;
//     console.log(`📋 Fetching pending payments for phone: ${phone}`);

//     // Find all pending payments for this phone number
//     const pendingPayments = await PaymentLink.find({
//       phone: phone,
//       status: 'PENDING'
//     }).populate('plan_id').sort({ createdAt: -1 });

//     if (pendingPayments.length === 0) {
//       return res.json({
//         success: true,
//         message: 'No pending payments found',
//         pendingPayments: []
//       });
//     }

//     const currentTime = new Date();
//     const thirtyMinutesAgo = new Date(currentTime - 30 * 60 * 1000);
    
//     // Categorize payments by age and bundle
//     const categorizedPayments = pendingPayments.map(payment => {
//       const ageInMinutes = Math.floor((currentTime - payment.createdAt) / (60 * 1000));
//       const isStale = payment.createdAt < thirtyMinutesAgo;
      
//       return {
//         id: payment._id,
//         linkId: payment.link_id,
//         linkUrl: payment.link_url,
//         amount: payment.amount,
//         planName: payment.plan_name,
//         bundleId: payment.groupId,
//         createdAt: payment.createdAt,
//         ageInMinutes,
//         isStale,
//         timeRemaining: isStale ? 0 : Math.max(0, 30 - ageInMinutes),
//         actions: {
//           complete: {
//             url: payment.link_url,
//             label: 'Complete Payment',
//             enabled: !isStale
//           },
//           cancel: {
//             url: `/api/payment/cancel/${payment._id}`,
//             label: 'Cancel Payment',
//             enabled: true
//           }
//         }
//       };
//     });

//     // Group by bundle for better UX
//     const byBundle = {};
//     categorizedPayments.forEach(payment => {
//       const bundleKey = payment.bundleId || 'unknown';
//       if (!byBundle[bundleKey]) {
//         byBundle[bundleKey] = [];
//       }
//       byBundle[bundleKey].push(payment);
//     });

//     res.json({
//       success: true,
//       message: `Found ${pendingPayments.length} pending payments`,
//       pendingPayments: categorizedPayments,
//       groupedByBundle: byBundle,
//       summary: {
//         total: pendingPayments.length,
//         active: categorizedPayments.filter(p => !p.isStale).length,
//         stale: categorizedPayments.filter(p => p.isStale).length
//       }
//     });

//   } catch (error) {
//     console.error('❌ Error fetching pending payments:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch pending payments',
//       error: error.message
//     });
//   }
// });

// // Auto-cleanup stale pending payments for a user
// router.post('/cleanup-stale/:phone', async (req, res) => {
//   try {
//     const { phone } = req.params;
//     console.log(`🧹 Starting cleanup of stale pending payments for phone: ${phone}`);

//     const currentTime = new Date();
//     const thirtyMinutesAgo = new Date(currentTime - 30 * 60 * 1000);

//     // Find and update stale pending payments
//     const result = await PaymentLink.updateMany(
//       {
//         phone: phone,
//         status: 'PENDING',
//         createdAt: { $lt: thirtyMinutesAgo }
//       },
//       {
//         status: 'EXPIRED',
//         statusReason: 'Auto-expired due to inactivity (30+ minutes)',
//         expiredAt: currentTime
//       }
//     );

//     console.log(`✅ Cleanup completed: ${result.modifiedCount} payments expired`);

//     res.json({
//       success: true,
//       message: `Cleaned up ${result.modifiedCount} stale pending payments`,
//       modifiedCount: result.modifiedCount
//     });

//   } catch (error) {
//     console.error('❌ Error during cleanup:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to cleanup stale payments',
//       error: error.message
//     });
//   }
// });

// // Check if user can proceed with new payment (smart validation)
// router.post('/can-proceed', async (req, res) => {
//   try {
//     const { phone, bundleId, planName } = req.body;
    
//     if (!phone) {
//       return res.status(400).json({
//         success: false,
//         message: 'Phone number is required'
//       });
//     }

//     console.log(`🔍 Checking payment eligibility for phone: ${phone}, bundle: ${bundleId}`);

//     // Auto-cleanup stale payments first
//     const currentTime = new Date();
//     const thirtyMinutesAgo = new Date(currentTime - 30 * 60 * 1000);
    
//     await PaymentLink.updateMany(
//       {
//         phone: phone,
//         status: 'PENDING',
//         createdAt: { $lt: thirtyMinutesAgo }
//       },
//       {
//         status: 'EXPIRED',
//         statusReason: 'Auto-expired during eligibility check',
//         expiredAt: currentTime
//       }
//     );

//     // Check for active pending payments
//     const activePendingPayments = await PaymentLink.find({
//       phone: phone,
//       status: 'PENDING',
//       createdAt: { $gte: thirtyMinutesAgo }
//     });

//     if (activePendingPayments.length === 0) {
//       return res.json({
//         success: true,
//         canProceed: true,
//         message: 'Ready to create new payment',
//         conflicts: []
//       });
//     }

//     // Check for same-bundle conflicts
//     const sameBundleConflicts = activePendingPayments.filter(p => 
//       bundleId && p.groupId && p.groupId.toString() === bundleId.toString()
//     );

//     if (sameBundleConflicts.length > 0) {
//       const conflict = sameBundleConflicts[0];
//       const ageInMinutes = Math.floor((currentTime - conflict.createdAt) / (60 * 1000));
      
//       return res.json({
//         success: true,
//         canProceed: false,
//         message: `You have a pending payment for this bundle (${conflict.plan_name})`,
//         conflicts: [{
//           type: 'same_bundle',
//           payment: {
//             id: conflict._id,
//             linkUrl: conflict.link_url,
//             amount: conflict.amount,
//             planName: conflict.plan_name,
//             ageInMinutes,
//             timeRemaining: Math.max(0, 30 - ageInMinutes)
//           },
//           actions: {
//             complete: {
//               url: conflict.link_url,
//               label: 'Complete Existing Payment'
//             },
//             cancel: {
//               url: `/api/payment/cancel/${conflict._id}`,
//               label: 'Cancel & Start New'
//             }
//           }
//         }],
//         recommendation: 'complete_existing'
//       });
//     }

//     // Different bundle - allow with warning
//     return res.json({
//       success: true,
//       canProceed: true,
//       message: 'Can proceed, but you have pending payments for other bundles',
//       conflicts: activePendingPayments.map(p => ({
//         type: 'different_bundle',
//         payment: {
//           id: p._id,
//           amount: p.amount,
//           planName: p.plan_name,
//           ageInMinutes: Math.floor((currentTime - p.createdAt) / (60 * 1000))
//         }
//       })),
//       recommendation: 'proceed_with_warning'
//     });

//   } catch (error) {
//     console.error('❌ Error checking payment eligibility:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to check payment eligibility',
//       error: error.message
//     });
//   }
// });

// // Cancel a pending payment
// router.delete('/cancel/:paymentId', async (req, res) => {
//   try {
//     const { paymentId } = req.params;
//     console.log(`🗑️ Canceling payment request for ID: ${paymentId}`);

//     // Find the payment
//     const payment = await PaymentLink.findById(paymentId);
//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Payment not found'
//       });
//     }

//     // Only allow canceling PENDING payments
//     if (payment.status !== 'PENDING') {
//       return res.status(400).json({
//         success: false,
//         message: 'Can only cancel pending payments'
//       });
//     }

//     // Update payment status to EXPIRED (closest to canceled in the enum)
//     payment.status = 'EXPIRED';
//     payment.canceledAt = new Date();
//     await payment.save();

//     console.log(`✅ Payment ${paymentId} canceled successfully`);

//     res.json({
//       success: true,
//       message: 'Payment canceled successfully',
//       payment: {
//         id: payment._id,
//         status: payment.status,
//         canceledAt: payment.canceledAt
//       }
//     });
//   } catch (error) {
//     console.error('❌ Error canceling payment:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to cancel payment',
//       error: error.message
//     });
//   }
// });

// // Mark payment as successful (for handling cases where user reaches success page before webhook)
// router.post('/mark-success/:orderId', async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     console.log(`🔄 Manual success marking requested for order: ${orderId}`);

//     // Find the payment by order ID
//     const payment = await PaymentLink.findOne({ 
//       $or: [
//         { link_id: orderId }, 
//         { order_id: orderId }
//       ]
//     });

//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Payment not found'
//       });
//     }

//     // Only update if payment is not already SUCCESS
//     if (payment.status !== 'SUCCESS') {
//       // Update payment status
//       payment.status = 'SUCCESS';
//       await payment.save();
      
//       console.log(`✅ Payment ${orderId} manually marked as SUCCESS`);
      
//       // Trigger the same success handling as webhook would
//       try {
//         const { handlePaymentSuccess } = require('../services/cashfreeService');
//         await handlePaymentSuccess({
//           order: {
//             order_id: orderId
//           }
//         });
//         console.log('✅ Payment success handling completed');
//       } catch (handlerError) {
//         console.warn('⚠️ Payment success handling failed:', handlerError.message);
//       }

//       res.json({
//         success: true,
//         message: 'Payment marked as successful',
//         payment: {
//           id: payment._id,
//           status: payment.status,
//           orderId: orderId
//         }
//       });
//     } else {
//       res.json({
//         success: true,
//         message: 'Payment already marked as successful',
//         payment: {
//           id: payment._id,
//           status: payment.status,
//           orderId: orderId
//         }
//       });
//     }
//   } catch (error) {
//     console.error('❌ Error marking payment as successful:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to mark payment as successful',
//       error: error.message
//     });
//   }
// });

// // Webhook endpoint with security verification
// router.post('/webhook', async (req, res) => {
//   try {
//     const webhookData = req.body;
    
//     // Get signature and timestamp from headers
//     const signature = req.headers['x-cashfree-signature'];
//     const timestamp = req.headers['x-cashfree-timestamp'];
//     const rawPayload = JSON.stringify(webhookData);

//     console.log('Webhook received with headers:', {
//       signature: signature ? 'present' : 'missing',
//       timestamp: timestamp ? timestamp : 'missing',
//       contentType: req.headers['content-type']
//     });

//     if (!signature || !timestamp) {
//       console.error('Missing required webhook headers');
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required webhook headers'
//       });
//     }

//     const result = await handlePaymentWebhook(webhookData, rawPayload, signature, timestamp);

//     res.status(200).json({
//       success: true,
//       message: 'Webhook processed successfully',
//       ...result
//     });
//   } catch (error) {
//     console.error('Webhook error:', error.message);
    
//     // Return specific error status for security failures
//     if (error.message.includes('signature verification failed') || 
//         error.message.includes('timestamp verification failed')) {
//       return res.status(401).json({
//         success: false,
//         message: 'Webhook verification failed'
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Webhook processing failed'
//     });
//   }
// });

// // Admin-specific analytics endpoints
// router.get('/total-revenue', adminAuth, injectAdminContext, paymentController.getTotalRevenue);
// router.get('/total-transactions', adminAuth, injectAdminContext, paymentController.getTotalTransactions);
// router.get('/active-users', adminAuth, injectAdminContext, paymentController.getActiveUsers);
// router.get('/recent-successful', adminAuth, injectAdminContext, paymentController.getRecentSuccessfulTransactions);

// // Test endpoint to check Cashfree API configuration
// router.get('/test-config', async (req, res) => {
//   try {
//     const config = {
//       CASHFREE_BASE_URL: process.env.CASHFREE_BASE_URL,
//       CASHFREE_CLIENT_ID: process.env.CASHFREE_CLIENT_ID ? '***SET***' : '***MISSING***',
//       CASHFREE_CLIENT_SECRET: process.env.CASHFREE_CLIENT_SECRET ? '***SET***' : '***MISSING***',
//       FRONTEND_URL: process.env.FRONTEND_URL,
//       BACKEND_URL: process.env.BACKEND_URL,
//       NODE_ENV: process.env.NODE_ENV
//     };

//     // Test if we can reach the Cashfree API - Skip actual API call for now
//     let apiTest = 'Configuration appears valid';
//     if (!process.env.CASHFREE_BASE_URL || !process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
//       apiTest = 'Missing required configuration - check environment variables';
//     } else {
//       // Just validate the configuration format without making API call
//       if (!process.env.CASHFREE_CLIENT_ID.startsWith('TEST') && !process.env.CASHFREE_CLIENT_ID.startsWith('CF')) {
//         apiTest = 'Invalid Client ID format';
//       } else if (!process.env.CASHFREE_CLIENT_SECRET.startsWith('cfsk_')) {
//         apiTest = 'Invalid Client Secret format';
//       } else {
//         apiTest = 'Configuration validated - ready for payment processing';
//       }
//     }

//     res.json({
//       success: true,
//       config,
//       apiTest,
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// // Test endpoint to create a minimal payment link
// router.post('/test-create-link', async (req, res) => {
//   try {
//     const { customer_id, phone, amount } = req.body;
    
//     if (!customer_id || !phone || !amount) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields: customer_id, phone, amount'
//       });
//     }

//     console.log('Testing payment link creation with:', { customer_id, phone, amount });

//     const testPaymentData = {
//       customer_id,
//       phone,
//       amount: parseFloat(amount),
//       plan_id: 'test-plan',
//       plan_name: 'Test Plan'
//     };

//     const paymentResponse = await createPaymentLinkWithRetry(testPaymentData, 1); // Only 1 retry for testing

//     res.json({
//       success: true,
//       paymentLink: paymentResponse.link_url,
//       orderId: paymentResponse.link_id,
//       message: 'Test payment link created successfully'
//     });

//   } catch (error) {
//     console.error('Test payment link creation error:', error.message);
//     res.status(500).json({
//       success: false,
//       message: 'Test payment link creation failed',
//       error: error.message
//     });
//   }
// });

// // Payment cleanup management endpoints (admin only)
// router.get('/cleanup/stats', adminAuth, async (req, res) => {
//   try {
//     const paymentCleanupService = require('../services/paymentCleanupService');
//     const stats = paymentCleanupService.getStats();
//     const pendingSummary = await paymentCleanupService.getPendingPaymentsSummary();
//     const healthCheck = paymentCleanupService.healthCheck();
    
//     res.json({
//       success: true,
//       cleanup: {
//         stats,
//         pendingSummary,
//         healthCheck
//       }
//     });
//   } catch (error) {
//     console.error('❌ Error getting cleanup stats:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to get cleanup statistics',
//       error: error.message
//     });
//   }
// });

// router.post('/cleanup/force', adminAuth, async (req, res) => {
//   try {
//     const paymentCleanupService = require('../services/paymentCleanupService');
//     console.log('🔧 Admin triggered manual payment cleanup');
    
//     const result = await paymentCleanupService.forceCleanup();
    
//     res.json({
//       success: true,
//       message: 'Manual cleanup completed',
//       result
//     });
//   } catch (error) {
//     console.error('❌ Error during manual cleanup:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Manual cleanup failed',
//       error: error.message
//     });
//   }
// });

// router.post('/cleanup/start', adminAuth, async (req, res) => {
//   try {
//     const paymentCleanupService = require('../services/paymentCleanupService');
//     paymentCleanupService.startAutoCleanup();
    
//     res.json({
//       success: true,
//       message: 'Payment cleanup service started',
//       stats: paymentCleanupService.getStats()
//     });
//   } catch (error) {
//     console.error('❌ Error starting cleanup service:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to start cleanup service',
//       error: error.message
//     });
//   }
// });

// router.post('/cleanup/stop', adminAuth, async (req, res) => {
//   try {
//     const paymentCleanupService = require('../services/paymentCleanupService');
//     paymentCleanupService.stopAutoCleanup();
    
//     res.json({
//       success: true,
//       message: 'Payment cleanup service stopped',
//       stats: paymentCleanupService.getStats()
//     });
//   } catch (error) {
//     console.error('❌ Error stopping cleanup service:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to stop cleanup service',
//       error: error.message
//     });
//   }
// });

// // New endpoints for dynamic fee management
// router.post('/process-with-fee', adminAuth, paymentController.processPaymentWithFee);
// router.patch('/:paymentId/update-with-fee', adminAuth, paymentController.updatePaymentWithFee);
// router.get('/:paymentId/fee-details', adminAuth, paymentController.getPaymentWithFeeDetails);
// router.post('/bulk-recalculate-fees', adminAuth, paymentController.bulkRecalculateFees);
// router.post('/:paymentId/recalculate-fees', adminAuth, paymentController.recalculatePaymentFees);

// module.exports = router;

  // // routes/paymentRoutes.js
  // const express = require('express');
  // const { createPaymentLinkWithRetry, checkPaymentStatus, handlePaymentWebhook } = require('../services/cashfreeService');
  // const PaymentLink = require('../models/paymentLinkModel');
  // const paymentController = require('../controllers/paymentController');
  // const axios = require('axios');
  // const User = require('../models/user.model');
  // const adminAuth = require('../middlewares/adminAuth');
  // const injectAdminContext = require('../middlewares/injectAdminContext');
  // const notificationService = require('../services/notificationService');
  // const mongoose = require('mongoose');

  // const router = express.Router();

  // // Input validation middleware
  // const validatePaymentRequest = (req, res, next) => {
  //   const { customer_id, phone, amount, userid } = req.body;

  //   // Validate required fields
  //   if (!customer_id || !phone || !amount || !userid) {
  //     return res.status(400).json({
  //       success: false,
  //       message: 'Missing required fields: customer_id, phone, amount, userid'
  //     });
  //   }

  //   // Validate amount is a positive number
  //   const amountNum = parseFloat(amount);
  //   if (isNaN(amountNum) || amountNum <= 0) {
  //     return res.status(400).json({
  //       success: false,
  //       message: 'Amount must be a positive number'
  //     });
  //   }

  //   // Validate phone number format (basic validation)
  //   const phoneRegex = /^[0-9]{10,15}$/;
  //   if (!phoneRegex.test(phone)) {
  //     return res.status(400).json({
  //       success: false,
  //       message: 'Invalid phone number format'
  //     });
  //   }

  //   // Validate user ID format (MongoDB ObjectId)
  //   if (!mongoose.Types.ObjectId.isValid(userid)) {
  //     return res.status(400).json({
  //       success: false,
  //       message: 'Invalid user ID format'
  //     });
  //   }

  //   // If we got here, all validations passed
  //   next();
  // };

  // // Apply rate limiting to payment endpoints
  // const rateLimit = require('express-rate-limit');

  // const paymentLimiter = rateLimit({
  //   windowMs: 15 * 60 * 1000, // 15 minutes
  //   max: 100, // limit each IP to 100 requests per windowMs
  //   message: {
  //     success: false,
  //     message: 'Too many payment requests, please try again later'
  //   }
  // });

  // router.post('/create-payment-link', paymentLimiter, validatePaymentRequest, async (req, res) => {
  //   const session = await mongoose.startSession();
  //   try {
  //     await session.startTransaction();

  //     let {
  //       customer_id,
  //       phone,
  //       amount,
  //       plan_id = 'default_plan',
  //       plan_name = 'Subscription Plan',
  //       userid,
  //       groupId,
  //       bundleId,
  //       expiry_date,
  //       duration,
  //       purchase_datetime
  //     } = req.body;

  //     // Convert amount to number and round to 2 decimal places
  //     amount = parseFloat(amount);

  //     console.log("⚡-------------------------⚡");
  //     console.log("📞 Phone:", phone);

  //     // Check existing plan by phone (not necessarily within session - read-only)
  //     const existingPaymentLink = await PaymentLink.findOne({ phone });
  //     console.log("🔍 Existing Payment Link: ", existingPaymentLink);
  //     if (existingPaymentLink) {
  //       const newExpiryDateLog = new Date(existingPaymentLink.expiry_date);
  //       newExpiryDateLog.setDate(newExpiryDateLog.getDate() + 30);
  //       existingPaymentLink.expiry_date = newExpiryDateLog;
  //       // existingPaymentLink.isExtension = true;
  //       await existingPaymentLink.save();
  //       console.log("✅ Update Data: ", existingPaymentLink);
  //       console.log("✅ Expiry Date Updated To: ", existingPaymentLink.expiry_date);
  //     } else {
  //       console.log("❌ No existing plan found. 🆕 Creating new plan...");
  //     }

  //     console.log("⚡-------------------------⚡");

  //     // Check for duplicate pending payments within last 24 hours (session-scoped)
  //     const existingPayment = await PaymentLink.findOne({
  //       phone: phone,
  //       status: 'PENDING',
  //       createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  //     }).session(session);

  //     if (existingPayment) {
  //       await session.abortTransaction();
  //       return res.status(400).json({
  //         success: false,
  //         message: 'A pending payment already exists for this phone number',
  //         existingPaymentId: existingPayment._id
  //       });
  //     }

  //     console.log('Received payment request:', {
  //       customer_id,
  //       phone,
  //       amount,
  //       plan_id,
  //       plan_name,
  //       userid,
  //       purchase_datetime,
  //       expiry_date,
  //       duration
  //     });

  //     // Enhanced validation
  //     const missingFields = [];
  //     if (!customer_id) missingFields.push('customer_id');
  //     if (!phone) missingFields.push('phone');
  //     if (!amount && amount !== 0) missingFields.push('amount');
  //     if (!userid) missingFields.push('userid');
  //     if (!expiry_date) missingFields.push('expiry_date');
  //     if (!duration) missingFields.push('duration');

  //     if (missingFields.length > 0) {
  //       // Note: using template literal for interpolation
  //       return res.status(400).json({
  //         success: false,
  //         message: `Missing required fields: ${missingFields.join(', ')}`,
  //         receivedData: { customer_id, phone, amount, userid, expiry_date, duration }
  //       });
  //     }

  //     if (amount <= 0) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Amount must be greater than 0',
  //         receivedAmount: amount
  //       });
  //     }

  //     // Get adminId and groupId from plan first (if provided)
  //     let adminId = null;

  //     if (plan_id) {
  //       try {
  //         const Plan = require('../models/plan');
  //         const plan = await Plan.findById(plan_id).session(session);
  //         if (plan) {
  //           adminId = plan.adminId;
  //           // override groupId only if plan has one
  //           if (plan.groupId) groupId = plan.groupId;
  //         } else {
  //           console.warn(`Plan not found for ID: ${plan_id}`);
  //         }
  //       } catch (error) {
  //         console.error('Error fetching plan for adminId:', error);
  //       }
  //     }

  //     if (!adminId) {
  //       console.warn('No adminId found for payment - this may cause attribution issues');
  //     }

  //     // Check for existing subscription and handle extension
  //     let isExtension = false;
  //     let newExpiryDate = expiry_date ? new Date(expiry_date) : new Date();
  //     // Add 30 days to newExpiryDate when it comes from plans
  //     if (expiry_date) {
  //       newExpiryDate.setDate(newExpiryDate.getDate() + 30);
  //       console.log(`📅 Added 30 days to plan expiry date: ${expiry_date} -> ${newExpiryDate}`);
  //     }

  //     if (groupId) {
  //       try {
  //         const existingPayment = await PaymentLink.findOne({
  //           phone: phone,
  //           groupId: groupId,
  //           status: 'SUCCESS'
  //         }).sort({ expiry_date: -1 }).session(session);

  //         if (existingPayment) {
  //           const now = new Date();
  //           const existingExpiry = new Date(existingPayment.expiry_date);

  //           // If existing subscription is still active, extend from its expiry date
  //           if (existingExpiry > now) {
  //             console.log('🔄 Extending active subscription');
  //             isExtension = true;

  //             // Calculate new expiry by adding duration to existing expiry
  //             const durationStr = (duration || '').toString().toLowerCase();
  //             const durationDays = durationStr.includes('month') ? 30 :
  //               durationStr.includes('year') ? 365 :
  //                 parseInt(duration) || 30;

  //             newExpiryDate = new Date(existingExpiry);
  //             newExpiryDate.setDate(newExpiryDate.getDate() + durationDays);

  //             console.log(`Extension: Old expiry: ${existingExpiry}, New expiry: ${newExpiryDate}`);
  //           } else {
  //             // If expired, extend from current date
  //             console.log('🔄 Renewing expired subscription');
  //             isExtension = true;
  //             const durationStr = (duration || '').toString().toLowerCase();
  //             const durationDays = durationStr.includes('month') ? 30 :
  //               durationStr.includes('year') ? 365 :
  //                 parseInt(duration) || 30;
  //             newExpiryDate = new Date();
  //             newExpiryDate.setDate(newExpiryDate.getDate() + durationDays);
  //           }
  //         }

  //         // Smart pending payment handling
  //         const pendingPayments = await PaymentLink.find({
  //           phone: phone,
  //           status: 'PENDING'
  //         }).sort({ createdAt: -1 }).session(session);

  //         if (pendingPayments.length > 0) {
  //           const currentTime = new Date();
  //           const thirtyMinutesAgo = new Date(currentTime.getTime() - 30 * 60 * 1000);

  //           // Auto-expire old pending payments (older than 30 minutes)
  //           const expiredPayments = pendingPayments.filter(p => p.createdAt < thirtyMinutesAgo);
  //           if (expiredPayments.length > 0) {
  //             await PaymentLink.updateMany(
  //               { _id: { $in: expiredPayments.map(p => p._id) } },
  //               {
  //                 status: 'EXPIRED',
  //                 statusReason: 'Auto-expired after 30 minutes of inactivity',
  //                 expiredAt: currentTime
  //               },
  //               { session }
  //             );
  //             console.log(`🧹 Auto-expired ${expiredPayments.length} stale pending payments for phone: ${phone}`);
  //           }

  //           // Check for active pending payments (within 30 minutes)
  //           const activePendingPayments = pendingPayments.filter(p => p.createdAt >= thirtyMinutesAgo);

  //           if (activePendingPayments.length > 0) {
  //             // Check if pending payment is for the SAME bundle
  //             const sameBundlePending = activePendingPayments.find(p =>
  //               p.groupId && groupId && p.groupId.toString() === groupId.toString()
  //             );

  //             if (sameBundlePending) {
  //               // For same bundle: provide options to continue or cancel
  //               await session.abortTransaction();
  //               return res.status(409).json({
  //                 success: false,
  //                 message: 'You have a pending payment for this bundle.',
  //                 code: 'PENDING_SAME_BUNDLE',
  //                 pendingPayment: {
  //                   id: sameBundlePending._id,
  //                   linkUrl: sameBundlePending.link_url,
  //                   amount: sameBundlePending.amount,
  //                   planName: sameBundlePending.plan_name,
  //                   createdAt: sameBundlePending.createdAt,
  //                   timeRemaining: Math.max(0, 30 - Math.floor((new Date() - sameBundlePending.createdAt) / (60 * 1000)))
  //                 },
  //                 actions: {
  //                   complete: {
  //                     url: sameBundlePending.link_url,
  //                     label: 'Complete Payment'
  //                   },
  //                   cancel: {
  //                     url: `/api/payment/cancel/${sameBundlePending._id}`,
  //                     label: 'Cancel & Start New'
  //                   }
  //                 }
  //               });
  //             } else {
  //               // For different bundle: allow with warning about existing pending payments
  //               console.log('⚠ User has pending payment for different bundle, allowing new payment creation');
  //               console.log(`Existing pending: ${activePendingPayments.map(p => p.plan_name).join(', ')}`);
  //               console.log(`New payment for: ${plan_name}`);
  //             }
  //           }
  //         }

  //       } catch (checkError) {
  //         console.error('Error checking existing purchase:', checkError);
  //         // Don't fail the request if check fails, just log and continue
  //       }
  //     }

  //     console.log('Creating payment link with Cashfree...');
  //     const paymentResponse = await createPaymentLinkWithRetry({
  //       customer_id,
  //       phone,
  //       amount,
  //       plan_id,
  //       plan_name
  //     });

  //     console.log('Payment link created successfully:', {
  //       link_id: paymentResponse.link_id,
  //       link_url: paymentResponse.link_url
  //     });

  //     console.log('Saving payment to database...');
  //     const newPayment = new PaymentLink({
  //       userid,
  //       link_id: paymentResponse.link_id,
  //       link_url: paymentResponse.link_url,
  //       customer_id,
  //       phone,
  //       amount,
  //       plan_id,
  //       plan_name,
  //       status: 'PENDING',
  //       purchase_datetime: purchase_datetime || new Date().toISOString(),
  //       expiry_date: newExpiryDate, // Use calculated expiry date for extensions
  //       duration,
  //       adminId: adminId,
  //       groupId: groupId,
  //       adminCommission: amount * 1.0, // 100% commission by default
  //       commissionRate: 100,
  //       isExtension: isExtension // Flag to indicate if this is an extension
  //     });

  //     const savedPayment = await newPayment.save({ session });
  //     console.log('Payment saved to database:', savedPayment._id);

  //     // Send notification to admin about new payment link
  //     try {
  //       notificationService.notifyNewPaymentLink({
  //         link_id: savedPayment.link_id,
  //         amount: savedPayment.amount,
  //         customer_id: savedPayment.customer_id,
  //         phone: savedPayment.phone,
  //         plan_name: savedPayment.plan_name,
  //         adminId: savedPayment.adminId
  //       });
  //     } catch (nErr) {
  //       console.warn('Notification failed:', nErr.message);
  //     }

  //     // Commit the transaction
  //     await session.commitTransaction();

  //     res.json({
  //       success: true,
  //       paymentLink: paymentResponse.link_url,
  //       orderId: paymentResponse.link_id,
  //       message: 'Payment link created and saved',
  //       paymentId: savedPayment._id,
  //       expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  //     });

  //   } catch (error) {
  //     // Abort transaction on error
  //     try {
  //       if (session.inTransaction()) {
  //         await session.abortTransaction();
  //       }
  //     } catch (abortErr) {
  //       console.error('Error aborting transaction:', abortErr);
  //     }

  //     console.error('Payment link creation error:', {
  //       message: error.message,
  //       stack: error.stack,
  //       endpoint: '/create-payment-link',
  //       timestamp: new Date().toISOString()
  //     });

  //     // Log full error in development, generic message in production
  //     const errorMessage = process.env.NODE_ENV === 'development'
  //       ? error.message
  //       : 'Failed to process payment request';

  //     // More specific error messages based on error type
  //     let statusCode = 500;
  //     if (error.name === 'ValidationError') {
  //       statusCode = 400;
  //     } else if (error.name === 'MongoError' && error.code === 11000) {
  //       statusCode = 409; // Conflict
  //     }

  //     return res.status(statusCode).json({
  //       success: false,
  //       message: errorMessage,
  //       code: error.code,
  //       ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  //     });
  //   } finally {
  //     try {
  //       session.endSession();
  //     } catch (endErr) {
  //       console.error('Error ending session:', endErr);
  //     }
  //   }
  // });

  // // Add a new endpoint to check subscription status
  // router.get('/subscription-status/:userId', async (req, res) => {
  //   try {
  //     const { userId } = req.params;

  //     const activeSubscription = await PaymentLink.findOne({
  //       userid: userId,
  //       status: 'SUCCESS',
  //       expiry_date: { $gt: new Date() }
  //     }).sort({ expiry_date: -1 });

  //     if (!activeSubscription) {
  //       return res.json({
  //         success: true,
  //         hasActiveSubscription: false,
  //         message: 'No active subscription found'
  //       });
  //     }

  //     res.json({
  //       success: true,
  //       hasActiveSubscription: true,
  //       subscription: {
  //         planName: activeSubscription.plan_name,
  //         expiryDate: activeSubscription.expiry_date,
  //         duration: activeSubscription.duration
  //       }
  //     });

  //   } catch (error) {
  //     console.error('Subscription status check error:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to check subscription status',
  //       error: error.message
  //     });
  //   }
  // });

  // // Check payment status
  // router.get('/status/by-link/:linkId', async (req, res) => {
  //   try {
  //     const { linkId } = req.params;

  //     if (!linkId) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Link ID is required'
  //       });
  //     }

  //     const paymentStatus = await checkPaymentStatus(linkId);

  //     res.json({
  //       success: true,
  //       data: paymentStatus
  //     });

  //   } catch (error) {
  //     console.error('Status check error:', error.message);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to check payment status',
  //       error: error.message
  //     });
  //   }
  // });

  // // Get payment details by order ID (for payment success flow)
  // router.get('/details/:orderId', async (req, res) => {
  //   try {
  //     const { orderId } = req.params;

  //     if (!orderId) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Order ID is required'
  //       });
  //     }

  //     // Find payment by link_id (which is the orderId from Cashfree)
  //     const payment = await PaymentLink.findOne({ link_id: orderId })
  //       .populate('plan_id');

  //     if (!payment) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'Payment not found'
  //       });
  //     }

  //     res.json({
  //       success: true,
  //       orderId: payment.link_id,
  //       userId: payment.userid,
  //       planId: payment.plan_id,
  //       planName: payment.plan_name,
  //       amount: payment.amount,
  //       status: payment.status,
  //       bundleId: payment.groupId, // This should contain the bundle/group ID
  //       expiryDate: payment.expiry_date,
  //       duration: payment.duration
  //     });

  //   } catch (error) {
  //     console.error('Error fetching payment details:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Error fetching payment details',
  //       error: error.message
  //     });
  //   }
  // });

  // // Get subscription status
  // router.get('/status/by-user/:userId', async (req, res) => {
  //   try {
  //     const { userId } = req.params;

  //     // Find the most recent payment for this user
  //     const payment = await PaymentLink.findOne({ userid: userId })
  //       .sort({ expiry_date: -1 })
  //       .populate('plan_id');

  //     if (!payment) {
  //       return res.status(404).json({ message: 'No subscription found' });
  //     }

  //     res.json({
  //       plan_name: payment.plan_name,
  //       expiry_date: payment.expiry_date,
  //       status: new Date(payment.expiry_date) > new Date() ? 'active' : 'expired'
  //     });
  //   } catch (error) {
  //     console.error('Error fetching subscription status:', error);
  //     res.status(500).json({ message: 'Error fetching subscription status' });
  //   }
  // });

  // // Update user's Telegram User ID
  // router.post('/update-telegram-id', async (req, res) => {
  //   try {
  //     const { userId, telegramUserId } = req.body;

  //     if (!userId || !telegramUserId) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Both userId and telegramUserId are required'
  //       });
  //     }

  //     // Update user's telegramUserId
  //     const updatedUser = await User.findByIdAndUpdate(
  //       userId,
  //       { telegramUserId: telegramUserId.toString() },
  //       { new: true }
  //     );

  //     if (!updatedUser) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'User not found'
  //       });
  //     }

  //     console.log(`Updated telegramUserId for user ${userId}: ${telegramUserId}`);

  //     res.json({
  //       success: true,
  //       message: 'Telegram User ID updated successfully',
  //       user: {
  //         id: updatedUser._id,
  //         telegramUserId: updatedUser.telegramUserId
  //       }
  //     });

  //   } catch (error) {
  //     console.error('Error updating telegram user ID:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Error updating telegram user ID',
  //       error: error.message
  //     });
  //   }
  // });

  // // Get user's pending payments with detailed info
  // router.get('/pending/:phone', async (req, res) => {
  //   try {
  //     const { phone } = req.params;
  //     console.log(`📋 Fetching pending payments for phone: ${phone}`);

  //     // Find all pending payments for this phone number
  //     const pendingPayments = await PaymentLink.find({
  //       phone: phone,
  //       status: 'PENDING'
  //     }).populate('plan_id').sort({ createdAt: -1 });

  //     if (pendingPayments.length === 0) {
  //       return res.json({
  //         success: true,
  //         message: 'No pending payments found',
  //         pendingPayments: []
  //       });
  //     }

  //     const currentTime = new Date();
  //     const thirtyMinutesAgo = new Date(currentTime.getTime() - 30 * 60 * 1000);

  //     // Categorize payments by age and bundle
  //     const categorizedPayments = pendingPayments.map(payment => {
  //       const ageInMinutes = Math.floor((currentTime - payment.createdAt) / (60 * 1000));
  //       const isStale = payment.createdAt < thirtyMinutesAgo;

  //       return {
  //         id: payment._id,
  //         linkId: payment.link_id,
  //         linkUrl: payment.link_url,
  //         amount: payment.amount,
  //         planName: payment.plan_name,
  //         bundleId: payment.groupId,
  //         createdAt: payment.createdAt,
  //         ageInMinutes,
  //         isStale,
  //         timeRemaining: isStale ? 0 : Math.max(0, 30 - ageInMinutes),
  //         actions: {
  //           complete: {
  //             url: payment.link_url,
  //             label: 'Complete Payment',
  //             enabled: !isStale
  //           },
  //           cancel: {
  //             url: `/api/payment/cancel/${payment._id}`,
  //             label: 'Cancel Payment',
  //             enabled: true
  //           }
  //         }
  //       };
  //     });

  //     // Group by bundle for better UX
  //     const byBundle = {};
  //     categorizedPayments.forEach(payment => {
  //       const bundleKey = payment.bundleId ? payment.bundleId.toString() : 'unknown';
  //       if (!byBundle[bundleKey]) {
  //         byBundle[bundleKey] = [];
  //       }
  //       byBundle[bundleKey].push(payment);
  //     });

  //     res.json({
  //       success: true,
  //       message: `Found ${pendingPayments.length} pending payments`,
  //       pendingPayments: categorizedPayments,
  //       groupedByBundle: byBundle,
  //       summary: {
  //         total: pendingPayments.length,
  //         active: categorizedPayments.filter(p => !p.isStale).length,
  //         stale: categorizedPayments.filter(p => p.isStale).length
  //       }
  //     });

  //   } catch (error) {
  //     console.error('❌ Error fetching pending payments:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to fetch pending payments',
  //       error: error.message
  //     });
  //   }
  // });

  // // Auto-cleanup stale pending payments for a user
  // router.post('/cleanup-stale/:phone', async (req, res) => {
  //   try {
  //     const { phone } = req.params;
  //     console.log(`🧹 Starting cleanup of stale pending payments for phone: ${phone}`);

  //     const currentTime = new Date();
  //     const thirtyMinutesAgo = new Date(currentTime.getTime() - 30 * 60 * 1000);

  //     // Find and update stale pending payments
  //     const result = await PaymentLink.updateMany(
  //       {
  //         phone: phone,
  //         status: 'PENDING',
  //         createdAt: { $lt: thirtyMinutesAgo }
  //       },
  //       {
  //         status: 'EXPIRED',
  //         statusReason: 'Auto-expired due to inactivity (30+ minutes)',
  //         expiredAt: currentTime
  //       }
  //     );

  //     console.log(`✅ Cleanup completed: ${result.modifiedCount} payments expired`);

  //     res.json({
  //       success: true,
  //       message: `Cleaned up ${result.modifiedCount} stale pending payments`,
  //       modifiedCount: result.modifiedCount
  //     });

  //   } catch (error) {
  //     console.error('❌ Error during cleanup:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to cleanup stale payments',
  //       error: error.message
  //     });
  //   }
  // });

  // // Check if user can proceed with new payment (smart validation)
  // router.post('/can-proceed', async (req, res) => {
  //   try {
  //     const { phone, bundleId, planName } = req.body;

  //     if (!phone) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Phone number is required'
  //       });
  //     }

  //     console.log(`🔍 Checking payment eligibility for phone: ${phone}, bundle: ${bundleId}`);

  //     // Auto-cleanup stale payments first
  //     const currentTime = new Date();
  //     const thirtyMinutesAgo = new Date(currentTime.getTime() - 30 * 60 * 1000);

  //     await PaymentLink.updateMany(
  //       {
  //         phone: phone,
  //         status: 'PENDING',
  //         createdAt: { $lt: thirtyMinutesAgo }
  //       },
  //       {
  //         status: 'EXPIRED',
  //         statusReason: 'Auto-expired during eligibility check',
  //         expiredAt: currentTime
  //       }
  //     );

  //     // Check for active pending payments
  //     const activePendingPayments = await PaymentLink.find({
  //       phone: phone,
  //       status: 'PENDING',
  //       createdAt: { $gte: thirtyMinutesAgo }
  //     });

  //     if (activePendingPayments.length === 0) {
  //       return res.json({
  //         success: true,
  //         canProceed: true,
  //         message: 'Ready to create new payment',
  //         conflicts: []
  //       });
  //     }

  //     // Check for same-bundle conflicts
  //     const sameBundleConflicts = activePendingPayments.filter(p =>
  //       bundleId && p.groupId && p.groupId.toString() === bundleId.toString()
  //     );

  //     if (sameBundleConflicts.length > 0) {
  //       const conflict = sameBundleConflicts[0];
  //       const ageInMinutes = Math.floor((currentTime - conflict.createdAt) / (60 * 1000));

  //       return res.json({
  //         success: true,
  //         canProceed: false,
  //         message: `You have a pending payment for this bundle (${conflict.plan_name})`,
  //         conflicts: [{
  //           type: 'same_bundle',
  //           payment: {
  //             id: conflict._id,
  //             linkUrl: conflict.link_url,
  //             amount: conflict.amount,
  //             planName: conflict.plan_name,
  //             ageInMinutes,
  //             timeRemaining: Math.max(0, 30 - ageInMinutes)
  //           },
  //           actions: {
  //             complete: {
  //               url: conflict.link_url,
  //               label: 'Complete Existing Payment'
  //             },
  //             cancel: {
  //               url: `/api/payment/cancel/${conflict._id}`,
  //               label: 'Cancel & Start New'
  //             }
  //           }
  //         }],
  //         recommendation: 'complete_existing'
  //       });
  //     }

  //     // Different bundle - allow with warning
  //     return res.json({
  //       success: true,
  //       canProceed: true,
  //       message: 'Can proceed, but you have pending payments for other bundles',
  //       conflicts: activePendingPayments.map(p => ({
  //         type: 'different_bundle',
  //         payment: {
  //           id: p._id,
  //           amount: p.amount,
  //           planName: p.plan_name,
  //           ageInMinutes: Math.floor((currentTime - p.createdAt) / (60 * 1000))
  //         }
  //       })),
  //       recommendation: 'proceed_with_warning'
  //     });

  //   } catch (error) {
  //     console.error('❌ Error checking payment eligibility:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to check payment eligibility',
  //       error: error.message
  //     });
  //   }
  // });

  // // Cancel a pending payment
  // router.delete('/cancel/:paymentId', async (req, res) => {
  //   try {
  //     const { paymentId } = req.params;
  //     console.log(`🗑 Canceling payment request for ID: ${paymentId}`);

  //     // Find the payment
  //     const payment = await PaymentLink.findById(paymentId);
  //     if (!payment) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'Payment not found'
  //       });
  //     }

  //     // Only allow canceling PENDING payments
  //     if (payment.status !== 'PENDING') {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Can only cancel pending payments'
  //       });
  //     }

  //     // Update payment status to EXPIRED (closest to canceled in the enum)
  //     payment.status = 'EXPIRED';
  //     payment.canceledAt = new Date();
  //     await payment.save();

  //     console.log(`✅ Payment ${paymentId} canceled successfully`);

  //     res.json({
  //       success: true,
  //       message: 'Payment canceled successfully',
  //       payment: {
  //         id: payment._id,
  //         status: payment.status,
  //         canceledAt: payment.canceledAt
  //       }
  //     });
  //   } catch (error) {
  //     console.error('❌ Error canceling payment:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to cancel payment',
  //       error: error.message
  //     });
  //   }
  // });

  // // Mark payment as successful (for handling cases where user reaches success page before webhook)
  // router.post('/mark-success/:orderId', async (req, res) => {
  //   try {
  //     const { orderId } = req.params;
  //     console.log(`🔄 Manual success marking requested for order: ${orderId}`);

  //     // Find the payment by order ID
  //     const payment = await PaymentLink.findOne({
  //       $or: [
  //         { link_id: orderId },
  //         { order_id: orderId }
  //       ]
  //     });

  //     if (!payment) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'Payment not found'
  //       });
  //     }

  //     // Only update if payment is not already SUCCESS
  //     if (payment.status !== 'SUCCESS') {
  //       // Update payment status
  //       payment.status = 'SUCCESS';
  //       await payment.save();

  //       console.log(`✅ Payment ${orderId} manually marked as SUCCESS`);

  //       // Trigger the same success handling as webhook would
  //       try {
  //         const { handlePaymentSuccess } = require('../services/cashfreeService');
  //         await handlePaymentSuccess({
  //           order: {
  //             order_id: orderId
  //           }
  //         });
  //         console.log('✅ Payment success handling completed');
  //       } catch (handlerError) {
  //         console.warn('⚠ Payment success handling failed:', handlerError.message);
  //       }

  //       res.json({
  //         success: true,
  //         message: 'Payment marked as successful',
  //         payment: {
  //           id: payment._id,
  //           status: payment.status,
  //           orderId: orderId
  //         }
  //       });
  //     } else {
  //       res.json({
  //         success: true,
  //         message: 'Payment already marked as successful',
  //         payment: {
  //           id: payment._id,
  //           status: payment.status,
  //           orderId: orderId
  //         }
  //       });
  //     }
  //   } catch (error) {
  //     console.error('❌ Error marking payment as successful:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to mark payment as successful',
  //       error: error.message
  //     });
  //   }
  // });

  // // Webhook endpoint with security verification
  // router.post('/webhook', async (req, res) => {
  //   try {
  //     const webhookData = req.body;

  //     // Get signature and timestamp from headers
  //     const signature = req.headers['x-cashfree-signature'];
  //     const timestamp = req.headers['x-cashfree-timestamp'];
  //     const rawPayload = JSON.stringify(webhookData);

  //     console.log('Webhook received with headers:', {
  //       signature: signature ? 'present' : 'missing',
  //       timestamp: timestamp ? timestamp : 'missing',
  //       contentType: req.headers['content-type']
  //     });

  //     if (!signature || !timestamp) {
  //       console.error('Missing required webhook headers');
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Missing required webhook headers'
  //       });
  //     }

  //     const result = await handlePaymentWebhook(webhookData, rawPayload, signature, timestamp);

  //     res.status(200).json({
  //       success: true,
  //       message: 'Webhook processed successfully',
  //       ...result
  //     });
  //   } catch (error) {
  //     console.error('Webhook error:', error.message);

  //     // Return specific error status for security failures
  //     if (error.message && (error.message.includes('signature verification failed') ||
  //       error.message.includes('timestamp verification failed'))) {
  //       return res.status(401).json({
  //         success: false,
  //         message: 'Webhook verification failed'
  //       });
  //     }

  //     res.status(500).json({
  //       success: false,
  //       message: 'Webhook processing failed'
  //     });
  //   }
  // });

  // // Admin-specific analytics endpoints
  // router.get('/total-revenue', adminAuth, injectAdminContext, paymentController.getTotalRevenue);
  // router.get('/total-transactions', adminAuth, injectAdminContext, paymentController.getTotalTransactions);
  // router.get('/active-users', adminAuth, injectAdminContext, paymentController.getActiveUsers);
  // router.get('/recent-successful', adminAuth, injectAdminContext, paymentController.getRecentSuccessfulTransactions);

  // // Test endpoint to check Cashfree API configuration
  // router.get('/test-config', async (req, res) => {
  //   try {
  //     const config = {
  //       CASHFREE_BASE_URL: process.env.CASHFREE_BASE_URL,
  //       CASHFREE_CLIENT_ID: process.env.CASHFREE_CLIENT_ID ? 'SET' : 'MISSING',
  //       CASHFREE_CLIENT_SECRET: process.env.CASHFREE_CLIENT_SECRET ? 'SET' : 'MISSING',
  //       FRONTEND_URL: process.env.FRONTEND_URL,
  //       BACKEND_URL: process.env.BACKEND_URL,
  //       NODE_ENV: process.env.NODE_ENV
  //     };

  //     // Test if we can reach the Cashfree API - Skip actual API call for now
  //     let apiTest = 'Configuration appears valid';
  //     if (!process.env.CASHFREE_BASE_URL || !process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
  //       apiTest = 'Missing required configuration - check environment variables';
  //     } else {
  //       // Just validate the configuration format without making API call
  //       if (!process.env.CASHFREE_CLIENT_ID.startsWith('TEST') && !process.env.CASHFREE_CLIENT_ID.startsWith('CF')) {
  //         apiTest = 'Invalid Client ID format';
  //       } else if (!process.env.CASHFREE_CLIENT_SECRET.startsWith('cfsk_')) {
  //         apiTest = 'Invalid Client Secret format';
  //       } else {
  //         apiTest = 'Configuration validated - ready for payment processing';
  //       }
  //     }

  //     res.json({
  //       success: true,
  //       config,
  //       apiTest,
  //       timestamp: new Date().toISOString()
  //     });
  //   } catch (error) {
  //     res.status(500).json({
  //       success: false,
  //       error: error.message
  //     });
  //   }
  // });

  // // Test endpoint to create a minimal payment link
  // router.post('/test-create-link', async (req, res) => {
  //   try {
  //     const { customer_id, phone, amount } = req.body;

  //     if (!customer_id || !phone || !amount) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Missing required fields: customer_id, phone, amount'
  //       });
  //     }

  //     console.log('Testing payment link creation with:', { customer_id, phone, amount });

  //     const testPaymentData = {
  //       customer_id,
  //       phone,
  //       amount: parseFloat(amount),
  //       plan_id: 'test-plan',
  //       plan_name: 'Test Plan'
  //     };

  //     const paymentResponse = await createPaymentLinkWithRetry(testPaymentData, 1); // Only 1 retry for testing

  //     res.json({
  //       success: true,
  //       paymentLink: paymentResponse.link_url,
  //       orderId: paymentResponse.link_id,
  //       message: 'Test payment link created successfully'
  //     });

  //   } catch (error) {
  //     console.error('Test payment link creation error:', error.message);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Test payment link creation failed',
  //       error: error.message
  //     });
  //   }
  // });

  // // Payment cleanup management endpoints (admin only)
  // router.get('/cleanup/stats', adminAuth, async (req, res) => {
  //   try {
  //     const paymentCleanupService = require('../services/paymentCleanupService');
  //     const stats = paymentCleanupService.getStats();
  //     const pendingSummary = await paymentCleanupService.getPendingPaymentsSummary();
  //     const healthCheck = paymentCleanupService.healthCheck();

  //     res.json({
  //       success: true,
  //       cleanup: {
  //         stats,
  //         pendingSummary,
  //         healthCheck
  //       }
  //     });
  //   } catch (error) {
  //     console.error('❌ Error getting cleanup stats:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to get cleanup statistics',
  //       error: error.message
  //     });
  //   }
  // });

  // router.post('/cleanup/force', adminAuth, async (req, res) => {
  //   try {
  //     const paymentCleanupService = require('../services/paymentCleanupService');
  //     console.log('🔧 Admin triggered manual payment cleanup');

  //     const result = await paymentCleanupService.forceCleanup();

  //     res.json({
  //       success: true,
  //       message: 'Manual cleanup completed',
  //       result
  //     });
  //   } catch (error) {
  //     console.error('❌ Error during manual cleanup:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Manual cleanup failed',
  //       error: error.message
  //     });
  //   }
  // });

  // router.post('/cleanup/start', adminAuth, async (req, res) => {
  //   try {
  //     const paymentCleanupService = require('../services/paymentCleanupService');
  //     paymentCleanupService.startAutoCleanup();

  //     res.json({
  //       success: true,
  //       message: 'Payment cleanup service started',
  //       stats: paymentCleanupService.getStats()
  //     });
  //   } catch (error) {
  //     console.error('❌ Error starting cleanup service:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to start cleanup service',
  //       error: error.message
  //     });
  //   }
  // });

  // router.post('/cleanup/stop', adminAuth, async (req, res) => {
  //   try {
  //     const paymentCleanupService = require('../services/paymentCleanupService');
  //     paymentCleanupService.stopAutoCleanup();

  //     res.json({
  //       success: true,
  //       message: 'Payment cleanup service stopped',
  //       stats: paymentCleanupService.getStats()
  //     });
  //   } catch (error) {
  //     console.error('❌ Error stopping cleanup service:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to stop cleanup service',
  //       error: error.message
  //     });
  //   }
  // });

  // // New endpoints for dynamic fee management
  // router.post('/process-with-fee', adminAuth, paymentController.processPaymentWithFee);
  // router.patch('/:paymentId/update-with-fee', adminAuth, paymentController.updatePaymentWithFee);
  // router.get('/:paymentId/fee-details', adminAuth, paymentController.getPaymentWithFeeDetails);
  // router.post('/bulk-recalculate-fees', adminAuth, paymentController.bulkRecalculateFees);
  // router.post('/:paymentId/recalculate-fees', adminAuth, paymentController.recalculatePaymentFees);

  // module.exports = router;
// const express = require('express');
// const { createPaymentLink, createPaymentLinkWithRetry, checkPaymentStatus, handlePaymentWebhook } = require('../services/cashfreeService');
// const PaymentLink = require('../models/paymentLinkModel');

// const router = express.Router();

// // Create payment link endpoint
// // router.post('/create-payment-link', async (req, res) => {
// //   try {
// //     const { customer_id, phone, amount, plan_id, plan_name } = req.body;
// //     console.log(req.body);
    

// //     // Validation
// //     if (!customer_id || !phone || !amount) {
// //       return res.status(400).json({
// //         success: false,
// //         message: 'Missing required fields: customer_id, phone, amount'
// //       });
// //     }

// //     if (amount <= 0) {
// //       return res.status(400).json({
// //         success: false,
// //         message: 'Amount must be greater than 0'
// //       });
// //     }

// //     // Create payment link
// //     const paymentResponse = await createPaymentLinkWithRetry({
// //       customer_id,
// //       phone,
// //       amount,
// //       plan_id,
// //       plan_name
// //     });

// //     res.json({
// //       success: true,
// //       paymentLink: paymentResponse.link_url,
// //       orderId: paymentResponse.link_id,
// //       message: 'Payment link created successfully'
// //     });

// //   } catch (error) {
// //     console.error('Payment link creation error:', error.message);
// //     res.status(500).json({
// //       success: false,
// //       message: 'Failed to create payment link',
// //       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
// //     });
// //   }
// // });
// router.post('/create-payment-link', async (req, res) => {
//   try {
//     const { customer_id, phone, amount, plan_id, plan_name, userid } = req.body;

//     // Validation
//     if (!customer_id || !phone || !amount || !userid) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields: customer_id, phone, amount, userid'
//       });
//     }

//     if (amount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Amount must be greater than 0'
//       });
//     }

//     // Create payment link using Cashfree
//     const paymentResponse = await createPaymentLinkWithRetry({
//       customer_id,
//       phone,
//       amount,
//       plan_id,
//       plan_name
//     });

//     // Save in MONGODB
//     const newPayment = new PaymentLink({
//       userid,
//       link_id: paymentResponse.link_id,
//       link_url: paymentResponse.link_url,
//       customer_id,
//       phone,
//       amount,
//       plan_id,
//       plan_name,
//       status: 'PENDING'
//     });

//     await newPayment.save();

//     // Response
//     res.json({
//       success: true,
//       paymentLink: paymentResponse.link_url,
//       orderId: paymentResponse.link_id,
//       message: 'Payment link created and saved successfully'
//     });

//   } catch (error) {
//     console.error('Payment link creation error:', error.message);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create payment link',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   }
// });


// // Check payment status endpoint
// router.get('/status/:linkId', async (req, res) => {
//   try {
//     const { linkId } = req.params;

//     if (!linkId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Link ID is required'
//       });
//     }

//     const paymentStatus = await checkPaymentStatus(linkId);

//     res.json({
//       success: true,
//       data: paymentStatus
//     });

//   } catch (error) {
//     console.error('Payment status check error:', error.message);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to check payment status',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   }
// });

// // Webhook endpoint
// router.post('/webhook', async (req, res) => {
//   try {
//     const webhookData = req.body;
//     const result = await handlePaymentWebhook(webhookData); // <-- now async

//     res.status(200).json({
//       success: true,
//       message: 'Webhook processed successfully',
//       ...result
//     });
//   } catch (error) {
//     console.error('Webhook processing error:', error.message);
//     res.status(500).json({
//       success: false,
//       message: 'Webhook processing failed'
//     });
//   }
// });

// module.exports = router;


// routes/paymentRoutes.js
const express = require('express');
const { createPaymentLinkWithRetry, checkPaymentStatus, handlePaymentWebhook } = require('../services/cashfreeService');
const PaymentLink = require('../models/paymentLinkModel');
const paymentController = require('../controllers/paymentController');
const axios = require('axios');
const User = require('../models/user.model');
const adminAuth = require('../middlewares/adminAuth');
const injectAdminContext = require('../middlewares/injectAdminContext');
const notificationService = require('../services/notificationService');
const mongoose = require('mongoose');

const router = express.Router();

// Input validation middleware
const validatePaymentRequest = (req, res, next) => {
  const { customer_id, phone, amount, userid } = req.body;
  
  // Validate required fields
  if (!customer_id || !phone || !amount || !userid) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: customer_id, phone, amount, userid'
    });
  }

  // Validate amount is a positive number
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be a positive number'
    });
  }

  // Validate phone number format (basic validation)
  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format'
    });
  }

  // Validate user ID format (MongoDB ObjectId)
  if (!mongoose.Types.ObjectId.isValid(userid)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }

  // If we got here, all validations passed
  next();
};

// Apply rate limiting to payment endpoints
const rateLimit = require('express-rate-limit');

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many payment requests, please try again later'
  }
});

router.post('/create-payment-link', paymentLimiter, validatePaymentRequest, async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.startTransaction();
    
    const { 
      customer_id, 
      phone, 
      amount, 
      plan_id = 'default_plan',
      plan_name = 'Subscription Plan',
      userid,
      groupId,
      bundleId,
      expiry_date,
      duration,
      purchase_datetime
    } = req.body;
    
    // Convert amount to number and round to 2 decimal places
    const amountNum = parseFloat(amount).toFixed(2);
    
    // Check for duplicate pending payments
    const existingPayment = await PaymentLink.findOne({
      phone: phone,
      status: 'PENDING',
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).session(session);
    
    if (existingPayment) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'A pending payment already exists for this phone number',
        existingPaymentId: existingPayment._id
      });
    }

    console.log('Received payment request:', {
      customer_id,
      phone,
      amount,
      plan_id,
      plan_name,
      userid,
      purchase_datetime,
      expiry_date,
      duration
    });

    // Enhanced validation
    const missingFields = [];
    if (!customer_id) missingFields.push('customer_id');
    if (!phone) missingFields.push('phone');
    if (!amount) missingFields.push('amount');
    if (!userid) missingFields.push('userid');
    if (!expiry_date) missingFields.push('expiry_date');
    if (!duration) missingFields.push('duration');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        receivedData: { customer_id, phone, amount, userid, expiry_date, duration }
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
        receivedAmount: amount
      });
    }

    // Get adminId and groupId from plan first
    let adminId = null;
    // let groupId = null;
    
    if (plan_id) {
      try {
        const Plan = require('../models/plan');
        const plan = await Plan.findById(plan_id);
        if (plan) {
          adminId = plan.adminId;
          groupId = plan.groupId;
        } else {
          console.warn(`Plan not found for ID: ${plan_id}`);
        }
      } catch (error) {
        console.error('Error fetching plan for adminId:', error);
      }
    }
    
    // If no adminId from plan, we need to handle this case
    if (!adminId) {
      console.warn('No adminId found for payment - this may cause attribution issues');
    }

    // Check for existing subscription and handle extension
    let isExtension = false;
    let newExpiryDate = expiry_date ? new Date(expiry_date) : new Date();
    
    if (groupId) {
      try {
        const existingPayment = await PaymentLink.findOne({
          phone: phone,
          groupId: groupId,
          status: 'SUCCESS'
        }).sort({ expiry_date: -1 });

        if (existingPayment) {
          const now = new Date();
          const existingExpiry = new Date(existingPayment.expiry_date);
          
          // If existing subscription is still active, extend from its expiry date
          if (existingExpiry > now) {
            console.log('🔄 Extending active subscription');
            isExtension = true;
            
            // Calculate new expiry by adding duration to existing expiry
            const durationStr = duration.toLowerCase();
            let durationDays = 30;
            if (durationStr.includes('month')) {
              const months = parseInt(durationStr.match(/\d+/)?.[0] || '1');
              durationDays = months * 30;
            } else if (durationStr.includes('year')) {
              const years = parseInt(durationStr.match(/\d+/)?.[0] || '1');
              durationDays = years * 365;
            } else if (durationStr.includes('week')) {
              const weeks = parseInt(durationStr.match(/\d+/)?.[0] || '1');
              durationDays = weeks * 7;
            } else {
              const days = parseInt(durationStr.match(/\d+/)?.[0] || '30');
              durationDays = days;
            }
            
            newExpiryDate = new Date(existingExpiry);
            newExpiryDate.setDate(newExpiryDate.getDate() + durationDays);
            
            console.log(`Extension: Old expiry: ${existingExpiry}, New expiry: ${newExpiryDate}`);
          } else {
            // If expired, extend from current date
            console.log('🔄 Renewing expired subscription');
            isExtension = true;
            const durationStr = (duration || '').toString().toLowerCase();
            let durationDays = 30;
            if (durationStr.includes('month')) {
              const months = parseInt(durationStr.match(/\d+/)?.[0] || '1');
              durationDays = months * 30;
            } else if (durationStr.includes('year')) {
              const years = parseInt(durationStr.match(/\d+/)?.[0] || '1');
              durationDays = years * 365;
            } else if (durationStr.includes('week')) {
              const weeks = parseInt(durationStr.match(/\d+/)?.[0] || '1');
              durationDays = weeks * 7;
            } else {
              const days = parseInt(durationStr.match(/\d+/)?.[0] || '30');
              durationDays = days;
            }
            newExpiryDate = new Date();
            newExpiryDate.setDate(newExpiryDate.getDate() + durationDays);
          }
        }
        
        // Smart pending payment handling
        const pendingPayments = await PaymentLink.find({
          phone: phone,
          status: 'PENDING'
        }).sort({ createdAt: -1 });
        
        if (pendingPayments.length > 0) {
          const currentTime = new Date();
          const thirtyMinutesAgo = new Date(currentTime - 30 * 60 * 1000);
          
          // Auto-expire old pending payments (older than 30 minutes)
          const expiredPayments = pendingPayments.filter(p => p.createdAt < thirtyMinutesAgo);
          if (expiredPayments.length > 0) {
            await PaymentLink.updateMany(
              { _id: { $in: expiredPayments.map(p => p._id) } },
              { 
                status: 'EXPIRED', 
                statusReason: 'Auto-expired after 30 minutes of inactivity',
                expiredAt: currentTime
              }
            );
            console.log(`🧹 Auto-expired ${expiredPayments.length} stale pending payments for phone: ${phone}`);
          }
          
          // Check for active pending payments (within 30 minutes)
          const activePendingPayments = pendingPayments.filter(p => p.createdAt >= thirtyMinutesAgo);
          
          if (activePendingPayments.length > 0) {
            // Check if pending payment is for the SAME bundle
            const sameBundlePending = activePendingPayments.find(p => 
              p.groupId && p.groupId.toString() === groupId.toString()
            );
            
            if (sameBundlePending) {
              // For same bundle: provide options to continue or cancel
              return res.status(409).json({
                success: false,
                message: 'You have a pending payment for this bundle.',
                code: 'PENDING_SAME_BUNDLE',
                pendingPayment: {
                  id: sameBundlePending._id,
                  linkUrl: sameBundlePending.link_url,
                  amount: sameBundlePending.amount,
                  planName: sameBundlePending.plan_name,
                  createdAt: sameBundlePending.createdAt,
                  timeRemaining: Math.max(0, 30 - Math.floor((currentTime - sameBundlePending.createdAt) / (60 * 1000)))
                },
                actions: {
                  complete: {
                    url: sameBundlePending.link_url,
                    label: 'Complete Payment'
                  },
                  cancel: {
                    url: `/api/payment/cancel/${sameBundlePending._id}`,
                    label: 'Cancel & Start New'
                  }
                }
              });
            } else {
              // For different bundle: allow with warning about existing pending payments
              console.log(`⚠️ User has pending payment for different bundle, allowing new payment creation`);
              console.log(`Existing pending: ${activePendingPayments.map(p => p.plan_name).join(', ')}`);
              console.log(`New payment for: ${plan_name}`);
            }
          }
        }
        
      } catch (checkError) {
        console.error('Error checking existing purchase:', checkError);
        // Don't fail the request if check fails, just log and continue
      }
    }

    console.log('Creating payment link with Cashfree...');
    const paymentResponse = await createPaymentLinkWithRetry({
      customer_id,
      phone,
      amount,
      plan_id,
      plan_name
    });

    console.log('Payment link created successfully:', {
      link_id: paymentResponse.link_id,
      link_url: paymentResponse.link_url
    });

    console.log('Saving payment to database...');
    const newPayment = new PaymentLink({
      userid,
      link_id: paymentResponse.link_id,
      link_url: paymentResponse.link_url,
      customer_id,
      phone,
      amount,
      plan_id,
      plan_name,
      status: 'PENDING',
      purchase_datetime: purchase_datetime || new Date().toISOString(),
      expiry_date: newExpiryDate, // Use calculated expiry date for extensions
      duration,
      adminId: adminId,
      groupId: groupId,
      adminCommission: amount * 1.0, // 100% commission by default
      commissionRate: 100,
      isExtension: isExtension // Flag to indicate if this is an extension
    });

    const savedPayment = await newPayment.save();
    console.log('Payment saved to database:', savedPayment._id);

    // Send notification to admin about new payment link
    notificationService.notifyNewPaymentLink({
      link_id: savedPayment.link_id,
      amount: savedPayment.amount,
      customer_id: savedPayment.customer_id,
      phone: savedPayment.phone,
      plan_name: savedPayment.plan_name,
      adminId: savedPayment.adminId
    });

    // Commit the transaction
    await session.commitTransaction();

    res.json({
      success: true,
      paymentLink: paymentResponse.link_url,
      orderId: paymentResponse.link_id,
      message: 'Payment link created and saved',
      paymentId: newPayment._id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    });

  } catch (error) {
    // Abort transaction on error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    console.error('Payment link creation error:', {
      message: error.message,
      stack: error.stack,
      endpoint: '/create-payment-link',
      timestamp: new Date().toISOString()
    });
    
    // Log full error in development, generic message in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Failed to process payment request';
    
    // More specific error messages based on error type
    let statusCode = 500;
    if (error.name === 'ValidationError') {
      statusCode = 400;
    } else if (error.name === 'MongoError' && error.code === 11000) {
      statusCode = 409; // Conflict
    }
    
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      code: error.code,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Add a new endpoint to check subscription status
router.get('/subscription-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const activeSubscription = await PaymentLink.findOne({
      userid: userId,
      status: 'SUCCESS',
      expiry_date: { $gt: new Date() }
    }).sort({ expiry_date: -1 });

    if (!activeSubscription) {
      return res.json({
        success: true,
        hasActiveSubscription: false,
        message: 'No active subscription found'
      });
    }

    res.json({
      success: true,
      hasActiveSubscription: true,
      subscription: {
        planName: activeSubscription.plan_name,
        expiryDate: activeSubscription.expiry_date,
        duration: activeSubscription.duration
      }
    });

  } catch (error) {
    console.error('Subscription status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription status',
      error: error.message
    });
  }
});

// Check payment status
router.get('/status/by-link/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;

    if (!linkId) {
      return res.status(400).json({
        success: false,
        message: 'Link ID is required'
      });
    }

    const paymentStatus = await checkPaymentStatus(linkId);

    res.json({
      success: true,
      data: paymentStatus
    });

  } catch (error) {
    console.error('Status check error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: error.message
    });
  }
});

// Get payment details by order ID (for payment success flow)
router.get('/details/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Find payment by link_id (which is the orderId from Cashfree)
    const payment = await PaymentLink.findOne({ link_id: orderId })
      .populate('plan_id');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      orderId: payment.link_id,
      userId: payment.userid,
      planId: payment.plan_id,
      planName: payment.plan_name,
      amount: payment.amount,
      status: payment.status,
      bundleId: payment.groupId, // This should contain the bundle/group ID
      expiryDate: payment.expiry_date,
      duration: payment.duration
    });

  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment details',
      error: error.message
    });
  }
});

// Get subscription status
router.get('/status/by-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the most recent payment for this user
    const payment = await PaymentLink.findOne({ userid: userId })
      .sort({ expiry_date: -1 })
      .populate('plan_id');
    
    if (!payment) {
      return res.status(404).json({ message: 'No subscription found' });
    }

    res.json({
      plan_name: payment.plan_name,
      expiry_date: payment.expiry_date,
      status: new Date(payment.expiry_date) > new Date() ? 'active' : 'expired'
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ message: 'Error fetching subscription status' });
  }
});

// Update user's Telegram User ID
router.post('/update-telegram-id', async (req, res) => {
  try {
    const { userId, telegramUserId } = req.body;
    
    if (!userId || !telegramUserId) {
      return res.status(400).json({
        success: false,
        message: 'Both userId and telegramUserId are required'
      });
    }

    // Update user's telegramUserId
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { telegramUserId: telegramUserId.toString() },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`Updated telegramUserId for user ${userId}: ${telegramUserId}`);

    res.json({
      success: true,
      message: 'Telegram User ID updated successfully',
      user: {
        id: updatedUser._id,
        telegramUserId: updatedUser.telegramUserId
      }
    });

  } catch (error) {
    console.error('Error updating telegram user ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating telegram user ID',
      error: error.message
    });
  }
});

// Get user's pending payments with detailed info
router.get('/pending/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    console.log(`📋 Fetching pending payments for phone: ${phone}`);

    // Find all pending payments for this phone number
    const pendingPayments = await PaymentLink.find({
      phone: phone,
      status: 'PENDING'
    }).populate('plan_id').sort({ createdAt: -1 });

    if (pendingPayments.length === 0) {
      return res.json({
        success: true,
        message: 'No pending payments found',
        pendingPayments: []
      });
    }

    const currentTime = new Date();
    const thirtyMinutesAgo = new Date(currentTime - 30 * 60 * 1000);
    
    // Categorize payments by age and bundle
    const categorizedPayments = pendingPayments.map(payment => {
      const ageInMinutes = Math.floor((currentTime - payment.createdAt) / (60 * 1000));
      const isStale = payment.createdAt < thirtyMinutesAgo;
      
      return {
        id: payment._id,
        linkId: payment.link_id,
        linkUrl: payment.link_url,
        amount: payment.amount,
        planName: payment.plan_name,
        bundleId: payment.groupId,
        createdAt: payment.createdAt,
        ageInMinutes,
        isStale,
        timeRemaining: isStale ? 0 : Math.max(0, 30 - ageInMinutes),
        actions: {
          complete: {
            url: payment.link_url,
            label: 'Complete Payment',
            enabled: !isStale
          },
          cancel: {
            url: `/api/payment/cancel/${payment._id}`,
            label: 'Cancel Payment',
            enabled: true
          }
        }
      };
    });

    // Group by bundle for better UX
    const byBundle = {};
    categorizedPayments.forEach(payment => {
      const bundleKey = payment.bundleId || 'unknown';
      if (!byBundle[bundleKey]) {
        byBundle[bundleKey] = [];
      }
      byBundle[bundleKey].push(payment);
    });

    res.json({
      success: true,
      message: `Found ${pendingPayments.length} pending payments`,
      pendingPayments: categorizedPayments,
      groupedByBundle: byBundle,
      summary: {
        total: pendingPayments.length,
        active: categorizedPayments.filter(p => !p.isStale).length,
        stale: categorizedPayments.filter(p => p.isStale).length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching pending payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending payments',
      error: error.message
    });
  }
});

// Auto-cleanup stale pending payments for a user
router.post('/cleanup-stale/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    console.log(`🧹 Starting cleanup of stale pending payments for phone: ${phone}`);

    const currentTime = new Date();
    const thirtyMinutesAgo = new Date(currentTime - 30 * 60 * 1000);

    // Find and update stale pending payments
    const result = await PaymentLink.updateMany(
      {
        phone: phone,
        status: 'PENDING',
        createdAt: { $lt: thirtyMinutesAgo }
      },
      {
        status: 'EXPIRED',
        statusReason: 'Auto-expired due to inactivity (30+ minutes)',
        expiredAt: currentTime
      }
    );

    console.log(`✅ Cleanup completed: ${result.modifiedCount} payments expired`);

    res.json({
      success: true,
      message: `Cleaned up ${result.modifiedCount} stale pending payments`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup stale payments',
      error: error.message
    });
  }
});

// Check if user can proceed with new payment (smart validation)
router.post('/can-proceed', async (req, res) => {
  try {
    const { phone, bundleId, planName } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    console.log(`🔍 Checking payment eligibility for phone: ${phone}, bundle: ${bundleId}`);

    // Auto-cleanup stale payments first
    const currentTime = new Date();
    const thirtyMinutesAgo = new Date(currentTime - 30 * 60 * 1000);
    
    await PaymentLink.updateMany(
      {
        phone: phone,
        status: 'PENDING',
        createdAt: { $lt: thirtyMinutesAgo }
      },
      {
        status: 'EXPIRED',
        statusReason: 'Auto-expired during eligibility check',
        expiredAt: currentTime
      }
    );

    // Check for active pending payments
    const activePendingPayments = await PaymentLink.find({
      phone: phone,
      status: 'PENDING',
      createdAt: { $gte: thirtyMinutesAgo }
    });

    if (activePendingPayments.length === 0) {
      return res.json({
        success: true,
        canProceed: true,
        message: 'Ready to create new payment',
        conflicts: []
      });
    }

    // Check for same-bundle conflicts
    const sameBundleConflicts = activePendingPayments.filter(p => 
      bundleId && p.groupId && p.groupId.toString() === bundleId.toString()
    );

    if (sameBundleConflicts.length > 0) {
      const conflict = sameBundleConflicts[0];
      const ageInMinutes = Math.floor((currentTime - conflict.createdAt) / (60 * 1000));
      
      return res.json({
        success: true,
        canProceed: false,
        message: `You have a pending payment for this bundle (${conflict.plan_name})`,
        conflicts: [{
          type: 'same_bundle',
          payment: {
            id: conflict._id,
            linkUrl: conflict.link_url,
            amount: conflict.amount,
            planName: conflict.plan_name,
            ageInMinutes,
            timeRemaining: Math.max(0, 30 - ageInMinutes)
          },
          actions: {
            complete: {
              url: conflict.link_url,
              label: 'Complete Existing Payment'
            },
            cancel: {
              url: `/api/payment/cancel/${conflict._id}`,
              label: 'Cancel & Start New'
            }
          }
        }],
        recommendation: 'complete_existing'
      });
    }

    // Different bundle - allow with warning
    return res.json({
      success: true,
      canProceed: true,
      message: 'Can proceed, but you have pending payments for other bundles',
      conflicts: activePendingPayments.map(p => ({
        type: 'different_bundle',
        payment: {
          id: p._id,
          amount: p.amount,
          planName: p.plan_name,
          ageInMinutes: Math.floor((currentTime - p.createdAt) / (60 * 1000))
        }
      })),
      recommendation: 'proceed_with_warning'
    });

  } catch (error) {
    console.error('❌ Error checking payment eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment eligibility',
      error: error.message
    });
  }
});

// Cancel a pending payment
router.delete('/cancel/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    console.log(`🗑️ Canceling payment request for ID: ${paymentId}`);

    // Find the payment
    const payment = await PaymentLink.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Only allow canceling PENDING payments
    if (payment.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel pending payments'
      });
    }

    // Update payment status to EXPIRED (closest to canceled in the enum)
    payment.status = 'EXPIRED';
    payment.canceledAt = new Date();
    await payment.save();

    console.log(`✅ Payment ${paymentId} canceled successfully`);

    res.json({
      success: true,
      message: 'Payment canceled successfully',
      payment: {
        id: payment._id,
        status: payment.status,
        canceledAt: payment.canceledAt
      }
    });
  } catch (error) {
    console.error('❌ Error canceling payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel payment',
      error: error.message
    });
  }
});

// Mark payment as successful (for handling cases where user reaches success page before webhook)
router.post('/mark-success/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`🔄 Manual success marking requested for order: ${orderId}`);

    // Find the payment by order ID
    const payment = await PaymentLink.findOne({ 
      $or: [
        { link_id: orderId }, 
        { order_id: orderId }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Only update if payment is not already SUCCESS
    if (payment.status !== 'SUCCESS') {
      // Update payment status
      payment.status = 'SUCCESS';
      await payment.save();
      
      console.log(`✅ Payment ${orderId} manually marked as SUCCESS`);
      
      // Trigger the same success handling as webhook would
      try {
        const { handlePaymentSuccess } = require('../services/cashfreeService');
        await handlePaymentSuccess({
          order: {
            order_id: orderId
          }
        });
        console.log('✅ Payment success handling completed');
      } catch (handlerError) {
        console.warn('⚠️ Payment success handling failed:', handlerError.message);
      }

      res.json({
        success: true,
        message: 'Payment marked as successful',
        payment: {
          id: payment._id,
          status: payment.status,
          orderId: orderId
        }
      });
    } else {
      res.json({
        success: true,
        message: 'Payment already marked as successful',
        payment: {
          id: payment._id,
          status: payment.status,
          orderId: orderId
        }
      });
    }
  } catch (error) {
    console.error('❌ Error marking payment as successful:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark payment as successful',
      error: error.message
    });
  }
});

// Webhook endpoint with security verification
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    // Get signature and timestamp from headers
    const signature = req.headers['x-cashfree-signature'];
    const timestamp = req.headers['x-cashfree-timestamp'];
    const rawPayload = JSON.stringify(webhookData);

    console.log('Webhook received with headers:', {
      signature: signature ? 'present' : 'missing',
      timestamp: timestamp ? timestamp : 'missing',
      contentType: req.headers['content-type']
    });

    if (!signature || !timestamp) {
      console.error('Missing required webhook headers');
      return res.status(400).json({
        success: false,
        message: 'Missing required webhook headers'
      });
    }

    const result = await handlePaymentWebhook(webhookData, rawPayload, signature, timestamp);

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      ...result
    });
  } catch (error) {
    console.error('Webhook error:', error.message);
    
    // Return specific error status for security failures
    if (error.message.includes('signature verification failed') || 
        error.message.includes('timestamp verification failed')) {
      return res.status(401).json({
        success: false,
        message: 'Webhook verification failed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

// Admin-specific analytics endpoints
router.get('/total-revenue', adminAuth, injectAdminContext, paymentController.getTotalRevenue);
router.get('/total-transactions', adminAuth, injectAdminContext, paymentController.getTotalTransactions);
router.get('/active-users', adminAuth, injectAdminContext, paymentController.getActiveUsers);
router.get('/recent-successful', adminAuth, injectAdminContext, paymentController.getRecentSuccessfulTransactions);

// Test endpoint to check Cashfree API configuration
router.get('/test-config', async (req, res) => {
  try {
    const config = {
      CASHFREE_BASE_URL: process.env.CASHFREE_BASE_URL,
      CASHFREE_CLIENT_ID: process.env.CASHFREE_CLIENT_ID ? '***SET***' : '***MISSING***',
      CASHFREE_CLIENT_SECRET: process.env.CASHFREE_CLIENT_SECRET ? '***SET***' : '***MISSING***',
      FRONTEND_URL: process.env.FRONTEND_URL,
      BACKEND_URL: process.env.BACKEND_URL,
      NODE_ENV: process.env.NODE_ENV
    };

    // Test if we can reach the Cashfree API - Skip actual API call for now
    let apiTest = 'Configuration appears valid';
    if (!process.env.CASHFREE_BASE_URL || !process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
      apiTest = 'Missing required configuration - check environment variables';
    } else {
      // Just validate the configuration format without making API call
      if (!process.env.CASHFREE_CLIENT_ID.startsWith('TEST') && !process.env.CASHFREE_CLIENT_ID.startsWith('CF')) {
        apiTest = 'Invalid Client ID format';
      } else if (!process.env.CASHFREE_CLIENT_SECRET.startsWith('cfsk_')) {
        apiTest = 'Invalid Client Secret format';
      } else {
        apiTest = 'Configuration validated - ready for payment processing';
      }
    }

    res.json({
      success: true,
      config,
      apiTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint to create a minimal payment link
router.post('/test-create-link', async (req, res) => {
  try {
    const { customer_id, phone, amount } = req.body;
    
    if (!customer_id || !phone || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customer_id, phone, amount'
      });
    }

    console.log('Testing payment link creation with:', { customer_id, phone, amount });

    const testPaymentData = {
      customer_id,
      phone,
      amount: parseFloat(amount),
      plan_id: 'test-plan',
      plan_name: 'Test Plan'
    };

    const paymentResponse = await createPaymentLinkWithRetry(testPaymentData, 1); // Only 1 retry for testing

    res.json({
      success: true,
      paymentLink: paymentResponse.link_url,
      orderId: paymentResponse.link_id,
      message: 'Test payment link created successfully'
    });

  } catch (error) {
    console.error('Test payment link creation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Test payment link creation failed',
      error: error.message
    });
  }
});

// Payment cleanup management endpoints (admin only)
router.get('/cleanup/stats', adminAuth, async (req, res) => {
  try {
    const paymentCleanupService = require('../services/paymentCleanupService');
    const stats = paymentCleanupService.getStats();
    const pendingSummary = await paymentCleanupService.getPendingPaymentsSummary();
    const healthCheck = paymentCleanupService.healthCheck();
    
    res.json({
      success: true,
      cleanup: {
        stats,
        pendingSummary,
        healthCheck
      }
    });
  } catch (error) {
    console.error('❌ Error getting cleanup stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cleanup statistics',
      error: error.message
    });
  }
});

router.post('/cleanup/force', adminAuth, async (req, res) => {
  try {
    const paymentCleanupService = require('../services/paymentCleanupService');
    console.log('🔧 Admin triggered manual payment cleanup');
    
    const result = await paymentCleanupService.forceCleanup();
    
    res.json({
      success: true,
      message: 'Manual cleanup completed',
      result
    });
  } catch (error) {
    console.error('❌ Error during manual cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Manual cleanup failed',
      error: error.message
    });
  }
});

router.post('/cleanup/start', adminAuth, async (req, res) => {
  try {
    const paymentCleanupService = require('../services/paymentCleanupService');
    paymentCleanupService.startAutoCleanup();
    
    res.json({
      success: true,
      message: 'Payment cleanup service started',
      stats: paymentCleanupService.getStats()
    });
  } catch (error) {
    console.error('❌ Error starting cleanup service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start cleanup service',
      error: error.message
    });
  }
});

router.post('/cleanup/stop', adminAuth, async (req, res) => {
  try {
    const paymentCleanupService = require('../services/paymentCleanupService');
    paymentCleanupService.stopAutoCleanup();
    
    res.json({
      success: true,
      message: 'Payment cleanup service stopped',
      stats: paymentCleanupService.getStats()
    });
  } catch (error) {
    console.error('❌ Error stopping cleanup service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop cleanup service',
      error: error.message
    });
  }
});

// New endpoints for dynamic fee management
router.post('/process-with-fee', adminAuth, paymentController.processPaymentWithFee);
router.patch('/:paymentId/update-with-fee', adminAuth, paymentController.updatePaymentWithFee);
router.get('/:paymentId/fee-details', adminAuth, paymentController.getPaymentWithFeeDetails);
router.post('/bulk-recalculate-fees', adminAuth, paymentController.bulkRecalculateFees);
router.post('/:paymentId/recalculate-fees', adminAuth, paymentController.recalculatePaymentFees);

module.exports = router;