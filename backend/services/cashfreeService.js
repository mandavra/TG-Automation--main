// const axios = require('axios');
// const { v4: uuidv4 } = require('uuid');
// const crypto = require('crypto');

// // Helper to ensure URLs are always HTTPS
// const ensureHttpsUrl = (url, fallback) => {
//   if (!url) return fallback;
//   return url.startsWith('https://') ? url : fallback;
// };

// // Create a payment link
// const createPaymentLink = async ({ customer_id, phone, amount, plan_id, plan_name }) => {
//   const linkId = `TG-${uuidv4()}`;

//   // Validate env
//   if (!process.env.CASHFREE_BASE_URL || !process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
//     throw new Error(
//       'Missing Cashfree API configuration. Please check CASHFREE_BASE_URL, CASHFREE_CLIENT_ID, and CASHFREE_CLIENT_SECRET in your .env.'
//     );
//   }

//   // Validate params
//   if (!customer_id || !phone || !amount) {
//     throw new Error('Missing required parameters: customer_id, phone, amount');
//   }
//   if (amount <= 0) {
//     throw new Error('Amount must be greater than 0');
//   }

//   // Ensure HTTPS URLs
//   const frontendBaseUrl = ensureHttpsUrl(
//     process.env.FRONTEND_URL
//   );
//   const backendBaseUrl = ensureHttpsUrl(
//     process.env.BACKEND_URL
//   );

//   const requestPayload = {
//     link_id: linkId,
//     customer_details: {
//       customer_id,
//       customer_phone: phone
//     },
//     link_notify: {
//       send_sms: true,
//       send_email: false
//     },
//     link_meta: {
//       return_url: "http://localhost:5173/payment-success?status=success&order_id=TG-xxxx",
//       notify_url: "http://localhost:4000/api/payment/webhook",  // ← COMMA HERE
//       plan_id: plan_id || '',
//       customer_id,
//       plan_name: plan_name || 'Plan Purchase'
//     },
//     link_amount: amount,
//     link_currency: 'INR',
//     link_purpose: plan_name || 'Telegram Subscription',
//     link_expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
//     link_minimum_partial_amount: amount
//   };

//   console.log('Creating payment link with payload:', JSON.stringify(requestPayload, null, 2));

//   try {
//     const apiUrl = `${process.env.CASHFREE_BASE_URL}/pg/links`;
//     console.log('Making request to:', apiUrl);

//     const response = await axios.post(apiUrl, requestPayload, {
//       headers: {
//         'x-client-id': process.env.CASHFREE_CLIENT_ID,
//         'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
//         'x-api-version': '2022-09-01',
//         'Content-Type': 'application/json'
//       },
//       timeout: 40000,
//       validateStatus: (status) => status < 500
//     });

//     console.log('Cashfree API response status:', response.status);
//     console.log('Cashfree API response:', JSON.stringify(response.data, null, 2));

//     if (response.status >= 400) {
//       throw new Error(`Cashfree API error (${response.status}): ${JSON.stringify(response.data)}`);
//     }

//     if (!response.data || !response.data.link_url) {
//       throw new Error('Invalid response from payment gateway - missing payment link');
//     }

//     return {
//       ...response.data,
//       link_id: linkId
//     };
//   } catch (error) {
//     console.error('Cashfree API Error Details:');
//     console.error('Status:', error.response?.status);
//     console.error('Status Text:', error.response?.statusText);
//     console.error('Response Data:', error.response?.data);
//     console.error('Request Payload:', JSON.stringify(requestPayload, null, 2));

//     if (error.response?.status === 401) {
//       throw new Error('Cashfree API authentication failed. Check CLIENT_ID and CLIENT_SECRET.');
//     } else if (error.response?.status === 400) {
//       throw new Error(`Cashfree API validation error: ${JSON.stringify(error.response.data)}`);
//     } else if (error.response?.status === 404) {
//       throw new Error('Cashfree API endpoint not found. Check CASHFREE_BASE_URL.');
//     } else if (error.response?.status === 429) {
//       throw new Error('Cashfree API rate limit exceeded.');
//     } else if (error.code === 'ECONNABORTED') {
//       throw new Error('Cashfree API request timed out.');
//     } else if (error.code === 'ENOTFOUND') {
//       throw new Error('Unable to connect to Cashfree API.');
//     } else {
//       throw new Error(`Cashfree API error: ${error.response?.data?.message || error.message}`);
//     }
//   }
// };

// const checkPaymentStatus = async (linkId) => {
//   try {
//     const response = await axios.get(
//       `${process.env.CASHFREE_BASE_URL}/pg/links/${linkId}`,
//       {
//         headers: {
//           'x-client-id': process.env.CASHFREE_CLIENT_ID,
//           'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
//           'x-api-version': '2022-09-01',
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//     return response.data;
//   } catch (error) {
//     console.error('Payment status check error:', error.response?.data || error.message);
//     throw error;
//   }
// };

// const verifyWebhookSignature = (payload, signature, timestamp) => {
//   if (!payload || !signature || !timestamp) return false;
//   if (!process.env.CASHFREE_WEBHOOK_SECRET) return false;

//   try {
//     const timestampMs = parseInt(timestamp, 10);
//     if (isNaN(timestampMs)) return false;

//     const currentTime = Math.floor(Date.now() / 1000);
//     if (Math.abs(currentTime - timestampMs) > 300) return false;

//     const signedPayload =` ${timestamp}.${payload}`;
//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
//       .update(signedPayload)
//       .digest('hex');

//     return crypto.timingSafeEqual(
//       Buffer.from(signature, 'utf8'),
//       Buffer.from(expectedSignature, 'utf8')
//     );
//   } catch (error) {
//     console.error('Webhook signature verification error:', error);
//     return false;
//   }
// };

// const handlePaymentWebhook = async (webhookData, rawPayload, signature, timestamp) => {
//   try {
//     console.log('Payment webhook received:', {
//       type: webhookData.type,
//       order_id: webhookData.data?.order?.order_id
//     });

//     if (!verifyWebhookSignature(rawPayload, signature, timestamp)) {
//       throw new Error('Invalid webhook signature');
//     }

//     const { type, data } = webhookData;

//     switch (type) {
//       case 'PAYMENT_SUCCESS_WEBHOOK':
//         await handlePaymentSuccess(data);
//         break;
//       case 'PAYMENT_FAILED_WEBHOOK':
//         await handlePaymentFailure(data);
//         break;
//       default:
//         console.log('Unknown webhook type:', type);
//     }

//     return { status: 'processed', verified: true };
//   } catch (error) {
//     console.error('Webhook processing error:', error);
//     throw error;
//   }
// };

// const handlePaymentSuccess = async (data) => {
//   const PaymentLink = require('../models/paymentLinkModel');
//   const notificationService = require('./notificationService');
//   const { generateAndStoreInviteLink } = require('./generateOneTimeInviteLink');

//   try {
//     const orderId = data.order?.order_id;
//     if (!orderId) return;

//     const utrValue = data.order?.utr || data.order?.reference_id || null;
//     const payment = await PaymentLink.findOneAndUpdate(
//       { link_id: orderId },
//       { status: 'SUCCESS', ...(utrValue ? { utr: utrValue } : {}) },
//       { new: true }
//     ).populate('groupId');

//     if (!payment) return;

//     console.log(`✅ Payment SUCCESS for user: ${payment.userid}`);

//     try {
//       const { triggerTelegramLinksIfReady } = require('../utils/stepCompletionChecker');
//       const linkResult = await triggerTelegramLinksIfReady(payment.userid, payment._id);

//       if (!linkResult.linksGenerated) {
//         const fallbackLink = await generateAndStoreInviteLink(
//           payment.userid,
//           payment.duration || 86400
//         );
//         console.log(`🎫 Fallback invite link generated: ${fallbackLink.link}`);
//       }
//     } catch (error) {
//       console.error('Telegram link generation error:', error.message);
//     }

//     notificationService.notifyPaymentSuccess({
//       link_id: payment.link_id,
//       amount: payment.amount,
//       customer_id: payment.customer_id,
//       phone: payment.phone,
//       plan_name: payment.plan_name,
//       adminId: payment.adminId,
//       groupId: payment.groupId?._id,
//       duration: payment.duration
//     });
//   } catch (error) {
//     console.error('Error handling payment success:', error);
//   }
// };

// const handlePaymentFailure = async (data) => {
//   const PaymentLink = require('../models/paymentLinkModel');
//   const notificationService = require('./notificationService');

//   try {
//     const orderId = data.order?.order_id;
//     if (!orderId) return;

//     const payment = await PaymentLink.findOneAndUpdate(
//       { link_id: orderId },
//       { status: 'FAILED' },
//       { new: true }
//     );

//     if (payment) {
//       console.log(`❌ Payment FAILED for user: ${payment.userid}`);
//       notificationService.notifyPaymentFailed({
//         link_id: payment.link_id,
//         amount: payment.amount,
//         customer_id: payment.customer_id,
//         phone: payment.phone,
//         plan_name: payment.plan_name,
//         adminId: payment.adminId
//       });
//     }
//   } catch (error) {
//     console.error('Error handling payment failure:', error);
//   }
// };

// const createPaymentLinkWithRetry = async (paymentData, retries = 3) => {
//   let lastError;

//   for (let i = 0; i < retries; i++) {
//     try {
//       console.log(`Attempt ${i + 1} of ${retries} to create payment link`);
//       return await createPaymentLink(paymentData);
//     } catch (error) {
//       lastError = error;
//       console.error(`Attempt ${i + 1} failed:, error.message`);
//       if (i === retries - 1) throw new Error(`Failed after ${retries} attempts: ${error.message}`);
//       await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
//     }
//   }
// };

// module.exports = {
//   createPaymentLink,
//   createPaymentLinkWithRetry,
//   checkPaymentStatus,
//   handlePaymentWebhook,
//   handlePaymentSuccess,
//   verifyWebhookSignature
// };
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Helper to ensure URLs are always HTTPS
const ensureHttpsUrl = (url, fallback) => {
  if (!url) return fallback;
  return url.startsWith('https://') ? url : fallback;
};

// ──────────────────────────────────────────────────────────────
// Create a payment link
// ──────────────────────────────────────────────────────────────
const createPaymentLink = async ({ customer_id, phone, amount, plan_id, plan_name }) => {
  const linkId = `TG-${uuidv4()}`;

  if (!process.env.CASHFREE_BASE_URL || !process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
    throw new Error(
      'Missing Cashfree API configuration. Please check CASHFREE_BASE_URL, CASHFREE_CLIENT_ID, and CASHFREE_CLIENT_SECRET in your .env.'
    );
  }

  if (!customer_id || !phone || !amount) {
    throw new Error('Missing required parameters: customer_id, phone, amount');
  }
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  const frontendBaseUrl = ensureHttpsUrl(process.env.FRONTEND_URL);
  const backendBaseUrl = ensureHttpsUrl(process.env.BACKEND_URL);

  const requestPayload = {
    link_id: linkId,
    customer_details: {
      customer_id,
      customer_phone: phone
    },
    link_notify: {
      send_sms: true,
      send_email: false
    },
    link_meta: {
      return_url: `${frontendBaseUrl || 'http://localhost:5173'}/payment-success?status=success&order_id=${linkId}`,
      notify_url: `${backendBaseUrl || 'http://localhost:4000'}/api/payment/webhook`,
      plan_id: plan_id || '',
      customer_id,
      plan_name: plan_name || 'Plan Purchase'
    },
    link_amount: amount,
    link_currency: 'INR',
    link_purpose: plan_name || 'Telegram Subscription',
    link_expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    link_minimum_partial_amount: amount
  };

  console.log('Creating payment link with payload:', JSON.stringify(requestPayload, null, 2));

  try {
    const apiUrl = `${process.env.CASHFREE_BASE_URL}/pg/links`;
    console.log('Making request to:', apiUrl);

    const response = await axios.post(apiUrl, requestPayload, {
      headers: {
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        'x-api-version': '2022-09-01',
        'Content-Type': 'application/json'
      },
      timeout: 40000,
      validateStatus: (status) => status < 500
    });

    console.log('Cashfree API response status:', response.status);
    console.log('Cashfree API response:', JSON.stringify(response.data, null, 2));

    if (response.status >= 400) {
      throw new Error(`Cashfree API error (${response.status}): ${JSON.stringify(response.data)}`);
    }

    if (!response.data || !response.data.link_url) {
      throw new Error('Invalid response from payment gateway - missing payment link');
    }

    return {
      ...response.data,
      link_id: linkId
    };
  } catch (error) {
    console.error('Cashfree API Error Details:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Response Data:', error.response?.data);
    console.error('Request Payload:', JSON.stringify(requestPayload, null, 2));

    if (error.response?.status === 401) {
      throw new Error('Cashfree API authentication failed. Check CLIENT_ID and CLIENT_SECRET.');
    } else if (error.response?.status === 400) {
      throw new Error(`Cashfree API validation error: ${JSON.stringify(error.response.data)}`);
    } else if (error.response?.status === 404) {
      throw new Error('Cashfree API endpoint not found. Check CASHFREE_BASE_URL.');
    } else if (error.response?.status === 429) {
      throw new Error('Cashfree API rate limit exceeded.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Cashfree API request timed out.');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Unable to connect to Cashfree API.');
    } else {
      throw new Error(`Cashfree API error: ${error.response?.data?.message || error.message}`);
    }
  }
};

// ──────────────────────────────────────────────────────────────
// Check payment status
// ──────────────────────────────────────────────────────────────
const checkPaymentStatus = async (linkId) => {
  try {
    const response = await axios.get(
      `${process.env.CASHFREE_BASE_URL}/pg/links/${linkId}`,
      {
        headers: {
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
          'x-api-version': '2022-09-01',
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Payment status check error:', error.response?.data || error.message);
    throw error;
  }
};

// ──────────────────────────────────────────────────────────────
// Verify webhook signature
// ──────────────────────────────────────────────────────────────
const verifyWebhookSignature = (payload, signature, timestamp) => {
  if (!payload || !signature || !timestamp) return false;
  if (!process.env.CASHFREE_WEBHOOK_SECRET) return false;

  try {
    const timestampMs = parseInt(timestamp, 10);
    if (isNaN(timestampMs)) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - timestampMs) > 300) return false;

    // ✅ FIX: no leading space
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
};

// ──────────────────────────────────────────────────────────────
// Webhook handler
// ──────────────────────────────────────────────────────────────
const handlePaymentWebhook = async (webhookData, rawPayload, signature, timestamp) => {
  try {
    console.log('Payment webhook received:', {
      type: webhookData.type,
      order_id: webhookData.data?.order?.order_id
    });

    if (!verifyWebhookSignature(rawPayload, signature, timestamp)) {
      throw new Error('Invalid webhook signature');
    }

    const { type, data } = webhookData;

    switch (type) {
      case 'PAYMENT_SUCCESS_WEBHOOK':
        await handlePaymentSuccess(data);
        break;
      case 'PAYMENT_FAILED_WEBHOOK':
        await handlePaymentFailure(data);
        break;
      default:
        console.log('Unknown webhook type:', type);
    }

    return { status: 'processed', verified: true };
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw error;
  }
};

// ──────────────────────────────────────────────────────────────
// Payment success
// ──────────────────────────────────────────────────────────────
const handlePaymentSuccess = async (data) => {
  const PaymentLink = require('../models/paymentLinkModel');
  const notificationService = require('./notificationService');
  const { generateAndStoreInviteLink } = require('./generateOneTimeInviteLink');

  try {
    // ✅ Use link_id from Cashfree
    const linkId = data.order?.link_id || data.link_id || data.order_id || data.data?.order_id;
    if (!linkId) return;

    // Try to derive UTR/Reference from multiple possible locations
    const utrCandidates = [
      data.order?.utr,
      data.order?.reference_id,
      data.payment?.bank_reference,
      data.payment?.rrn,
      data.payment?.reference_id,
      data.payment?.utr,
      data.payment?.payment_id,
      data.payment?.cf_payment_id,
      data?.reference_id,
      data?.utr,
      data?.rrn
    ].filter(v => typeof v === 'string' && v.trim().length >= 6);

    const utrValue = utrCandidates.length > 0 ? utrCandidates[0].trim() : null;

    const payment = await PaymentLink.findOneAndUpdate(
      { link_id: linkId },
      { status: 'SUCCESS', ...(utrValue ? { utr: utrValue } : {}), updatedAt: new Date() },
      { new: true }
    ).populate('groupId');

    if (!payment) return;

    console.log(`✅ Payment SUCCESS for user: ${payment.userid}`);

    try {
      const { triggerTelegramLinksIfReady } = require('../utils/stepCompletionChecker');
      const linkResult = await triggerTelegramLinksIfReady(payment.userid, payment._id);

      if (!linkResult.linksGenerated) {
        // Convert payment duration to seconds for fallback link
        const { convertDurationToSeconds } = require('../utils/durationConverter');

        const durationInSeconds = convertDurationToSeconds(payment.duration);
        console.log(`📊 Fallback payment duration: ${payment.duration} -> ${durationInSeconds} seconds`);

        const fallbackLink = await generateAndStoreInviteLink(
          payment.userid,
          durationInSeconds
        );
        console.log(`🎫 Fallback invite link generated: ${fallbackLink.link}`);
      }
    } catch (error) {
      console.error('Telegram link generation error:', error.message);
    }

    notificationService.notifyPaymentSuccess({
      link_id: payment.link_id,
      amount: payment.amount,
      customer_id: payment.customer_id,
      phone: payment.phone,
      plan_name: payment.plan_name,
      adminId: payment.adminId,
      groupId: payment.groupId?._id,
      duration: payment.duration
    });
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

// ──────────────────────────────────────────────────────────────
// Payment failure
// ──────────────────────────────────────────────────────────────
const handlePaymentFailure = async (data) => {
  const PaymentLink = require('../models/paymentLinkModel');
  const notificationService = require('./notificationService');

  try {
    const linkId = data.order?.link_id;
    if (!linkId) return;

    const payment = await PaymentLink.findOneAndUpdate(
      { link_id: linkId },
      { status: 'FAILED', updatedAt: new Date() },
      { new: true }
    );

    if (payment) {
      console.log(`❌ Payment FAILED for user: ${payment.userid}`);
      notificationService.notifyPaymentFailed({
        link_id: payment.link_id,
        amount: payment.amount,
        customer_id: payment.customer_id,
        phone: payment.phone,
        plan_name: payment.plan_name,
        adminId: payment.adminId
      });
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};

// ──────────────────────────────────────────────────────────────
// Retry wrapper
// ──────────────────────────────────────────────────────────────
const createPaymentLinkWithRetry = async (paymentData, retries = 3) => {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i + 1} of ${retries} to create payment link`);
      return await createPaymentLink(paymentData);
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw new Error(`Failed after ${retries} attempts: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

// ──────────────────────────────────────────────────────────────
module.exports = {
  createPaymentLink,
  createPaymentLinkWithRetry,
  checkPaymentStatus,
  handlePaymentWebhook,
  handlePaymentSuccess,
  verifyWebhookSignature
};
