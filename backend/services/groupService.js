
const Group = require('../models/group.model');
const Plan = require('../models/plan');
const { Telegraf } = require('telegraf');

const { generateAdminIdWithoutSameLastThree } = require('../services/generateOneTimeInviteLink');

// Channel Bundle Service - Manages collections of Telegram channels as subscription packages
class GroupService {
  constructor() {
    this.bot = null;
    if (process.env.BOT_TOKEN) {
      this.bot = new Telegraf(process.env.BOT_TOKEN);

      // bot.launch() નથી કરવાનું → 409 error નહિ આવે
      this.bot.telegram.getMe()
        .then(botInfo => {
          this.bot.botInfo = botInfo;
          console.log(`🤖 Bot loaded successfully: @${botInfo.username}`);
        })
        .catch(err => {
          console.error("❌ Failed to load bot info:", err.message);
        });
    }
  }

  // Create a new channel bundle
  async createGroup(groupData, adminRole = 'admin') {
    try {
      const existingGroups = await Group.countDocuments();
      if (existingGroups === 0) {
        groupData.isDefault = true;
      }
      
      // Enforce KYC and E-Sign defaults for non-super admins
      if (adminRole !== 'superadmin') {
        groupData.featureToggles = {
          enableESign: true,
          enableKYC: true,
          ...groupData.featureToggles // Allow other feature toggles to be set
        };
      } else {
        // Super admin can set their own values, but ensure defaults if not specified
        groupData.featureToggles = {
          enableESign: true,
          enableKYC: true,
          ...groupData.featureToggles
        };
      }
      // Create group and check last 3 digits of _id
      let group;
      let attempts = 0;
      do {
        group = new Group(groupData);
        await group.save();
        const idStr = group._id.toString();
        const lastThree = idStr.slice(-3);
        if (!(lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2])) {
          break;
        } else {
          // If last 3 digits are same, delete and try again (very rare)
          await Group.findByIdAndDelete(group._id);
        }
        attempts++;
      } while (attempts < 5);
      return group;
    } catch (error) {
      throw new Error(`Failed to create group: ${error.message}`);
    }
  }


  // Get all groups with admin filtering
  async getAllGroups(adminQuery = {}) {
    try {
      return await Group.find(adminQuery)
        .populate('subscriptionPlans')
        .populate('createdBy', 'email firstName lastName')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to fetch groups: ${error.message}`);
    }
  }

  // Get group by ID with optional filter
  async getGroupById(groupId, filter = {}) {
    try {
      return await Group.findOne({ _id: groupId, ...filter })
        .populate('subscriptionPlans')
        .populate('createdBy', 'email firstName lastName');
    } catch (error) {
      throw new Error(`Failed to fetch group: ${error.message}`);
    }
  }

  // Update group
  async updateGroup(groupId, updateData, adminRole = 'admin') {
    try {
      // Protect feature toggles for non-super admins
      if (adminRole !== 'superadmin' && updateData.featureToggles) {
        // Remove feature toggle changes for regular admins
        delete updateData.featureToggles;
        console.log('⚠️ Feature toggle changes ignored for regular admin');
      }
      
      const group = await Group.findByIdAndUpdate(
        groupId,
        updateData,
        { new: true, runValidators: true }
      ).populate('subscriptionPlans');

      if (!group) throw new Error('Group not found');
      return group;
    } catch (error) {
      throw new Error(`Failed to update group: ${error.message}`);
    }
  }

  // Delete group
  async deleteGroup(groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) throw new Error('Group not found');
      if (group.isDefault) throw new Error('Cannot delete default group');

      await Group.findByIdAndDelete(groupId);
      return { message: 'Group deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete group: ${error.message}`);
    }
  }

  // Link group with Telegram

  async linkTelegramGroup(groupId, { chatId }) {
    try {
      // ✅ Telegraf style
      const chat = await this.bot.telegram.getChat(chatId);
  
      if (!chat) {
        throw new Error("Bot verification failed: Chat not found");
      }
  
      // Save to DB
      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        {
          telegramChatId: chat.id,
          telegramChatTitle: chat.title,
          telegramChatType: chat.type,
          telegramInviteLink: chat.invite_link || null
        },
        { new: true }
      );
  
      return updatedGroup;
    } catch (err) {
      throw new Error(`Failed to link Telegram group: ${err.message}`);
    }
  }
  
  

// services/groupService.js

// Test bot connection
async testBotConnection(chatId) {
  try {
    if (!this.bot) {
      throw new Error('Telegram bot not configured');
    }

    // 🔹 Ensure chatId is cleaned
    const cleanChatId = String(chatId).trim();
    console.log("🔍 Testing bot connection with chatId:", cleanChatId);

    // Get bot info if not loaded yet
    if (!this.bot.botInfo) {
      await this.bot.telegram.getMe().then(info => {
        this.bot.botInfo = info;
        console.log("✅ Bot info loaded:", info.username);
      });
    }

    // Check if bot is member of chat
    const chatMember = await this.bot.telegram.getChatMember(
      cleanChatId,
      this.bot.botInfo.id
    );
    console.log("👤 ChatMember Response:", chatMember);

    // Get chat info
    const chat = await this.bot.telegram.getChat(cleanChatId);
    console.log("📢 Chat Info Response:", chat);

    if (!chat || !chat.id) {
      throw new Error("chat not found or inaccessible");
    }

    return {
      isAdmin: ['administrator', 'creator'].includes(chatMember.status),
      chatType: chat.type,
      chatTitle: chat.title,
      botPermissions: chatMember.status
    };
  } catch (error) {
    console.error("❌ Test bot connection error:", error.message);
    throw new Error(`Bot connection test failed: ${error.message}`);
  }
}

  

  // Get group statistics
  async getGroupStats(groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) throw new Error('Group not found');

      return {
        totalSubscribers: group.stats.totalSubscribers,
        totalRevenue: group.stats.totalRevenue,
        activeSubscriptions: group.stats.activeSubscriptions,
        linkedAt: group.linkedAt,
        botStatus: group.botStatus
      };
    } catch (error) {
      throw new Error(`Failed to get group stats: ${error.message}`);
    }
  }

  // Update group statistics
  async updateGroupStats(groupId, statsData) {
    try {
      const group = await Group.findById(groupId);
      if (!group) throw new Error('Group not found');

      const updatedGroup = await this.updateGroup(groupId, {
        'stats.totalSubscribers': statsData.totalSubscribers || group.stats.totalSubscribers,
        'stats.totalRevenue': statsData.totalRevenue || group.stats.totalRevenue,
        'stats.activeSubscriptions': statsData.activeSubscriptions || group.stats.activeSubscriptions
      });

      return updatedGroup;
    } catch (error) {
      throw new Error(`Failed to update group stats: ${error.message}`);
    }
  }

  // Set group as default
  async setDefaultGroup(groupId) {
    try {
      await Group.updateMany({ isDefault: true }, { isDefault: false });
      return await this.updateGroup(groupId, { isDefault: true });
    } catch (error) {
      throw new Error(`Failed to set default group: ${error.message}`);
    }
  }

  // Get default group
  async getDefaultGroup() {
    try {
      return await Group.findOne({ isDefault: true })
        .populate('subscriptionPlans')
        .populate('createdBy', 'email firstName lastName');
    } catch (error) {
      throw new Error(`Failed to get default group: ${error.message}`);
    }
  }

  // Search groups
  async searchGroups(searchCriteria) {
    try {
      return await Group.find(searchCriteria)
        .populate('subscriptionPlans')
        .populate('createdBy', 'email firstName lastName')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to search groups: ${error.message}`);
    }
  }

  // Check if a custom route is available
  async checkRouteAvailability(customRoute, excludeGroupId = null) {
    try {
      if (!customRoute) {
        throw new Error('Custom route is required');
      }

      // Normalize the route
      const normalizedRoute = customRoute.toLowerCase().trim();
      
      // Validate format
      const routeRegex = /^[a-z0-9-_]+$/;
      if (!routeRegex.test(normalizedRoute)) {
        return {
          available: false,
          message: 'Route can only contain lowercase letters, numbers, hyphens, and underscores'
        };
      }

      if (normalizedRoute.length < 3) {
        return {
          available: false,
          message: 'Route must be at least 3 characters long'
        };
      }

      if (normalizedRoute.length > 50) {
        return {
          available: false,
          message: 'Route must be less than 50 characters long'
        };
      }

      // Reserved routes that cannot be used
      const reservedRoutes = [
        'admin', 'api', 'auth', 'login', 'register', 'dashboard', 'profile',
        'settings', 'help', 'about', 'contact', 'privacy', 'terms',
        'home', 'index', 'main', 'root', 'app', 'www', 'pc', 'mobile',
        'test', 'dev', 'staging', 'prod', 'production', 'demo'
      ];

      if (reservedRoutes.includes(normalizedRoute)) {
        return {
          available: false,
          message: 'This route is reserved and cannot be used'
        };
      }

      // Check if route exists in database
      const query = { customRoute: normalizedRoute };
      if (excludeGroupId) {
        query._id = { $ne: excludeGroupId };
      }

      const existingGroup = await Group.findOne(query);
      
      if (existingGroup) {
        return {
          available: false,
          message: 'This route is already taken by another group'
        };
      }

      return {
        available: true,
        message: 'Route is available',
        normalizedRoute
      };

    } catch (error) {
      throw new Error(`Failed to check route availability: ${error.message}`);
    }
  }

  // Get group by custom route
  async getGroupByRoute(customRoute) {
    try {
      if (!customRoute) {
        throw new Error('Custom route is required');
      }

      const normalizedRoute = customRoute.toLowerCase().trim();
      const group = await Group.findOne({ 
        customRoute: normalizedRoute,
        status: 'active'
      })
        .populate('subscriptionPlans')
        .populate('createdBy', 'email firstName lastName');

      return group;
    } catch (error) {
      throw new Error(`Failed to fetch group by route: ${error.message}`);
    }
  }

  // Add channel to bundle
  async addChannelToGroup(groupId, channelData) {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not configured');
      }

      // Verify bot has access to the channel
      const chat = await this.bot.telegram.getChat(channelData.chatId);
      if (!chat) {
        throw new Error('Channel not found or bot does not have access');
      }

      // Check bot permissions
      const botMember = await this.bot.telegram.getChatMember(channelData.chatId, this.bot.botInfo.id);
      if (!['administrator', 'creator'].includes(botMember.status)) {
        throw new Error('Bot must be an administrator in the channel');
      }

      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Channel bundle not found');
      }

      // Check if channel already exists in this bundle
      const existingChannel = group.channels.find(channel => channel.chatId === channelData.chatId);
      if (existingChannel) {
        throw new Error('Channel already exists in this bundle');
      }

      // Add channel data (only Telegram channels, no groups)
      const newChannel = {
        chatId: channelData.chatId,
        chatTitle: chat.title || channelData.chatTitle,
        isActive: true,
        addedAt: new Date()
      };

      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        { $push: { channels: newChannel } },
        { new: true, runValidators: true }
      ).populate('subscriptionPlans');

      return updatedGroup;
    } catch (error) {
      throw new Error(`Failed to add channel to bundle: ${error.message}`);
    }
  }

  // Remove channel from bundle
  async removeChannelFromGroup(groupId, channelId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Channel bundle not found');
      }

      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        { $pull: { channels: { _id: channelId } } },
        { new: true, runValidators: true }
      ).populate('subscriptionPlans');

      return updatedGroup;
    } catch (error) {
      throw new Error(`Failed to remove channel from bundle: ${error.message}`);
    }
  }

  // Generate join request link for a specific channel in bundle
  async generateChannelJoinLink(groupId, channelId) {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not configured');
      }

      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Channel bundle not found');
      }

      const channel = group.channels.id(channelId);
      if (!channel) {
        throw new Error('Channel not found in bundle');
      }

      // Generate join request link using bot
      try {
        const inviteLink = await this.bot.telegram.createChatInviteLink(channel.chatId, {
          creates_join_request: true,
          name: `${group.name} - ${channel.chatTitle || 'Channel'}`,
          expire_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        });

        // Update the channel with the join link
        await Group.updateOne(
          { _id: groupId, 'channels._id': channelId },
          { $set: { 'channels.$.joinLink': inviteLink.invite_link } }
        );

        return inviteLink.invite_link;
      } catch (telegramError) {
        throw new Error(`Failed to create invite link: ${telegramError.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to generate join link: ${error.message}`);
    }
  }

  // Get all channels for bot consumption (from channel bundles)
  async getActiveChannelsForBot() {
    try {
      const groups = await Group.find({
        status: 'active',
        $or: [
          { telegramChatId: { $exists: true, $ne: null } }, // Legacy single channel support
          { 'channels.0': { $exists: true } } // New channel bundle support
        ]
      }).populate('createdBy', 'email firstName lastName');

      const channelConfigs = [];

      groups.forEach(group => {
        // Handle legacy single channel
        if (group.telegramChatId && !group.channels?.length) {
          channelConfigs.push({
            channel_id: group.telegramChatId,
            admin_id: group.createdBy?._id,
            name: group.name,
            group_id: group._id,
            chat_title: group.telegramChatTitle || group.name,
            join_link: group.telegramInviteLink || null,
            is_legacy: true
          });
        }

        // Handle new channel bundle structure
        if (group.channels?.length) {
          group.channels.forEach(channel => {
            if (channel.isActive) {
              channelConfigs.push({
                channel_id: channel.chatId,
                admin_id: group.createdBy?._id,
                name: group.name,
                group_id: group._id,
                chat_title: channel.chatTitle || group.name,
                channel_db_id: channel._id,
                join_link: channel.joinLink,
                is_legacy: false
              });
            }
          });
        }
      });

      return channelConfigs;
    } catch (error) {
      throw new Error(`Failed to get active channels for bot: ${error.message}`);
    }
  }

  // Add plan to group
  async addPlanToGroup(groupId, planData) {
    try {
      const Plan = require('../models/plan');
      
      // Remove durationValue as it's not part of the Plan schema
      delete planData.durationValue;

      const newPlan = new Plan(planData);
      await newPlan.save();

      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        { $push: { subscriptionPlans: newPlan._id } },
        { new: true, runValidators: true }
      ).populate('subscriptionPlans').populate('createdBy', 'email firstName lastName');

      return updatedGroup;
    } catch (error) {
      throw new Error(`Failed to add plan to group: ${error.message}`);
    }
  }

  // Update plan in group
  async updatePlanInGroup(groupId, planId, updateData) {
    try {
      const Plan = require('../models/plan');

      // Debug logging
      console.log('🔍 Backend - UpdatePlanInGroup called with:');
      console.log('   Group ID:', groupId);
      console.log('   Plan ID:', planId);
      console.log('   Update Data:', updateData);
      console.log('   MRP:', updateData.mrp);
      console.log('   Discount Price:', updateData.discountPrice);
      console.log('   Offer Price:', updateData.offerPrice);
      console.log('🔍 Backend - updatePlanInGroup: received updateData:', updateData); // New log

      // Get current plan to check MRP
      const currentPlan = await Plan.findById(planId);
      console.log('   Current Plan MRP:', currentPlan?.mrp);
      console.log('   Discount < MRP?:', updateData.discountPrice < updateData.mrp);
      console.log('   Offer < MRP?:', updateData.offerPrice < updateData.mrp); // New log

      // Prepare updateData to handle empty strings from frontend and validation
      const mrpToCheck = updateData.mrp || currentPlan?.mrp;

      if (updateData.discountPrice === "") {
        updateData.discountPrice = null;
      } else if (updateData.discountPrice !== null && updateData.discountPrice !== undefined) {
        updateData.discountPrice = Number(updateData.discountPrice);
        if (updateData.discountPrice >= mrpToCheck) {
          throw new Error(`Discount price (${updateData.discountPrice}) must be less than MRP (${mrpToCheck})`);
        }
      }

      if (updateData.offerPrice === "") {
        updateData.offerPrice = null;
      } else if (updateData.offerPrice !== null && updateData.offerPrice !== undefined) {
        updateData.offerPrice = Number(updateData.offerPrice);
        if (updateData.offerPrice >= mrpToCheck) {
          throw new Error(`Offer price (${updateData.offerPrice}) must be less than MRP (${mrpToCheck})`);
        }
      }

      // Update the plan with validation disabled to avoid Mongoose context issues
      const updatedPlan = await Plan.findByIdAndUpdate(
        planId,
        updateData,
        { new: true, runValidators: false }
      );

      if (!updatedPlan) {
        throw new Error('Plan not found');
      }

      // Return the updated group with populated plans
      const group = await Group.findById(groupId)
        .populate('subscriptionPlans')
        .populate('createdBy', 'email firstName lastName');

      return group;
    } catch (error) {
      throw new Error(`Failed to update plan in group: ${error.message}`);
    }
  }

  // Remove plan from group
  async removePlanFromGroup(groupId, planId) {
    try {
      const Plan = require('../models/plan');

      // Remove plan from group's subscriptionPlans array
      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        { $pull: { subscriptionPlans: planId } },
        { new: true, runValidators: true }
      ).populate('subscriptionPlans').populate('createdBy', 'email firstName lastName');

      // Delete the plan document
      await Plan.findByIdAndDelete(planId);

      return updatedGroup;
    } catch (error) {
      throw new Error(`Failed to remove plan from group: ${error.message}`);
    }
  }
}

module.exports = new GroupService();
