const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const User = require('../models/user.model');
const Admin = require('../models/admin.model');

class RecoveryNotificationService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: process.env.NODE_ENV === 'production' 
      }
    });
  }

  async sendRecoveryNotification(payment, recoveryResult) {
    try {
      if (!payment || !payment.userid) {
        throw new Error('Invalid payment or user data');
      }

      const user = await User.findById(payment.userid);
      if (!user || !user.email) {
        throw new Error('User email not found');
      }

      const subject = recoveryResult.success
        ? 'Your Payment Recovery Was Successful!'
        : 'Payment Recovery Issue - Action Required';

      const html = this.getRecoveryEmailTemplate(payment, recoveryResult, user);
      
      await this.sendEmail({
        to: user.email,
        subject,
        html
      });

      logger.info(`Recovery notification sent to ${user.email} for payment ${payment._id}`);
      return true;
    } catch (error) {
      logger.error('Error sending recovery notification:', error);
      return false;
    }
  }

  async sendAdminAlert(payment, error) {
    try {
      const admins = await Admin.find({ receiveAlerts: true }).select('email name');
      if (!admins || admins.length === 0) {
        throw new Error('No admins configured to receive alerts');
      }

      const subject = `[Action Required] Payment Recovery Failed - ${payment._id}`;
      const html = this.getAdminAlertTemplate(payment, error);

      const results = await Promise.allSettled(
        admins.map(admin => 
          this.sendEmail({
            to: admin.email,
            subject,
            html: html.replace('{{adminName}}', admin.name || 'Admin')
          })
        )
      );

      const failedSends = results.filter(r => r.status === 'rejected');
      if (failedSends.length > 0) {
        throw new Error(`Failed to send to ${failedSends.length} admins`);
      }

      return true;
    } catch (error) {
      logger.error('Error sending admin alert:', error);
      return false;
    }
  }

  async sendEmail({ to, subject, html, text }) {
    if (!to) {
      throw new Error('No recipient specified');
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Payment Recovery System'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com'}>`,
      to,
      subject,
      html,
      text: text || this.htmlToText(html)
    };

    const info = await this.transporter.sendMail(mailOptions);
    logger.debug(`Email sent: ${info.messageId}`);
    return info;
  }

  // Helper method to convert HTML to plain text
  htmlToText(html) {
    return html
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ')     // Collapse whitespace
      .trim();
  }

  getRecoveryEmailTemplate(payment, recoveryResult, user) {
    const userName = user.firstName || 'Valued Customer';
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';
    const supportPhone = process.env.SUPPORT_PHONE || '1-800-123-4567';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4a6fdc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button {
            display: inline-block; 
            padding: 10px 20px; 
            background-color: #4a6fdc; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px;
            margin: 10px 0;
          }
          .footer { 
            margin-top: 20px; 
            font-size: 12px; 
            color: #777; 
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${recoveryResult.success ? 'Payment Recovered Successfully!' : 'Payment Recovery Issue'}</h1>
          </div>
          
          <div class="content">
            <p>Hello ${userName},</p>
            
            ${recoveryResult.success ? `
              <p>We're happy to inform you that your payment has been successfully processed and your subscription has been activated.</p>
              <p><strong>Order ID:</strong> ${payment._id}</p>
              <p><strong>Amount:</strong> ₹${payment.amount}</p>
              <p><strong>Plan:</strong> ${payment.plan_name || 'Premium Subscription'}</p>
              <p>You now have full access to all the subscribed features.</p>
            ` : `
              <p>We encountered an issue while processing your payment recovery. Here are the details:</p>
              <p><strong>Error:</strong> ${recoveryResult.error || 'Unknown error occurred'}</p>
              <p>Our team has been notified and is working to resolve this issue.</p>
              <p>If you need immediate assistance, please contact our support team.</p>
            `}
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">
                Go to Dashboard
              </a>
            </div>
            
            <p>If you have any questions or need further assistance, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>The ${process.env.COMPANY_NAME || 'Payment Recovery'} Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>Contact our support team at: ${supportEmail} or ${supportPhone}</p>
            <p>© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Payment Recovery System'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getAdminAlertTemplate(payment, error) {
    const adminName = '{{adminName}}';
    const dashboardUrl = `${process.env.ADMIN_PANEL_URL}/payments/${payment._id}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .details { 
            background-color: white; 
            padding: 15px; 
            border-left: 4px solid #dc3545;
            margin: 15px 0;
          }
          .button {
            display: inline-block; 
            padding: 10px 20px; 
            background-color: #dc3545; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px;
            margin: 10px 0;
          }
          .footer { 
            margin-top: 20px; 
            font-size: 12px; 
            color: #777; 
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Payment Recovery Failed - Manual Intervention Required</h2>
          </div>
          
          <div class="content">
            <p>Hello ${adminName},</p>
            
            <p>An automatic payment recovery attempt has failed and requires your attention.</p>
            
            <div class="details">
              <h3>Payment Details</h3>
              <p><strong>Payment ID:</strong> ${payment._id}</p>
              <p><strong>Amount:</strong> ₹${payment.amount}</p>
              <p><strong>Customer:</strong> ${payment.userid?.name || 'N/A'}</p>
              <p><strong>Plan:</strong> ${payment.plan_name || 'N/A'}</p>
              <p><strong>Error:</strong> ${error.message || 'Unknown error'}</p>
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
              ${error.stack ? `<pre style="background: #f0f0f0; padding: 10px; overflow-x: auto;">${error.stack}</pre>` : ''}
            </div>
            
            <p><strong>Recommended Actions:</strong></p>
            <ol>
              <li>Review the payment details in the admin panel</li>
              <li>Check the payment gateway for any issues</li>
              <li>Contact the customer if necessary</li>
              <li>Update the payment status manually if resolved</li>
            </ol>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${dashboardUrl}" class="button">
                View Payment in Admin Panel
              </a>
            </div>
            
            <p>This is an automated alert. The system will retry the recovery process according to the configured schedule.</p>
          </div>
          
          <div class="footer">
            <p>You're receiving this email because you're listed as an administrator.</p>
            <p>© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Payment Recovery System'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new RecoveryNotificationService();
