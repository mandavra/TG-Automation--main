const { Telegraf } = require('telegraf');
const Group = require('../models/group.model');
const User = require('../models/user.model');
const InviteLink = require('../models/InviteLink');

class TelegramIntegrationService {
  constructor() {
    this.bot = null;
    this.activeGroups = new Map(); // chatId -> groupInfo
    this.userTimers = new Map(); // userId -> { groupId, expiresAt, timer }
    
    if (process.env.BOT_TOKEN) {
      this.initializeBot();
    }
  }

  async initializeBot() {
    try {
      this.bot = new Telegraf(process.env.BOT_TOKEN);
      
      // Get bot info
      const botInfo = await this.bot.telegram.getMe();
      console.log(`🤖 Bot initialized: @${botInfo.username}`);
      
      // Setup bot commands and handlers
      this.setupBotHandlers();
      
      // Launch bot
      await this.bot.launch();
      console.log('🚀 Bot launched successfully');
      
      // Load active groups from database
      await this.loadActiveGroups();
      
      // Start background jobs
      this.startBackgroundJobs();
      
    } catch (error) {
      console.error('❌ Failed to initialize bot:', error);
    }
  }

  setupBotHandlers() {
    // Handle join requests
    this.bot.on('chat_join_request', async (ctx) => {
      await this.handleJoinRequest(ctx);
    });

    // Handle new chat members
    this.bot.on('new_chat_members', async (ctx) => {
      await this.handleNewMember(ctx);
    });

    // Handle left chat members
    this.bot.on('left_chat_member', async (ctx) => {
      await this.handleLeftMember(ctx);
    });

    // Admin commands
    this.bot.command('getlink', async (ctx) => {
      await this.handleGetLinkCommand(ctx);
    });

    this.bot.command('stats', async (ctx) => {
      await this.handleStatsCommand(ctx);
    });

    this.bot.command('kick', async (ctx) => {
      await this.handleKickCommand(ctx);
    });

    // Error handling
    this.bot.catch((err, ctx) => {
      console.error(`Bot error for ${ctx.updateType}:`, err);
    });
  }

  async loadActiveGroups() {
    try {
      const activeGroups = await Group.find({ 
        status: 'active', 
        botStatus: 'connected' 
      });

      for (const group of activeGroups) {
        if (group.telegramChatId) {
          this.activeGroups.set(group.telegramChatId, {
            groupId: group._id,
            name: group.name,
            type: group.telegramChatType,
            isDefault: group.isDefault
          });
        }
      }

      console.log(`📊 Loaded ${activeGroups.length} active groups`);
    } catch (error) {
      console.error('Failed to load active groups:', error);
    }
  }

  async handleJoinRequest(ctx) {
    try {
      const req = ctx.update.chat_join_request;
      const user = req.from;
      const inviteLink = req.invite_link?.invite_link;
      const chatId = req.chat.id;

      console.log(`🔍 Join request from ${user.id} in chat ${chatId}`);

      // Check if this is a managed group
      const groupInfo = this.activeGroups.get(chatId.toString());
      if (!groupInfo) {
        console.log(`❌ Chat ${chatId} is not managed`);
        return;
      }

      // Validate invite link if provided
      if (inviteLink) {
        const validation = await this.validateInviteLink(inviteLink, user.id, groupInfo.groupId);
        if (!validation.isValid) {
          console.log(`❌ Join request rejected: ${validation.reason}`);
          return;
        }

        // Approve the request
        await this.bot.telegram.approveChatJoinRequest(chatId, user.id);
        console.log(`✅ Approved join request for ${user.id}`);

        // Start user timer
        await this.startUserTimer(user.id, groupInfo.groupId, validation.duration);
      } else {
        // No invite link - this might be a direct join request
        // You can implement custom logic here
        console.log(`⚠️ Join request without invite link from ${user.id}`);
      }

    } catch (error) {
      console.error('Error handling join request:', error);
    }
  }

  async handleNewMember(ctx) {
    try {
      const newMembers = ctx.message.new_chat_members;
      const chatId = ctx.chat.id;

      for (const member of newMembers) {
        // Skip if it's the bot itself
        if (member.id === this.bot.botInfo.id) continue;

        console.log(`👋 New member ${member.id} joined chat ${chatId}`);

        // Check if this is a managed group
        const groupInfo = this.activeGroups.get(chatId.toString());
        if (groupInfo) {
          // Update user status in database
          await this.updateUserJoinStatus(member.id, groupInfo.groupId, 'joined');
        }
      }
    } catch (error) {
      console.error('Error handling new member:', error);
    }
  }

  async handleLeftMember(ctx) {
    try {
      const leftMember = ctx.message.left_chat_member;
      const chatId = ctx.chat.id;

      // Skip if it's the bot itself
      if (leftMember.id === this.bot.botInfo.id) return;

      console.log(`👋 Member ${leftMember.id} left chat ${chatId}`);

      // Check if this is a managed group
      const groupInfo = this.activeGroups.get(chatId.toString());
      if (groupInfo) {
        // Update user status in database
        await this.updateUserJoinStatus(leftMember.id, groupInfo.groupId, 'left');
        
        // Clear user timer
        this.clearUserTimer(leftMember.id);
      }
    } catch (error) {
      console.error('Error handling left member:', error);
    }
  }

  async handleGetLinkCommand(ctx) {
    try {
      const fromId = ctx.from.id;
      const chatId = ctx.chat.id;

      // Check if user is admin in this chat
      const isAdmin = await this.isUserAdmin(chatId, fromId);
      if (!isAdmin) {
        return ctx.reply('❌ You need admin permissions to use this command.');
      }

      // Check if this is a managed group
      const groupInfo = this.activeGroups.get(chatId.toString());
      if (!groupInfo) {
        return ctx.reply('❌ This group is not managed by the system.');
      }

      // Parse duration from command (e.g., /getlink 1h, /getlink 30m)
      const parts = ctx.message.text.trim().split(/\s+/);
      if (parts.length < 2) {
        return ctx.reply('❌ Usage: /getlink <duration>\nExamples: /getlink 1h, /getlink 30m, /getlink 2d');
      }

      const duration = this.parseDuration(parts[1]);
      if (!duration) {
        return ctx.reply('❌ Invalid duration format. Use: 30m, 1h, 2d');
      }

      // Create invite link
      const inviteLink = await this.bot.telegram.createChatInviteLink(chatId, {
        creates_join_request: true,
        expire_date: Math.floor((Date.now() + duration) / 1000)
      });

      // Store invite link in database
      await this.storeInviteLink(inviteLink.invite_link, groupInfo.groupId, duration);

      const durationText = this.formatDuration(duration);
      await ctx.reply(
        `✅ Invite link created for ${durationText}:\n\n` +
        `🔗 ${inviteLink.invite_link}\n\n` +
        `Users will be automatically approved and their access will expire after ${durationText}.`
      );

    } catch (error) {
      console.error('Error in getlink command:', error);
      await ctx.reply('❌ Error creating invite link. Please try again.');
    }
  }

  async handleStatsCommand(ctx) {
    try {
      const chatId = ctx.chat.id;
      const fromId = ctx.from.id;

      // Check if user is admin
      const isAdmin = await this.isUserAdmin(chatId, fromId);
      if (!isAdmin) {
        return ctx.reply('❌ You need admin permissions to use this command.');
      }

      // Check if this is a managed group
      const groupInfo = this.activeGroups.get(chatId.toString());
      if (!groupInfo) {
        return ctx.reply('❌ This group is not managed by the system.');
      }

      // Get group statistics
      const stats = await this.getGroupStats(groupInfo.groupId);
      
      await ctx.reply(
        `📊 Group Statistics for ${groupInfo.name}:\n\n` +
        `👥 Total Subscribers: ${stats.totalSubscribers}\n` +
        `💰 Total Revenue: ₹${stats.totalRevenue}\n` +
        `✅ Active Subscriptions: ${stats.activeSubscriptions}\n` +
        `🔗 Linked: ${stats.linkedAt ? new Date(stats.linkedAt).toLocaleDateString() : 'Not linked'}\n` +
        `🤖 Bot Status: ${stats.botStatus}`
      );

    } catch (error) {
      console.error('Error in stats command:', error);
      await ctx.reply('❌ Error fetching statistics. Please try again.');
    }
  }

  async handleKickCommand(ctx) {
    try {
      const fromId = ctx.from.id;
      const chatId = ctx.chat.id;

      // Check if user is admin
      const isAdmin = await this.isUserAdmin(chatId, fromId);
      if (!isAdmin) {
        return ctx.reply('❌ You need admin permissions to use this command.');
      }

      // Check if this is a managed group
      const groupInfo = this.activeGroups.get(chatId.toString());
      if (!groupInfo) {
        return ctx.reply('❌ This group is not managed by the system.');
      }

      // Parse user ID from command (e.g., /kick 123456789)
      const parts = ctx.message.text.trim().split(/\s+/);
      if (parts.length < 2) {
        return ctx.reply('❌ Usage: /kick <user_id>');
      }

      const targetUserId = parts[1];
      
      // Kick user from group
      await this.bot.telegram.banChatMember(chatId, targetUserId);
      await this.bot.telegram.unbanChatMember(chatId, targetUserId);

      // Update user status
      await this.updateUserJoinStatus(targetUserId, groupInfo.groupId, 'kicked');
      
      // Clear user timer
      this.clearUserTimer(targetUserId);

      await ctx.reply(`✅ User ${targetUserId} has been kicked from the group.`);

    } catch (error) {
      console.error('Error in kick command:', error);
      await ctx.reply('❌ Error kicking user. Please try again.');
    }
  }

  async validateInviteLink(inviteLink, userId, groupId) {
    try {
      // Find the invite link in database
      const link = await InviteLink.findOne({ 
        link: inviteLink,
        userId: groupId,
        is_used: false,
        expires_at: { $gt: new Date() }
      });

      if (!link) {
        return { isValid: false, reason: 'Invalid or expired invite link' };
      }

      // Check if user already has access
      const existingUser = await User.findOne({ telegramUserId: userId });
      if (existingUser) {
        // Check if user already has active subscription
        // This would depend on your payment/subscription model
        return { isValid: true, duration: link.duration * 1000, reason: 'Existing user' };
      }

      return { isValid: true, duration: link.duration * 1000, reason: 'New user' };

    } catch (error) {
      console.error('Error validating invite link:', error);
      return { isValid: false, reason: 'Validation error' };
    }
  }

  async startUserTimer(userId, groupId, durationMs) {
    try {
      // Clear existing timer if any
      this.clearUserTimer(userId);

      const expiresAt = Date.now() + durationMs;
      
      // Set timer
      const timer = setTimeout(async () => {
        await this.expireUserAccess(userId, groupId);
      }, durationMs);

      // Store timer info
      this.userTimers.set(userId, {
        groupId,
        expiresAt,
        timer
      });

      console.log(`⏰ Timer set for user ${userId} in group ${groupId}, expires at ${new Date(expiresAt).toLocaleString()}`);

    } catch (error) {
      console.error('Error starting user timer:', error);
    }
  }

  clearUserTimer(userId) {
    const userTimer = this.userTimers.get(userId);
    if (userTimer) {
      clearTimeout(userTimer.timer);
      this.userTimers.delete(userId);
    }
  }

  async expireUserAccess(userId, groupId) {
    try {
      console.log(`⏰ Expiring access for user ${userId} in group ${groupId}`);

      // Get group info
      const group = await Group.findById(groupId);
      if (!group || !group.telegramChatId) {
        console.log(`❌ Group ${groupId} not found or not linked`);
        return;
      }

      // Kick user from Telegram group
      try {
        await this.bot.telegram.banChatMember(group.telegramChatId, userId);
        await this.bot.telegram.unbanChatMember(group.telegramChatId, userId);
        console.log(`✅ User ${userId} kicked from group ${group.telegramChatId}`);
      } catch (kickError) {
        console.error(`❌ Failed to kick user ${userId}:`, kickError);
      }

      // Update user status
      await this.updateUserJoinStatus(userId, groupId, 'expired');

      // Clear timer
      this.clearUserTimer(userId);

    } catch (error) {
      console.error('Error expiring user access:', error);
    }
  }

  async updateUserJoinStatus(telegramUserId, groupId, status) {
    try {
      await User.findOneAndUpdate(
        { telegramUserId },
        { 
          telegramJoinStatus: status,
          telegramJoinedAt: status === 'joined' ? new Date() : null
        },
        { upsert: true }
      );

      console.log(`✅ Updated user ${telegramUserId} status to ${status} in group ${groupId}`);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }

  async isUserAdmin(chatId, userId) {
    try {
      const member = await this.bot.telegram.getChatMember(chatId, userId);
      return ['administrator', 'creator'].includes(member.status);
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  async storeInviteLink(link, groupId, durationMs) {
    try {
      const expiresAt = new Date(Date.now() + durationMs);
      
      const inviteLink = new InviteLink({
        link,
        link_id: `group_${groupId}_${Date.now()}`,
        userId: groupId,
        is_used: false,
        expires_at: expiresAt,
        duration: Math.floor(durationMs / 1000)
      });

      await inviteLink.save();
      console.log(`✅ Stored invite link for group ${groupId}, expires at ${expiresAt.toLocaleString()}`);

    } catch (error) {
      console.error('Error storing invite link:', error);
    }
  }

  async getGroupStats(groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      return {
        totalSubscribers: group.stats.totalSubscribers,
        totalRevenue: group.stats.totalRevenue,
        activeSubscriptions: group.stats.activeSubscriptions,
        linkedAt: group.linkedAt,
        botStatus: group.botStatus
      };
    } catch (error) {
      console.error('Error getting group stats:', error);
      return {
        totalSubscribers: 0,
        totalRevenue: 0,
        activeSubscriptions: 0,
        linkedAt: null,
        botStatus: 'unknown'
      };
    }
  }

  parseDuration(durationStr) {
    const match = durationStr.match(/^(\d+)([mhd])$/i);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'm': return value * 60 * 1000; // minutes
      case 'h': return value * 60 * 60 * 1000; // hours
      case 'd': return value * 24 * 60 * 60 * 1000; // days
      default: return null;
    }
  }

  formatDuration(durationMs) {
    const minutes = Math.floor(durationMs / (60 * 1000));
    const hours = Math.floor(durationMs / (60 * 60 * 1000));
    const days = Math.floor(durationMs / (24 * 60 * 60 * 1000));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  startBackgroundJobs() {
    // Clean up expired timers every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [userId, timerInfo] of this.userTimers.entries()) {
        if (timerInfo.expiresAt <= now) {
          this.expireUserAccess(userId, timerInfo.groupId);
        }
      }
    }, 5 * 60 * 1000);

    console.log('🔄 Background jobs started');
  }

  // Public methods for external use
  async addGroup(chatId, groupInfo) {
    this.activeGroups.set(chatId.toString(), groupInfo);
    console.log(`✅ Added group ${groupInfo.name} (${chatId}) to active groups`);
  }

  async removeGroup(chatId) {
    this.activeGroups.delete(chatId.toString());
    console.log(`❌ Removed group ${chatId} from active groups`);
  }

  getActiveGroups() {
    return Array.from(this.activeGroups.entries());
  }

  isGroupActive(chatId) {
    return this.activeGroups.has(chatId.toString());
  }
}

module.exports = new TelegramIntegrationService();
