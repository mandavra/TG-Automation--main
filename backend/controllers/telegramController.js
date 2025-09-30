const { checkInviteLinkValidity, validateInviteLink, revokeInviteLink } = require('../services/generateOneTimeInviteLink');
const User = require('../models/user.model');
const InviteLink = require('../models/InviteLink');
const crypto = require('crypto');
const axios = require('axios');

// Webhook endpoint for Telegram bot to validate join requests
const validateJoinRequest = async (req, res) => {
  try {
    const { invite_link, telegram_user_id, user_info, channel_id } = req.body;

    if (!invite_link || !telegram_user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: invite_link and telegram_user_id' 
      });
    }

    console.log(`🔍 Simple validation for: ${telegram_user_id} with link: ${invite_link}`);

    // ULTRA SIMPLE: Just check if link exists and is not used
    const linkRecord = await InviteLink.findOne({
      link: invite_link,
      is_used: false
    });

    if (!linkRecord) {
      console.log(`❌ Link not found or already used: ${invite_link}`);
      return res.status(200).json({
        approve: false,
        reason: 'Link not found or already used'
      });
    }

    // Mark as used immediately (this prevents double-usage)
    await InviteLink.findByIdAndUpdate(linkRecord._id, {
      is_used: true,
      used_by: telegram_user_id,
      used_at: new Date(),
      telegramUserId: telegram_user_id
    });

    // CREATE CHANNEL MEMBER RECORD FOR EXPIRY TRACKING
    // Use actual payment expiry date instead of hardcoded duration
    const ChannelMember = require('../models/ChannelMember');
    const PaymentLink = require('../models/paymentLinkModel');

    const joinTime = new Date(); // RIGHT NOW when they join
    let expiryTime;

    // Try to get actual subscription expiry from payment
    console.log(`🔍 Link record details:`, {
      linkId: linkRecord._id,
      paymentLinkId: linkRecord.paymentLinkId,
      userId: linkRecord.userId,
      duration: linkRecord.duration
    });

    if (linkRecord.paymentLinkId) {
      try {
        const payment = await PaymentLink.findById(linkRecord.paymentLinkId);
        if (payment && payment.expiry_date) {
          expiryTime = new Date(payment.expiry_date);
          console.log(`🎯 Using actual payment expiry: ${expiryTime.toLocaleString()}`);
        } else {
          console.log(`⚠️ Payment found but no expiry_date:`, payment);
        }
      } catch (error) {
        console.error('⚠️ Could not fetch payment expiry:', error.message);
      }
    } else {
      console.log(`⚠️ No paymentLinkId in invite link record`);

      // Alternative: Try to find payment by userId if available
      if (linkRecord.userId) {
        try {
          console.log(`🔍 Trying to find payment by userId: ${linkRecord.userId}`);
          const payment = await PaymentLink.findOne({
            userid: linkRecord.userId,
            status: 'SUCCESS'
          }).sort({ createdAt: -1 });

          if (payment && payment.expiry_date) {
            expiryTime = new Date(payment.expiry_date);
            console.log(`🎯 Found payment by userId - using expiry: ${expiryTime.toLocaleString()}`);
          } else {
            console.log(`⚠️ No successful payment found for userId: ${linkRecord.userId}`);
          }
        } catch (error) {
          console.error('⚠️ Error finding payment by userId:', error.message);
        }
      }
    }

    // Fallback to duration calculation if no payment expiry found
    if (!expiryTime) {
      const duration = linkRecord.duration || 86400; // Duration from link (in seconds)
      expiryTime = new Date(joinTime.getTime() + (duration * 1000));
      console.log(`⚠️ Using fallback duration calculation: ${duration} seconds`);
    }

    await ChannelMember.findOneAndUpdate(
      { 
        telegramUserId: telegram_user_id,
        channelId: channel_id || linkRecord.channelId || process.env.CHANNEL_ID 
      },
      {
        telegramUserId: telegram_user_id,
        channelId: channel_id || linkRecord.channelId || process.env.CHANNEL_ID,
        joinedAt: joinTime, // Subscription starts NOW
        expiresAt: expiryTime, // Expires after duration from NOW
        isActive: true,
        inviteLinkUsed: invite_link,
        userInfo: {
          firstName: user_info?.first_name || 'Unknown',
          lastName: user_info?.last_name || '',
          username: user_info?.username || ''
        }
      },
      { upsert: true, new: true }
    );

    console.log(`✅ APPROVED: ${telegram_user_id} using link ${invite_link}`);
    console.log(`⏰ Subscription starts NOW, expires at: ${expiryTime.toLocaleString()}`);

    // Calculate remaining time from now to expiry
    const remainingSeconds = Math.floor((expiryTime.getTime() - joinTime.getTime()) / 1000);
    const remainingDays = Math.floor(remainingSeconds / (24 * 60 * 60));
    console.log(`📊 Subscription duration: ${remainingDays} days (${remainingSeconds} seconds)`);
    
    return res.status(200).json({
      approve: true,
      message: 'Access granted - link used',
      expires_at: expiryTime.toISOString(),
      duration_seconds: remainingSeconds
    });

  } catch (error) {
    console.error('❌ Error in validation:', error.message);
    return res.status(500).json({
      error: 'Server error',
      approve: false
    });
  }
};

// Endpoint to check if a user should be kicked (for expiry checks)
const checkUserExpiry = async (req, res) => {
  try {
    const { telegram_user_id } = req.params;

    if (!telegram_user_id) {
      return res.status(400).json({ error: 'telegram_user_id is required' });
    }

    // Find user by telegram ID
    const user = await User.findOne({ telegramUserId: telegram_user_id });

    if (!user) {
      return res.status(404).json({ 
        shouldKick: true,
        reason: 'User not found in database'
      });
    }

    // Check if user has active subscription (this depends on your payment model)
    // For now, we'll assume if user exists, they're active
    // You might want to check against PaymentLink expiry or subscription status

    return res.status(200).json({
      shouldKick: false,
      user_id: user._id,
      email: user.email
    });

  } catch (error) {
    console.error('Error checking user expiry:', error);
    return res.status(500).json({
      error: 'Internal server error',
      shouldKick: true
    });
  }
};

// Endpoint to notify backend when user is kicked from Telegram
const notifyUserKicked = async (req, res) => {
  try {
    const { telegram_user_id, reason } = req.body;

    if (!telegram_user_id) {
      return res.status(400).json({ error: 'telegram_user_id is required' });
    }

    console.log(`📢 User ${telegram_user_id} was kicked from Telegram. Reason: ${reason || 'Not specified'}`);

    // You might want to log this or update user status
    // For example, mark user as inactive or log the kick event

    return res.status(200).json({
      success: true,
      message: 'Kick notification received'
    });

  } catch (error) {
    console.error('Error processing kick notification:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Endpoint to store test invite links from bot
const storeTestLink = async (req, res) => {
  try {
    const { link, link_id, expires_at, duration } = req.body;

    if (!link || !expires_at) {
      return res.status(400).json({ error: 'Missing required fields: link, expires_at' });
    }

    console.log(`📝 Storing test invite link: ${link}`);

    const InviteLink = require('../models/InviteLink');
    
    const newLink = new InviteLink({
      link: link,
      link_id: link_id || `test_${Date.now()}`,
      telegramUserId: null,
      userId: null, // Test link
      is_used: false,
      expires_at: new Date(expires_at),
      duration: duration || 3600
    });

    await newLink.save();
    console.log(`✅ Test invite link stored with ID: ${newLink._id}`);

    return res.status(200).json({
      success: true,
      message: 'Test invite link stored successfully',
      link_id: newLink._id
    });

  } catch (error) {
    console.error('Error storing test invite link:', error);
    return res.status(500).json({
      error: 'Internal server error while storing test link'
    });
  }
};

// Handle user join notifications (simplified)
const handleUserJoined = async (req, res) => {
  try {
    const { telegram_user_id, channel_id, joined_at } = req.body;

    console.log(`✅ User ${telegram_user_id} joined channel ${channel_id} at ${joined_at}`);
    
    // Just acknowledge - link already marked as used in validateJoinRequest
    return res.status(200).json({
      success: true,
      message: 'Join acknowledged'
    });

  } catch (error) {
    console.error('Error handling user join:', error);
    return res.status(200).json({
      success: true,
      message: 'Join acknowledged (with error)'
    });
  }
};

// Store for pending link verifications (in production, use Redis or database)
const pendingLinks = new Map();

// Generate verification code and send to user via Telegram
const linkTelegramAccount = async (req, res) => {
  try {
    const { phone, telegramUserId } = req.body;

    if (!phone || !telegramUserId) {
      return res.status(400).json({ 
        error: 'Both phone number and Telegram user ID are required' 
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found with this phone number' 
      });
    }

    // Check if Telegram ID is already linked to another account
    const existingTelegramUser = await User.findOne({ telegramUserId });
    if (existingTelegramUser && existingTelegramUser._id.toString() !== user._id.toString()) {
      return res.status(409).json({ 
        error: 'This Telegram account is already linked to another user' 
      });
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store pending verification with expiry (5 minutes)
    const linkId = crypto.randomUUID();
    pendingLinks.set(linkId, {
      userId: user._id.toString(),
      telegramUserId,
      verificationCode,
      phone,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Send verification code via Telegram
    try {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      if (telegramToken) {
        const message = `🔗 *Account Linking Verification*

Hello! You are attempting to link your Telegram account to the phone number: ${phone}

Your verification code is: *${verificationCode}*

This code will expire in 5 minutes.

If you didn't request this, please ignore this message.`;

        await axios.post(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          chat_id: telegramUserId,
          text: message,
          parse_mode: 'Markdown'
        });
      }
    } catch (telegramError) {
      console.error('Failed to send Telegram message:', telegramError);
      // Continue anyway, user can still verify manually
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your Telegram account',
      linkId,
      expiresIn: 300 // 5 minutes in seconds
    });

  } catch (error) {
    console.error('Error in linkTelegramAccount:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Verify the linking code and complete the account linking
const verifyTelegramLink = async (req, res) => {
  try {
    const { linkId, verificationCode } = req.body;

    if (!linkId || !verificationCode) {
      return res.status(400).json({ 
        error: 'Link ID and verification code are required' 
      });
    }

    // Get pending link data
    const linkData = pendingLinks.get(linkId);
    if (!linkData) {
      return res.status(404).json({ 
        error: 'Link request not found or expired' 
      });
    }

    // Check expiry
    if (Date.now() > linkData.expiresAt) {
      pendingLinks.delete(linkId);
      return res.status(400).json({ 
        error: 'Verification code has expired. Please request a new one.' 
      });
    }

    // Verify code
    if (linkData.verificationCode !== verificationCode) {
      return res.status(400).json({ 
        error: 'Invalid verification code' 
      });
    }

    // Update user with Telegram ID
    const updatedUser = await User.findByIdAndUpdate(
      linkData.userId,
      { 
        telegramUserId: linkData.telegramUserId,
        telegramJoinStatus: 'pending' // Reset join status
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Clean up pending link
    pendingLinks.delete(linkId);

    console.log(`✅ Successfully linked Telegram account ${linkData.telegramUserId} to user ${updatedUser.phone} (${updatedUser.firstName} ${updatedUser.lastName})`);

    // Try to retry any pending payment deliveries for this user
    try {
      const paymentRecoveryService = require('../services/paymentRecoveryService');
      const retryResult = await paymentRecoveryService.retryPendingTelegramLinkPayments(updatedUser._id);
      
      if (retryResult.processed > 0) {
        console.log(`🔄 Processed ${retryResult.processed} pending payments after Telegram linking`);
      }
    } catch (error) {
      console.error('Error retrying pending payments after Telegram linking:', error);
      // Don't fail the linking process if payment retry fails
    }

    return res.status(200).json({
      success: true,
      message: 'Telegram account linked successfully!',
      user: {
        id: updatedUser._id,
        phone: updatedUser.phone,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        telegramUserId: updatedUser.telegramUserId,
        telegramJoinStatus: updatedUser.telegramJoinStatus
      }
    });

  } catch (error) {
    console.error('Error in verifyTelegramLink:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Unlink Telegram account from user
const unlinkTelegramAccount = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    // Update user to remove Telegram ID
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $unset: { 
          telegramUserId: 1,
          telegramJoinStatus: 1,
          telegramJoinedAt: 1
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    console.log(`🔗❌ Unlinked Telegram account from user ${updatedUser.phone} (${updatedUser.firstName} ${updatedUser.lastName})`);

    return res.status(200).json({
      success: true,
      message: 'Telegram account unlinked successfully',
      user: {
        id: updatedUser._id,
        phone: updatedUser.phone,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName
      }
    });

  } catch (error) {
    console.error('Error in unlinkTelegramAccount:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = {
  validateJoinRequest,
  checkUserExpiry,
  notifyUserKicked,
  storeTestLink,
  handleUserJoined,
  linkTelegramAccount,
  verifyTelegramLink,
  unlinkTelegramAccount
};
