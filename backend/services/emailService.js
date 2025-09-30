const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendInvoiceEmail = async (recipientEmail, invoiceDetails, localPdfPath) => {
  try {
    // Read the PDF file from the local file system
    const pdfBuffer = fs.readFileSync(localPdfPath);
    const filename = path.basename(localPdfPath);

    // Compute breakdown for email display
    const totalNum = Number(invoiceDetails.total || 0);
    const igstAmtNum = Number(invoiceDetails.igstAmt || 0);
    const cgstAmtNum = Number(invoiceDetails.cgstAmt || 0);
    const sgstAmtNum = Number(invoiceDetails.sgstAmt || 0);
    const taxSum = igstAmtNum + cgstAmtNum + sgstAmtNum;
    const baseNum = Number((totalNum - taxSum).toFixed(2));
    const currency = '₹';
    const formatINR = (n) => `${currency}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    const showIGST = igstAmtNum > 0 || (!cgstAmtNum && !sgstAmtNum);
    const gstLabel = showIGST
      ? (invoiceDetails.igst ? `IGST@${invoiceDetails.igst}%` : 'IGST')
      : ((invoiceDetails.cgst || invoiceDetails.sgst)
          ? `CGST@${invoiceDetails.cgst || 0}% + SGST@${invoiceDetails.sgst || 0}%`
          : 'CGST + SGST');
    const gstAmountToShow = showIGST ? igstAmtNum : (cgstAmtNum + sgstAmtNum);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `Invoice from ${invoiceDetails.creatorName}`,
      html: `
        <p>Dear ${invoiceDetails.billedToName},</p>
        <p>Please find attached your invoice. Summary is below:</p>
        <p><strong>Invoice Number:</strong> ${invoiceDetails.invoiceNo}</p>
        <p><strong>Bill Date:</strong> ${new Date(invoiceDetails.billDate).toLocaleDateString()}</p>
        ${invoiceDetails.billedToState ? `<p><strong>State:</strong> ${invoiceDetails.billedToState}</p>` : ''}
        ${invoiceDetails.planName ? `<p><strong>Plan:</strong> ${invoiceDetails.planName}</p>` : ''}
        ${invoiceDetails.description ? `<p><strong>Description:</strong> ${invoiceDetails.description}</p>` : ''}

        <div style="margin:16px 0; padding:12px; border:1px solid #e6eef7; background:#f8fbff; border-radius:6px; max-width:520px;">
          <h3 style="margin:0 0 8px 0; color:#0f172a;">Payment Breakdown & Tax Details</h3>
          <table style="width:100%; font-family: Arial, sans-serif; font-size:14px;">
            <tr>
              <td style="color:#1e3d59; font-weight:bold; padding:4px 0;">Plan Price (Base)</td>
              <td style="text-align:right; color:#1e3d59; padding:4px 0;">${formatINR(baseNum)}</td>
            </tr>
            <tr>
              <td style="color:#1e3d59; font-weight:bold; padding:4px 0;">Sub Total</td>
              <td style="text-align:right; color:#1e3d59; padding:4px 0;">${formatINR(baseNum)}</td>
            </tr>
            <tr>
              <td style="color:#1e3d59; font-weight:bold; padding:4px 0;">${gstLabel}</td>
              <td style="text-align:right; color:#1e3d59; padding:4px 0;">${formatINR(gstAmountToShow)}</td>
            </tr>
            <tr>
              <td colspan="2"><div style="border-top:1px solid #e5e7eb; margin:8px 0;"></div></td>
            </tr>
            <tr>
              <td style="color:#0f172a; font-weight:bold; padding:4px 0;">Total Amount (Incl. GST)</td>
              <td style="text-align:right; color:#2563eb; font-weight:bold; padding:4px 0;">${formatINR(totalNum)}</td>
            </tr>
          </table>
        </div>

        <p>Thank you for your business!</p>
        <p>Regards,</p>
        <p>${invoiceDetails.creatorName}</p>
      `,
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(`Invoice email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Error sending invoice email to ${recipientEmail}:`, error);
    throw new Error('Failed to send invoice email.');
  }
};

// Send welcome email after E-sign completion
const sendWelcomeEmail = async (recipientEmail, userDetails) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: 'Welcome! Your Subscription is Active 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2e7d32;">🎉 Welcome ${userDetails.firstName}!</h2>
          
          <p>Congratulations! Your subscription has been successfully activated.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">What happens next?</h3>
            <ul style="line-height: 1.6;">
              <li>✅ Your payment has been processed</li>
              <li>✅ Your documents have been signed</li>
              <li>🎫 You'll receive your Telegram access link shortly</li>
              <li>📧 All documents will be sent to your email</li>
            </ul>
          </div>
          
          <p><strong>Important:</strong> Please check your email for:</p>
          <ul>
            <li>📄 Your signed subscription agreement</li>
            <li>🧾 Payment invoice</li>
            <li>🔗 Telegram channel access link</li>
          </ul>
          
          <p>Thank you for choosing our premium service!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 12px;">If you have any questions, please contact our support team.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Error sending welcome email to ${recipientEmail}:`, error);
    throw new Error('Failed to send welcome email.');
  }
};

// Send signed document via email
const sendSignedDocumentEmail = async (recipientEmail, userDetails, documentBuffer) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: 'Your Signed Subscription Agreement',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2e7d32;">📄 Your Signed Document</h2>
          
          <p>Dear ${userDetails.firstName},</p>
          
          <p>Please find attached your signed subscription agreement.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📋 Document Details:</strong></p>
            <ul>
              <li>Document ID: ${userDetails.documentId}</li>
              <li>Signed on: ${new Date().toLocaleDateString()}</li>
              <li>Status: ✅ Completed</li>
            </ul>
          </div>
          
          <p>Please keep this document for your records.</p>
          
          <p>Best regards,<br>Your Subscription Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `signed_agreement_${userDetails.documentId}.pdf`,
          content: documentBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(`Signed document email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Error sending signed document email to ${recipientEmail}:`, error);
    throw new Error('Failed to send signed document email.');
  }
};

// Send Telegram joining link email
const sendTelegramJoiningLinkEmail = async (recipientEmail, userDetails) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: '🚀 Your Telegram Channel Access is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0088cc;">🚀 Your Channel Access is Ready!</h2>
          
          <p>Hello ${userDetails.firstName},</p>
          
          <p>Great news! Your subscription is now active and your Telegram channel access is ready.</p>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #1976d2; margin-top: 0;">🎫 Your Access Link</h3>
            <a href="${userDetails.inviteLink}" 
               style="display: inline-block; background: #0088cc; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
              Join Telegram Channel
            </a>
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
              This is a one-time access link. Click to join the premium channel.
            </p>
          </div>
          
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #f57c00; margin-top: 0;">📱 How to Join:</h4>
            <ol style="line-height: 1.6;">
              <li>Click the "Join Telegram Channel" button above</li>
              <li>You'll be redirected to Telegram</li>
              <li>Click "Request to Join" in Telegram</li>
              <li>You'll be automatically approved within seconds</li>
            </ol>
          </div>
          
          <p><strong>Note:</strong> This link is valid for your subscription period and will expire when your subscription ends.</p>
          
          <p>Enjoy your premium content! 🎉</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 12px;">
            If you have any issues accessing the channel, please contact our support team.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Telegram joining link email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Error sending Telegram joining link email to ${recipientEmail}:`, error);
    throw new Error('Failed to send Telegram joining link email.');
  }
};

// Send subscription renewal reminder
const sendRenewalReminderEmail = async (recipientEmail, userDetails, daysUntilExpiry) => {
  try {
    const urgencyLevel = daysUntilExpiry <= 1 ? 'urgent' : 'reminder';
    const subject = daysUntilExpiry <= 1 ? 
      '⚠️ Your Subscription Expires Today!' : 
      `⏰ Subscription Renewal Reminder - ${daysUntilExpiry} days left`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${urgencyLevel === 'urgent' ? '#d32f2f' : '#ff8f00'};">⏰ Subscription Renewal Notice</h2>
          
          <p>Dear ${userDetails.firstName},</p>
          
          <p>This is a ${urgencyLevel === 'urgent' ? 'final' : 'friendly'} reminder that your subscription will expire 
             <strong>${daysUntilExpiry <= 1 ? 'today' : `in ${daysUntilExpiry} days`}</strong>.</p>
          
          <div style="background: ${urgencyLevel === 'urgent' ? '#ffebee' : '#fff8e1'}; 
                      padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: ${urgencyLevel === 'urgent' ? '#d32f2f' : '#f57c00'}; margin-top: 0;">
              📅 Subscription Details
            </h3>
            <ul>
              <li><strong>Plan:</strong> ${userDetails.planName}</li>
              <li><strong>Expires:</strong> ${userDetails.expiryDate}</li>
              <li><strong>Days Remaining:</strong> ${daysUntilExpiry}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${userDetails.renewalLink}" 
               style="display: inline-block; background: #4caf50; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Renew Your Subscription
            </a>
          </div>
          
          <p><strong>What happens if you don't renew?</strong></p>
          <ul>
            <li>❌ You'll lose access to the premium Telegram channel</li>
            <li>❌ All subscription benefits will be suspended</li>
            <li>❌ You'll need to go through the full signup process again</li>
          </ul>
          
          <p>Renew now to continue enjoying uninterrupted access to premium content!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 12px;">
            Questions? Contact our support team for assistance.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Renewal reminder email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Error sending renewal reminder email to ${recipientEmail}:`, error);
    throw new Error('Failed to send renewal reminder email.');
  }
};

// Send subscription expired notification
const sendSubscriptionExpiredEmail = async (recipientEmail, userDetails) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: '❌ Your Subscription Has Expired',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">❌ Subscription Expired</h2>
          
          <p>Dear ${userDetails.firstName},</p>
          
          <p>Unfortunately, your subscription has expired and your access to premium services has been suspended.</p>
          
          <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
            <h3 style="color: #d32f2f; margin-top: 0;">⚠️ Account Status</h3>
            <ul>
              <li><strong>Plan:</strong> ${userDetails.planName}</li>
              <li><strong>Expired On:</strong> ${userDetails.expiryDate}</li>
              <li><strong>Status:</strong> ❌ Inactive</li>
            </ul>
          </div>
          
          <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #f57c00; margin-top: 0;">🔒 What's been suspended:</h3>
            <ul>
              <li>❌ Telegram channel access has been removed</li>
              <li>❌ Premium features are no longer available</li>
              <li>❌ Download access has been disabled</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${userDetails.renewalLink}" 
               style="display: inline-block; background: #ff5722; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Renew Now to Restore Access
            </a>
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #2e7d32; margin-top: 0;">💡 Good News!</h4>
            <p>Your account data is safe. Renew anytime to restore full access to your premium benefits.</p>
          </div>
          
          <p>We hope to see you back soon!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 12px;">
            Questions about renewals? Contact our support team for assistance.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Subscription expired email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Error sending subscription expired email to ${recipientEmail}:`, error);
    throw new Error('Failed to send subscription expired email.');
  }
};

// Send Telegram channel bundle email with multiple invite links
const sendTelegramChannelBundleEmail = async (recipientEmail, userDetails, emailData) => {
  try {
    const { channelBundle, generatedLinks, expiryDate } = emailData;
    
    // Create HTML for multiple invite links
    const linksHtml = generatedLinks.map(link => `
      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #1976d2;">
        <h4 style="color: #1976d2; margin-top: 0;">📺 ${link.channelTitle}</h4>
        <a href="${link.inviteLink}" 
           style="display: inline-block; background: #0088cc; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold; margin: 5px 0;">
          Join Channel
        </a>
        <p style="font-size: 12px; color: #666; margin: 5px 0;">
          Channel ID: ${link.channelId}
        </p>
      </div>
    `).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `🎉 Your Premium Channel Bundle Access is Ready!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0088cc;">🎉 Your Channel Bundle Access is Ready!</h2>
          
          <p>Hello ${userDetails.firstName},</p>
          
          <p>Excellent news! Your subscription is now active and you have access to multiple premium Telegram channels.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">📦 Channel Bundle Details</h3>
            <ul>
              <li><strong>Bundle Name:</strong> ${channelBundle.name}</li>
              <li><strong>Total Channels:</strong> ${generatedLinks.length}</li>
              ${expiryDate ? `<li><strong>Expires:</strong> ${new Date(expiryDate).toLocaleDateString()}</li>` : ''}
            </ul>
          </div>
          
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #f57c00; margin-top: 0;">📱 Your Channel Access Links</h4>
            <p>Click on any of the links below to join the respective channels:</p>
          </div>
          
          ${linksHtml}
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #2e7d32; margin-top: 0;">📋 How to Join:</h4>
            <ol style="line-height: 1.6;">
              <li>Click any "Join Channel" button above</li>
              <li>You'll be redirected to Telegram</li>
              <li>Click "Request to Join" in Telegram</li>
              <li>You'll be automatically approved within seconds</li>
              <li>Repeat for all channels you want to access</li>
            </ol>
          </div>
          
          <p><strong>Note:</strong> These links are valid for your subscription period and will expire when your subscription ends.</p>
          
          <p>Enjoy your premium content across all channels! 🎉</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 12px;">
            If you have any issues accessing the channels, please contact our support team.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Telegram channel bundle email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Error sending Telegram channel bundle email to ${recipientEmail}:`, error);
    throw new Error('Failed to send Telegram channel bundle email.');
  }
};

// Send Telegram invite with payment confirmation
const sendTelegramInviteWithPaymentEmail = async (recipientEmail, userDetails, paymentDetails, inviteLink) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: '✅ Payment Confirmed - Your Telegram Access is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2e7d32;">✅ Payment Confirmed!</h2>
          
          <p>Hello ${userDetails.firstName},</p>
          
          <p>Great news! Your payment has been successfully processed and your Telegram channel access is now ready.</p>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
            <h3 style="color: #2e7d32; margin-top: 0;">💳 Payment Details</h3>
            <ul>
              <li><strong>Amount:</strong> ₹${paymentDetails.amount || 'N/A'}</li>
              <li><strong>Transaction ID:</strong> ${paymentDetails.transactionId || 'N/A'}</li>
              <li><strong>Status:</strong> ✅ Confirmed</li>
              <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
          </div>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #1976d2; margin-top: 0;">🎫 Your Access Link</h3>
            <a href="${inviteLink}" 
               style="display: inline-block; background: #0088cc; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
              Join Telegram Channel
            </a>
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
              This is a one-time access link. Click to join the premium channel.
            </p>
          </div>
          
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #f57c00; margin-top: 0;">📱 How to Join:</h4>
            <ol style="line-height: 1.6;">
              <li>Click the "Join Telegram Channel" button above</li>
              <li>You'll be redirected to Telegram</li>
              <li>Click "Request to Join" in Telegram</li>
              <li>You'll be automatically approved within seconds</li>
            </ol>
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1976d2; margin-top: 0;">📧 What's Next?</h4>
            <ul>
              <li>📄 You'll receive your signed subscription agreement</li>
              <li>🧾 Payment invoice will be sent to your email</li>
              <li>🔗 Use the link above to access your premium channel</li>
            </ul>
          </div>
          
          <p>Thank you for your payment! Enjoy your premium content! 🎉</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 12px;">
            If you have any questions about your payment or channel access, please contact our support team.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Telegram invite with payment confirmation email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Error sending Telegram invite with payment email to ${recipientEmail}:`, error);
    throw new Error('Failed to send Telegram invite with payment email.');
  }
};

module.exports = {
  sendInvoiceEmail,
  sendWelcomeEmail,
  sendSignedDocumentEmail,
  sendTelegramJoiningLinkEmail,
  sendTelegramChannelBundleEmail,
  sendTelegramInviteWithPaymentEmail,
  sendRenewalReminderEmail,
  sendSubscriptionExpiredEmail
};
