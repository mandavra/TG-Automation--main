const channelMembershipService = require('./channelMembershipService');

/**
 * Telegram Bot Integration for Channel Membership Events
 * This service handles webhook events from your Telegram bot
 */
class TelegramBotIntegration {

  /**
   * Handle chat member updates (when users join/leave channels)
   * This should be called from your Telegram bot webhook handler
   * @param {Object} update - Telegram update object
   */
  async handleChatMemberUpdate(update) {
    try {
      console.log('📥 Processing chat member update:', update);

      const { chat_member } = update;
      if (!chat_member) {
        console.log('⚠️ No chat_member data in update');
        return;
      }

      const { chat, from: user, old_chat_member, new_chat_member } = chat_member;
      
      if (!user || !chat) {
        console.log('⚠️ Missing user or chat data');
        return;
      }

      const channelId = chat.id.toString();
      const telegramUserId = user.id.toString();
      const oldStatus = old_chat_member?.status || 'left';
      const newStatus = new_chat_member?.status || 'left';

      console.log(`👤 User ${telegramUserId} status change in channel ${channelId}: ${oldStatus} → ${newStatus}`);

      // Handle user leaving channel
      if (['member', 'administrator', 'creator'].includes(oldStatus) && 
          ['left', 'kicked', 'banned'].includes(newStatus)) {
        
        const reason = this.getLeaveReason(newStatus);
        console.log(`📤 User ${telegramUserId} ${reason} channel ${channelId}`);

        // Record the leave event and potentially generate recovery
        const result = await channelMembershipService.recordChannelLeave(
          channelId,
          telegramUserId,
          reason
        );

        if (result.success) {
          console.log(`✅ Channel leave recorded: ${result.code}`);
          
          // If recovery was generated, you might want to notify the user
          if (result.code === 'LEAVE_RECORDED_WITH_RECOVERY') {
            await this.notifyUserOfRecovery(telegramUserId, result.recovery);
          }
        } else {
          console.error('❌ Failed to record channel leave:', result.error);
        }
      }

      // Handle user joining channel
      if (!['member', 'administrator', 'creator'].includes(oldStatus) && 
          ['member', 'administrator', 'creator'].includes(newStatus)) {
        
        console.log(`📥 User ${telegramUserId} joined channel ${channelId}`);
        await this.handleUserJoinChannel(channelId, telegramUserId);
      }

    } catch (error) {
      console.error('❌ Error handling chat member update:', error);
    }
  }

  /**
   * Determine leave reason from Telegram status
   * @param {string} status - Telegram member status
   * @returns {string} Leave reason
   */
  getLeaveReason(status) {
    switch (status) {
      case 'left':
        return 'left';
      case 'kicked':
        return 'kicked';
      case 'banned':
        return 'banned';
      default:
        return 'left';
    }
  }

  /**
   * Handle user joining a channel
   * @param {string} channelId - Channel ID
   * @param {string} telegramUserId - Telegram user ID
   */
  async handleUserJoinChannel(channelId, telegramUserId) {
    try {
      // Find corresponding invite link and mark as used
      const InviteLink = require('../models/InviteLink');
      
      const inviteLink = await InviteLink.findOne({
        channelId: channelId,
        // You might need to find by telegramUserId or other identifier
        is_used: false,
        expires_at: { $gt: new Date() }
      }).populate('userId');

      if (inviteLink) {
        // Check if this user should be using this link
        if (inviteLink.userId?.telegramUserId === telegramUserId) {
          await InviteLink.findByIdAndUpdate(inviteLink._id, {
            is_used: true,
            used_at: new Date(),
            used_by: telegramUserId
          });

          console.log(`✅ Invite link marked as used: ${inviteLink._id}`);
          
          // You might want to track successful joins for analytics
          await this.recordSuccessfulJoin(channelId, telegramUserId, inviteLink._id);
        }
      }

    } catch (error) {
      console.error('❌ Error handling user join:', error);
    }
  }

  /**
   * Record successful channel join for analytics
   * @param {string} channelId - Channel ID
   * @param {string} telegramUserId - Telegram user ID
   * @param {string} inviteLinkId - Invite link ID
   */
  async recordSuccessfulJoin(channelId, telegramUserId, inviteLinkId) {
    try {
      // This could be stored in a separate analytics collection
      const joinRecord = {
        channelId,
        telegramUserId,
        inviteLinkId,
        joinedAt: new Date()
      };

      console.log('📊 Join record:', joinRecord);
      // Store in analytics collection if you have one

    } catch (error) {
      console.error('❌ Error recording join:', error);
    }
  }

  /**
   * Notify user about available recovery link
   * @param {string} telegramUserId - Telegram user ID
   * @param {Object} recovery - Recovery information
   */
  async notifyUserOfRecovery(telegramUserId, recovery) {
    try {
      // This would send a message via your Telegram bot
      // Example implementation:
      
      const message = `🔄 **Channel Recovery Available**\n\n` +
                     `You recently left a channel that you have an active subscription for.\n\n` +
                     `You can rejoin using this recovery link:\n` +
                     `${recovery.recoveryLink?.link}\n\n` +
                     `⏰ This link expires in 7 days.\n\n` +
                     `If you left by mistake, simply click the link above to rejoin immediately.`;

      // Send via your bot API
      await this.sendMessageToUser(telegramUserId, message);
      
      console.log(`📧 Recovery notification sent to user ${telegramUserId}`);

    } catch (error) {
      console.error('❌ Error sending recovery notification:', error);
    }
  }

  /**
   * Send message to user via Telegram bot
   * @param {string} telegramUserId - Telegram user ID
   * @param {string} message - Message to send
   */
  async sendMessageToUser(telegramUserId, message) {
    try {
      // This should integrate with your existing Telegram bot
      // Example using node-telegram-bot-api or similar:
      
      /*
      const bot = require('../path/to/your/bot');
      await bot.sendMessage(telegramUserId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      */
      
      console.log(`📨 Would send message to ${telegramUserId}:`, message);

    } catch (error) {
      console.error('❌ Error sending Telegram message:', error);
    }
  }

  /**
   * Setup webhook handler for your Telegram bot
   * Call this method to register the chat member update handler
   */
  setupWebhookHandlers() {
    // This would be integrated with your existing bot webhook setup
    console.log('🔧 Setting up Telegram webhook handlers for channel membership tracking');
    
    // Example integration:
    /*
    bot.on('chat_member', (msg) => {
      this.handleChatMemberUpdate({ chat_member: msg });
    });
    */
  }

  /**
   * Bulk check channel membership for multiple users
   * This can be called periodically to sync membership status
   * @param {Array} userChannelPairs - Array of {userId, channelId} pairs
   */
  async bulkCheckChannelMembership(userChannelPairs) {
    try {
      console.log(`🔍 Bulk checking membership for ${userChannelPairs.length} user-channel pairs`);
      
      const results = [];
      
      for (const pair of userChannelPairs) {
        try {
          // This would use your Telegram bot API to check membership
          const membershipStatus = await this.checkUserChannelMembership(pair.channelId, pair.telegramUserId);
          
          results.push({
            userId: pair.userId,
            channelId: pair.channelId,
            telegramUserId: pair.telegramUserId,
            status: membershipStatus,
            checkedAt: new Date()
          });

          // Add delay to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Error checking membership for user ${pair.userId} in channel ${pair.channelId}:`, error);
          results.push({
            userId: pair.userId,
            channelId: pair.channelId,
            telegramUserId: pair.telegramUserId,
            status: 'error',
            error: error.message,
            checkedAt: new Date()
          });
        }
      }

      console.log(`✅ Bulk membership check completed: ${results.length} results`);
      return results;

    } catch (error) {
      console.error('❌ Error in bulk membership check:', error);
      throw error;
    }
  }

  /**
   * Check if user is member of a specific channel
   * @param {string} channelId - Channel ID
   * @param {string} telegramUserId - Telegram user ID
   * @returns {Promise<string>} Membership status
   */
  async checkUserChannelMembership(channelId, telegramUserId) {
    try {
      // This would use your Telegram bot API
      // Example:
      /*
      const bot = require('../path/to/your/bot');
      const member = await bot.getChatMember(channelId, telegramUserId);
      return member.status; // 'member', 'left', 'kicked', 'banned', etc.
      */
      
      // Mock implementation for now
      const mockStatuses = ['member', 'left', 'kicked'];
      return mockStatuses[Math.floor(Math.random() * mockStatuses.length)];

    } catch (error) {
      console.error('❌ Error checking individual membership:', error);
      return 'error';
    }
  }

  /**
   * Handle bulk membership check results
   * Update database with current membership status
   * @param {Array} results - Membership check results
   */
  async processBulkMembershipResults(results) {
    try {
      console.log(`📊 Processing ${results.length} membership check results`);

      let updatedCount = 0;
      let leftCount = 0;

      for (const result of results) {
        if (result.status === 'left' || result.status === 'kicked' || result.status === 'banned') {
          // User has left - record the leave event
          await channelMembershipService.recordChannelLeave(
            result.channelId,
            result.telegramUserId,
            result.status === 'left' ? 'left' : result.status
          );
          leftCount++;
        }

        updatedCount++;
      }

      console.log(`✅ Processed bulk results: ${updatedCount} updated, ${leftCount} users left channels`);

      return {
        processed: updatedCount,
        usersLeft: leftCount,
        results: results
      };

    } catch (error) {
      console.error('❌ Error processing bulk membership results:', error);
      throw error;
    }
  }
}

module.exports = new TelegramBotIntegration();