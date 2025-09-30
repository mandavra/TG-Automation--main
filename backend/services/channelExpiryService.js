const ChannelMember = require('../models/ChannelMember');
const axios = require('axios');
const cron = require('node-cron');

class ChannelExpiryService {
  constructor() {
    this.botToken = process.env.BOT_TOKEN;
    this.telegramApiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.isRunning = false;
  }

  // Start the expiry monitoring service
  start() {
    if (this.isRunning) {
      console.log('⚠️ Channel expiry service is already running');
      return;
    }

    console.log('🚀 Starting Channel Expiry Service...');
    
    // Run expiry check every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkAndKickExpiredMembers();
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    // Run an initial check
    setTimeout(() => {
      this.checkAndKickExpiredMembers();
    }, 5000); // Wait 5 seconds for startup

    this.isRunning = true;
    console.log('✅ Channel Expiry Service started - checking every minute');
  }

  // Stop the service
  stop() {
    if (this.cronJob) {
      this.cronJob.destroy();
    }
    this.isRunning = false;
    console.log('🛑 Channel Expiry Service stopped');
  }

  // Check for expired members and kick them
  async checkAndKickExpiredMembers() {
    try {
      console.log('🔍 Checking for expired channel members...');
      
      // Find all expired members
      const expiredMembers = await ChannelMember.findExpiredMembers();
      
      if (expiredMembers.length === 0) {
        console.log('✅ No expired members found');
        return;
      }

      console.log(`⚠️ Found ${expiredMembers.length} expired members to remove`);

      // Process each expired member
      for (const member of expiredMembers) {
        try {
          await this.kickMember(member);
          
          // Mark member as inactive and set kick time
          await ChannelMember.findByIdAndUpdate(member._id, {
            isActive: false,
            kickedAt: new Date(),
            kickReason: 'Subscription expired'
          });

          console.log(`✅ Kicked expired member: ${member.telegramUserId} from channel ${member.channelId}`);
          
        } catch (kickError) {
          console.error(`❌ Failed to kick member ${member.telegramUserId}:`, kickError);
        }
      }

    } catch (error) {
      console.error('❌ Error in expiry check:', error);
    }
  }

  // Kick a specific member from Telegram channel
  async kickMember(member) {
    try {
      const kickUrl = `${this.telegramApiUrl}/banChatMember`;
      
      // Ban the user (this removes them from the channel)
      const banResponse = await axios.post(kickUrl, {
        chat_id: member.channelId,
        user_id: member.telegramUserId,
        until_date: Math.floor(Date.now() / 1000) + 60 // Unban after 60 seconds
      });

      if (banResponse.data.ok) {
        console.log(`📤 Successfully banned user ${member.telegramUserId} from channel ${member.channelId}`);
        
        // Immediately unban them so they can rejoin later with a new subscription
        setTimeout(async () => {
          try {
            const unbanUrl = `${this.telegramApiUrl}/unbanChatMember`;
            await axios.post(unbanUrl, {
              chat_id: member.channelId,
              user_id: member.telegramUserId,
              only_if_banned: true
            });
            console.log(`🔓 Unbanned user ${member.telegramUserId} - they can rejoin with new subscription`);
          } catch (unbanError) {
            console.error(`⚠️ Could not unban user ${member.telegramUserId}:`, unbanError.message);
          }
        }, 5000); // Wait 5 seconds before unbanning

        // Try to send notification to user
        try {
          const messageUrl = `${this.telegramApiUrl}/sendMessage`;
          await axios.post(messageUrl, {
            chat_id: member.telegramUserId,
            text: `⏰ Your subscription to channel ${member.channelInfo?.title || 'Premium Channel'} has expired.\n\nTo continue accessing premium content, please renew your subscription.\n\n📞 Contact support for assistance.`,
            parse_mode: 'Markdown'
          });
          console.log(`📨 Sent expiry notification to user ${member.telegramUserId}`);
        } catch (messageError) {
          console.log(`⚠️ Could not send expiry message to user ${member.telegramUserId}: ${messageError.message}`);
        }

      } else {
        throw new Error(`Telegram API error: ${banResponse.data.description}`);
      }

    } catch (error) {
      console.error(`❌ Failed to kick member ${member.telegramUserId}:`, error.message);
      throw error;
    }
  }

  // Get expiry statistics
  async getExpiryStats() {
    try {
      const totalActiveMembers = await ChannelMember.countDocuments({ isActive: true });
      const expiredMembers = await ChannelMember.countDocuments({ 
        isActive: true, 
        expiresAt: { $lt: new Date() } 
      });
      const expiringIn24h = await ChannelMember.countDocuments({
        isActive: true,
        expiresAt: { 
          $lt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          $gt: new Date()
        }
      });

      return {
        totalActiveMembers,
        expiredMembers,
        expiringIn24h,
        serviceRunning: this.isRunning
      };
    } catch (error) {
      console.error('Error getting expiry stats:', error);
      return null;
    }
  }

  // Manual kick for testing
  async manualKickExpired() {
    console.log('🔧 Manual expiry check triggered...');
    await this.checkAndKickExpiredMembers();
  }
}

// Create singleton instance
const channelExpiryService = new ChannelExpiryService();

module.exports = channelExpiryService;
