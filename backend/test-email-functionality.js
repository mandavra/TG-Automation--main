const emailService = require('./services/emailService');
require('dotenv').config();

/**
 * Test script to verify email functionality
 * Run with: node test-email-functionality.js
 */

async function testEmailFunctionality() {
  console.log('🧪 Testing Email Functionality...\n');

  // Check environment variables
  console.log('📋 Environment Variables Check:');
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
  console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set'}`);
  console.log('');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('❌ Email configuration missing!');
    console.log('Please set EMAIL_USER and EMAIL_PASS in your .env file');
    return;
  }

  // Test email address (change this to your email)
  const testEmail = process.env.EMAIL_USER; // Send to yourself for testing
  const userDetails = {
    firstName: 'Test User',
    email: testEmail
  };

  try {
    console.log('📧 Testing Single Channel Invite Email...');
    
    // Test single channel invite email
    await emailService.sendTelegramJoiningLinkEmail(testEmail, {
      ...userDetails,
      inviteLink: 'https://t.me/test_channel_invite_link'
    });
    
    console.log('✅ Single channel invite email sent successfully!');

    // Test channel bundle email
    console.log('\n📧 Testing Channel Bundle Email...');
    
    const emailData = {
      channelBundle: {
        id: 'test_bundle_id',
        name: 'Premium Channels Bundle'
      },
      generatedLinks: [
        {
          channelId: '@test_channel_1',
          channelTitle: 'Test Channel 1',
          inviteLink: 'https://t.me/test_channel_1_invite',
          linkId: 'link_1'
        },
        {
          channelId: '@test_channel_2', 
          channelTitle: 'Test Channel 2',
          inviteLink: 'https://t.me/test_channel_2_invite',
          linkId: 'link_2'
        }
      ],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };

    await emailService.sendTelegramChannelBundleEmail(testEmail, userDetails, emailData);
    console.log('✅ Channel bundle email sent successfully!');

    // Test payment confirmation email
    console.log('\n📧 Testing Payment Confirmation Email...');
    
    const paymentDetails = {
      amount: '999',
      transactionId: 'TXN_TEST_123456',
      status: 'SUCCESS'
    };

    await emailService.sendTelegramInviteWithPaymentEmail(
      testEmail, 
      userDetails, 
      paymentDetails, 
      'https://t.me/payment_confirmed_invite'
    );
    console.log('✅ Payment confirmation email sent successfully!');

    console.log('\n🎉 All email tests completed successfully!');
    console.log('📬 Check your email inbox for the test emails');
    console.log('📧 If you don\'t see emails, check your spam folder');

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your EMAIL_USER and EMAIL_PASS in .env file');
    console.log('2. For Gmail, use App Password (not regular password)');
    console.log('3. Ensure 2FA is enabled on your Gmail account');
    console.log('4. Check internet connection');
  }
}

// Run the test
testEmailFunctionality();
