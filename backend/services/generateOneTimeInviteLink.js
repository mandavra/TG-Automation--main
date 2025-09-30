const axios = require("axios");
const InviteLink = require("../models/InviteLink");
require('dotenv').config();

// Import the utility function for consistent duration conversion
const { convertDurationToSeconds } = require('../utils/durationConverter');

// Import email service for sending invite links
const emailService = require('./emailService');

// Use environment variables for bot configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Utility: Generate Admin ID with last 3 digits NOT all the same
function generateAdminIdWithoutSameLastThree(length = 6) {
  while (true) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    const str = num.toString();
    const lastThree = str.slice(-3);
    if (!(lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2])) {
      return num;
    }
  }
}

// Function to generate and store the invite link for join request flow (legacy single channel)
async function generateAndStoreInviteLink(userId, duration = 86400, sendEmail = true) {
  // Use default channel for backward compatibility
  const channelId = CHANNEL_ID;
  if (!BOT_TOKEN || !channelId) {
    throw new Error('BOT_TOKEN and CHANNEL_ID environment variables are required');
  }

  const inviteLink = await generateInviteLinkForChannel(userId, channelId, null, duration);
  
  // Send email with invite link if requested
  if (sendEmail && inviteLink) {
    try {
      const emailResult = await sendInviteLinkEmail(userId, inviteLink.link, null, 'single');
      if (emailResult.success) {
        console.log(`📧 Email sent to ${emailResult.email} with invite link`);
      }
    } catch (emailError) {
      console.error(`❌ Error sending invite link email:`, emailError.message);
      // Don't fail the whole operation if email fails
    }
  }
  
  return inviteLink;
}

// Function to generate invite link for a specific channel
async function generateInviteLinkForChannel(userId, channelId, channelTitle = null, duration = 86400, groupId = null, paymentLinkId = null, planId = null, adminId = null) {
  if (!BOT_TOKEN || !channelId) {
    throw new Error('BOT_TOKEN and channelId are required');
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/createChatInviteLink`;

  try {
    console.log(`Generating join request invite link for user: ${userId || 'anonymous'} in channel: ${channelId}`);
    
    // Make API request to Telegram to create the join request invite link
    const response = await axios.post(url, {
      chat_id: channelId,
      creates_join_request: true // This creates a join request that needs approval
    });

    console.log('Telegram API Response:', {
      status: response.status,
      chat_id: channelId,
      creates_join_request: true
    });

    // Extract invite link from the response
    const { invite_link } = response.data.result;

    console.log("✅ Join request invite link generated successfully:", invite_link);
    console.log("📋 Response data:", response.data.result);

    // Helper function to convert string to ObjectId if valid, otherwise set to null
    const toObjectIdOrNull = (value) => {
      if (!value) return null;
      try {
        const mongoose = require('mongoose');
        return mongoose.Types.ObjectId.isValid(value) ? value : null;
      } catch {
        return null;
      }
    };
    
    // Get adminId from groupId if not provided
    if (!adminId && groupId) {
      try {
        const Group = require('../models/group.model');
        const group = await Group.findById(groupId).select('createdBy');
        adminId = group?.createdBy;
      } catch (error) {
        console.warn('Could not fetch adminId from group:', error.message);
      }
    }
    
    // Create a new InviteLink document to store in the database
    const newLink = new InviteLink({
      link: invite_link,
      link_id: `${invite_link.split('/').pop()}`, // Extract link identifier
      telegramUserId: null, // Will be set when user joins
      userId: toObjectIdOrNull(userId), // Backend user ID (ObjectId or null)
      channelId: channelId,
      channelTitle: channelTitle,
      groupId: toObjectIdOrNull(groupId),
      paymentLinkId: toObjectIdOrNull(paymentLinkId),
      planId: toObjectIdOrNull(planId),
      adminId: toObjectIdOrNull(adminId), // Required field
      is_used: false,
      // No expiration - link is valid until used
      expires_at: null,
      duration: convertDurationToSeconds(duration) // Keep duration for payment expiry tracking only
    });

    // Save the invite link to the database
    await newLink.save();
    console.log(`✅ Invite link saved to database with ID: ${newLink._id}`);

    // Return the saved link object
    return newLink;
  } catch (error) {
    // Handle Telegram API errors
    if (error.response?.data) {
      console.error("❌ Telegram API Error:", error.response.data);
      throw new Error(`Telegram API Error: ${error.response.data.description || error.response.data.error_code}`);
    }
    
    // Handle database errors
    if (error.name === 'ValidationError') {
      console.error("❌ Database Validation Error:", error.message);
      throw new Error(`Validation Error: ${error.message}`);
    }
    
    // Handle other errors
    console.error("❌ Error generating invite link:", error.message);
    throw new Error(`Failed to generate invite link: ${error.message}`);
  }
}

// Helper function to send email with invite link
async function sendInviteLinkEmail(userId, inviteLink, channelTitle = null, emailType = 'single') {
  try {
    // Get user details from database
    const User = require('../models/user.model');
    const user = await User.findById(userId);
    
    if (!user || !user.email) {
      console.log(`⚠️ User ${userId} not found or no email address`);
      return { success: false, reason: 'User not found or no email address' };
    }

    const userDetails = {
      firstName: user.firstName || 'User',
      email: user.email
    };

    // Send appropriate email based on type
    switch (emailType) {
      case 'single':
        userDetails.inviteLink = inviteLink;
        await emailService.sendTelegramJoiningLinkEmail(user.email, userDetails);
        break;
      case 'bundle':
        // This will be handled by the bundle function
        break;
      default:
        userDetails.inviteLink = inviteLink;
        await emailService.sendTelegramJoiningLinkEmail(user.email, userDetails);
    }

    console.log(`📧 Email sent to ${user.email} with ${emailType} invite link`);
    return { success: true, email: user.email };
  } catch (error) {
    console.error(`❌ Error sending invite link email:`, error.message);
    return { success: false, error: error.message };
  }
}

// Function to generate invite links for all channels in a channel bundle
async function generateInviteLinksForChannelBundle(userId, groupId, duration = 86400, paymentLinkId = null, planId = null, sendEmail = true) {
  try {
    const Group = require('../models/group.model');

    // Get the channel bundle details
    const channelBundle = await Group.findById(groupId);
    if (!channelBundle) {
      throw new Error('Channel bundle not found');
    }

    // If paymentLinkId is provided, get the actual subscription duration from payment
    let actualDuration = duration;
    let expiryDate = null;
    if (paymentLinkId) {
      try {
        const PaymentLink = require('../models/paymentLinkModel');
        const payment = await PaymentLink.findById(paymentLinkId);
        if (payment && payment.expiry_date) {
          const now = new Date();
          expiryDate = new Date(payment.expiry_date);
          const remainingSeconds = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);

          if (remainingSeconds > 0) {
            actualDuration = remainingSeconds;
            console.log(`🎯 Using actual payment duration: ${remainingSeconds} seconds (${Math.floor(remainingSeconds/86400)} days)`);
          } else {
            console.log(`⚠️ Payment already expired, using default duration`);
          }
        }
      } catch (error) {
        console.error('⚠️ Could not fetch payment duration, using default:', error.message);
      }
    }

    console.log(`📦 Generating invite links for channel bundle: ${channelBundle.name}`);
    console.log(`📊 Total channels in bundle: ${channelBundle.channels.length}`);

    const generatedLinks = [];
    const errors = [];

    // Generate invite links for all active channels in the bundle
    for (const channel of channelBundle.channels) {
      if (!channel.isActive) {
        console.log(`⏭️ Skipping inactive channel: ${channel.chatTitle} (${channel.chatId})`);
        continue;
      }

      try {
        console.log(`🔗 Generating invite link for channel: ${channel.chatTitle} (${channel.chatId})`);
        
        const inviteLink = await generateInviteLinkForChannel(
          userId,
          channel.chatId,
          channel.chatTitle,
          actualDuration,
          groupId,
          paymentLinkId,
          planId
        );
        
        generatedLinks.push({
          channelId: channel.chatId,
          channelTitle: channel.chatTitle,
          inviteLink: inviteLink.link,
          linkId: inviteLink._id
        });
        
        console.log(`✅ Generated invite link for ${channel.chatTitle}`);
      } catch (error) {
        console.error(`❌ Failed to generate invite link for channel ${channel.chatTitle}:`, error.message);
        errors.push({
          channelId: channel.chatId,
          channelTitle: channel.chatTitle,
          error: error.message
        });
      }
    }

    console.log(`📋 Summary - Generated: ${generatedLinks.length}, Errors: ${errors.length}`);
    
    const result = {
      success: true,
      channelBundle: {
        id: channelBundle._id,
        name: channelBundle.name
      },
      generatedLinks,
      errors,
      totalChannels: channelBundle.channels.length,
      successCount: generatedLinks.length,
      errorCount: errors.length,
      expiryDate: expiryDate
    };

    // Send email with all invite links if requested and we have successful links
    if (sendEmail && generatedLinks.length > 0) {
      try {
        const User = require('../models/user.model');
        const user = await User.findById(userId);
        
        if (user && user.email) {
          const userDetails = {
            firstName: user.firstName || 'User',
            email: user.email
          };

          const emailData = {
            channelBundle: result.channelBundle,
            generatedLinks: result.generatedLinks,
            expiryDate: result.expiryDate
          };

          await emailService.sendTelegramChannelBundleEmail(user.email, userDetails, emailData);
          console.log(`📧 Channel bundle email sent to ${user.email}`);
        }
      } catch (emailError) {
        console.error(`❌ Error sending channel bundle email:`, emailError.message);
        // Don't fail the whole operation if email fails
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error generating invite links for channel bundle:', error.message);
    throw new Error(`Failed to generate invite links for channel bundle: ${error.message}`);
  }
}

// Function to mark invite link as used
async function markInviteLinkAsUsed(linkId, telegramUserId) {
  try {
    const updatedLink = await InviteLink.findByIdAndUpdate(
      linkId,
      { 
        is_used: true,
        used_by: telegramUserId,
        used_at: new Date()
      },
      { new: true }
    );

    if (!updatedLink) {
      throw new Error('Invite link not found');
    }

    console.log(`✅ Invite link marked as used: ${linkId}`);
    return updatedLink;
  } catch (error) {
    console.error("❌ Error marking invite link as used:", error.message);
    throw error;
  }
}

// Function to get unused invite links for a user
async function getUnusedInviteLinks(telegramUserId) {
  try {
    const links = await InviteLink.find({
      telegramUserId: telegramUserId,
      is_used: false
      // No expiration check - link is valid until used
    }).sort({ createdAt: -1 });

    return links;
  } catch (error) {
    console.error("❌ Error fetching unused invite links:", error.message);
    throw error;
  }
}

// Function to clean up used invite links (no longer needed - we keep them for audit)
async function cleanupUsedInviteLinks() {
  try {
    // Note: We don't actually delete used links for audit purposes
    // Just log the count of used links
    const usedCount = await InviteLink.countDocuments({ is_used: true });
    console.log(`📊 Found ${usedCount} used invite links (keeping for audit)`);
    return usedCount;
  } catch (error) {
    console.error("❌ Error checking used invite links:", error.message);
    throw error;
  }
}

// Function to check invite link validity WITHOUT marking as used (for join request validation)
async function checkInviteLinkValidity(inviteLink, telegramUserId) {
  try {
    const linkRecord = await InviteLink.findOne({
      link: inviteLink,
      is_used: false
      // No expiration check - link is valid until used
    }).populate('userId');

    if (!linkRecord) {
      console.log(`❌ Invalid invite link (not found or already used): ${inviteLink}`);
      return { isValid: false, reason: 'Invalid link or already used' };
    }

    console.log(`✅ Invite link is valid for user ${telegramUserId} (one-time use, not marked as used yet)`);
    return { 
      isValid: true, 
      userId: linkRecord.userId,
      linkId: linkRecord._id,
      linkRecord: linkRecord
    };
  } catch (error) {
    console.error("❌ Error checking invite link validity:", error.message);
    return { isValid: false, reason: 'Server error during validation' };
  }
}

// Function to validate and mark invite link as used (for successful approval)
async function validateInviteLink(inviteLink, telegramUserId) {
  try {
    const linkRecord = await InviteLink.findOne({
      link: inviteLink,
      is_used: false
      // No expiration check - link is valid until used
    }).populate('userId');

    if (!linkRecord) {
      console.log(`❌ Invalid invite link (not found or already used): ${inviteLink}`);
      return { isValid: false, reason: 'Invalid link or already used' };
    }

    // Update the record with telegram user ID and mark as used
    linkRecord.telegramUserId = telegramUserId;
    linkRecord.is_used = true;
    linkRecord.used_by = telegramUserId;
    linkRecord.used_at = new Date();
    await linkRecord.save();

    console.log(`✅ One-time invite link validated and marked as used for user ${telegramUserId}`);
    return { 
      isValid: true, 
      userId: linkRecord.userId,
      linkId: linkRecord._id
    };
  } catch (error) {
    console.error("❌ Error validating invite link:", error.message);
    return { isValid: false, reason: 'Server error during validation' };
  }
}

// Function to revoke invite link after use (with channel detection)
async function revokeInviteLink(inviteLink) {
  try {
    // Find the invite link in database to get the correct channel ID
    const linkRecord = await InviteLink.findOne({ link: inviteLink });
    const channelId = linkRecord?.channelId || CHANNEL_ID; // Fallback to default channel
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/revokeChatInviteLink`;
    
    await axios.post(url, {
      chat_id: channelId,
      invite_link: inviteLink
    });

    console.log(`✅ Invite link revoked: ${inviteLink} from channel: ${channelId}`);
  } catch (error) {
    console.error("❌ Error revoking invite link:", error.message);
  }
}

// Function to get user's active channel bundles with invite links
async function getUserChannelBundles(userId) {
  try {
    const PaymentLink = require('../models/paymentLinkModel');
    const Group = require('../models/group.model');
    
    // Find user's active payments
    const activePayments = await PaymentLink.find({
      userid: userId,
      status: 'SUCCESS',
      expiry_date: { $gt: new Date() }
    }).populate('groupId');

    const channelBundles = [];
    
    for (const payment of activePayments) {
      if (payment.groupId) {
        // Get invite links for this channel bundle
        const inviteLinks = await InviteLink.find({
          userId: userId,
          groupId: payment.groupId._id,
          is_used: false
          // No expiration check - link is valid until used
        });

        channelBundles.push({
          paymentId: payment._id,
          channelBundle: payment.groupId,
          inviteLinks: inviteLinks,
          expiryDate: payment.expiry_date
        });
      }
    }

    return channelBundles;
  } catch (error) {
    console.error("❌ Error fetching user channel bundles:", error.message);
    throw error;
  }
}

// Function to get invite links by channel bundle
async function getInviteLinksByChannelBundle(userId, groupId) {
  try {
    const inviteLinks = await InviteLink.find({
      userId: userId,
      groupId: groupId,
      is_used: false
      // No expiration check - link is valid until used
    }).populate(['groupId', 'paymentLinkId', 'planId']);

    return inviteLinks;
  } catch (error) {
    console.error("❌ Error fetching invite links by channel bundle:", error.message);
    throw error;
  }
}

// Function to get invite link for a specific user
async function getUserInviteLink(userId) {
  try {
    const linkRecord = await InviteLink.findOne({
      userId: userId,
      is_used: false
      // No expiration check - link is valid until used
    }).sort({ createdAt: -1 });

    return linkRecord;
  } catch (error) {
    console.error("❌ Error fetching user invite link:", error.message);
    throw error;
  }
}

module.exports = { 
  // Legacy single channel functions
  generateAndStoreInviteLink,
  getUserInviteLink,
  
  // New multi-channel functions
  generateInviteLinkForChannel,
  generateInviteLinksForChannelBundle,
  getUserChannelBundles,
  getInviteLinksByChannelBundle,
  
  // Email integration functions
  sendInviteLinkEmail,
  
  // Common functions
  markInviteLinkAsUsed,
  getUnusedInviteLinks,
  cleanupUsedInviteLinks,
  checkInviteLinkValidity,  // NEW: Check validity without marking as used
  validateInviteLink,       // Updated: Validates and marks as used
  revokeInviteLink,
  
  // Utility functions
  convertDurationToSeconds,
  generateAdminIdWithoutSameLastThree
};
