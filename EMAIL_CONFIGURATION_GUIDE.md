# 📧 Email Configuration Guide

## 🔧 **Email Setup for Telegram Invite Links**

This guide explains how to configure email functionality for sending Telegram invite links to users.

### **1. Environment Variables Required**

Create a `.env` file in the `backend` directory with the following email configuration:

```env
# Email Configuration (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Alternative SMTP Configuration (if not using Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### **2. Gmail Setup (Recommended)**

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `EMAIL_PASS` (not your regular Gmail password)

### **3. Email Functions Available**

The system now includes these email functions:

#### **Single Channel Invite Email**
- **Function**: `sendTelegramJoiningLinkEmail()`
- **Purpose**: Sends invite link for a single Telegram channel
- **Template**: Professional email with join button and instructions

#### **Channel Bundle Email**
- **Function**: `sendTelegramChannelBundleEmail()`
- **Purpose**: Sends multiple invite links for channel bundles
- **Template**: Lists all channels with individual join buttons

#### **Payment Confirmation Email**
- **Function**: `sendTelegramInviteWithPaymentEmail()`
- **Purpose**: Sends invite link with payment confirmation details
- **Template**: Includes payment details and access link

### **4. How Email Sending Works**

#### **Automatic Email Triggers**
1. **After Payment**: When user completes payment, email is sent automatically
2. **After Document Signing**: When user completes e-signature, email is sent
3. **Channel Bundle Access**: When user gets access to multiple channels

#### **Manual Email Triggers**
- Admin can manually send invite links via API endpoints
- System can resend emails if needed

### **5. Email Templates**

All email templates include:
- ✅ Professional HTML formatting
- ✅ Mobile-responsive design
- ✅ Clear call-to-action buttons
- ✅ Step-by-step instructions
- ✅ Support contact information

### **6. Testing Email Functionality**

Use the test script to verify email configuration:

```bash
# Run the email test
node test-email-functionality.js
```

### **7. Troubleshooting**

#### **Common Issues**

1. **"Authentication failed"**
   - Check if you're using App Password (not regular password)
   - Ensure 2FA is enabled on Gmail

2. **"Connection timeout"**
   - Check internet connection
   - Verify SMTP settings

3. **"Email not received"**
   - Check spam folder
   - Verify email address is correct
   - Check email service logs

#### **Debug Steps**

1. Check environment variables are loaded:
   ```javascript
   console.log('EMAIL_USER:', process.env.EMAIL_USER);
   console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
   ```

2. Test email transporter:
   ```javascript
   const transporter = nodemailer.createTransporter({...});
   transporter.verify((error, success) => {
     if (error) console.log('Email config error:', error);
     else console.log('Email config OK');
   });
   ```

### **8. Production Setup**

For production, consider:
- Using a dedicated email service (SendGrid, Mailgun, etc.)
- Setting up proper SPF/DKIM records
- Monitoring email delivery rates
- Setting up email bounce handling

### **9. Security Notes**

- Never commit `.env` file to version control
- Use environment-specific email accounts
- Monitor email sending limits
- Implement rate limiting for email sending

---

## ✅ **Status: Email System Fixed**

The missing email functions have been added:
- ✅ `sendTelegramChannelBundleEmail()` - Added
- ✅ `sendTelegramInviteWithPaymentEmail()` - Added
- ✅ All email templates are professional and mobile-friendly
- ✅ Error handling is implemented
- ✅ Email configuration guide created

**Next Steps:**
1. Set up environment variables
2. Test email functionality
3. Deploy to production
