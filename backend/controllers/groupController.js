const groupService = require('../services/groupService');
// const cloudinaryService = require('../services/cloudinaryService');
const Group = require('../models/group.model');
const User = require('../models/user.model');
const InviteLink = require('../models/InviteLink');
const { generateInviteLink } = require('../services/groupService');
// const cloudinaryService = require('../services/cloudinaryService'); // Remove this line
const { generateOTP } = require('../db/generateOTP');
const { sendEmail } = require('../services/emailService');

// Create a new channel bundle
const createGroup = async (req, res) => {
  try {
    const groupData = req.setGroupOwnership({
      ...req.body
    });

    // TODO: Implement Multer-based image upload here
    // For now, if an image is provided, assume it's handled by Multer middleware
    if (req.file) {
      groupData.image = req.file.path; // Assuming Multer stores the path in req.file.path
    }

    // Pass admin role to service for feature toggle enforcement
    const adminRole = req.admin?.role || 'admin';
    const group = await groupService.createGroup(groupData, adminRole);
    res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all channel bundles - Admin specific
const getAllGroups = async (req, res) => {
  try {
    // Use tenant filter from middleware
    const filter = req.getGroupTenantFilter();
    const groups = await groupService.getAllGroups(filter);
    
    res.json({
      groups,
      adminSpecific: req.admin.role !== 'superadmin'
    });
  } catch (error) {
    console.error('Get all groups error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get group by ID - Admin specific
const getGroupById = async (req, res) => {
  try {
    const filter = req.getGroupTenantFilter();
    const group = await groupService.getGroupById(req.params.id, filter);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    res.json(group);
  } catch (error) {
    console.error('Get group by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update group - Admin specific
const updateGroup = async (req, res) => {
  try {
    // First check if group exists and admin has access
    const group = await groupService.getGroupById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Debug logging for access control
    const groupCreatedByID = group.createdBy?._id ? group.createdBy._id.toString() : group.createdBy?.toString();
    const currentAdminID = req.adminContext?.adminId?.toString();
    
    console.log('🔍 Admin access check for updateGroup:');
    console.log('   Group ID:', req.params.id);
    console.log('   Group createdBy (raw):', group.createdBy);
    console.log('   Group createdBy ID:', groupCreatedByID);
    console.log('   Current admin ID:', currentAdminID);
    console.log('   Admin role:', req.adminContext?.role);
    console.log('   Is superadmin?', req.adminContext?.role === 'superadmin');
    console.log('   IDs match?', groupCreatedByID === currentAdminID);
    
    // Check if admin has access to this group
    if (req.adminContext?.role !== 'superadmin' && 
        groupCreatedByID !== currentAdminID) {
      console.log('❌ Access denied - admin does not own this group');
      return res.status(403).json({ message: 'Access denied to this group' });
    }
    
    console.log('✅ Access granted for group update');

    const updateData = { ...req.body };

    // TODO: Implement Multer-based image upload here for updates
    if (req.file) {
      updateData.image = req.file.path; // Assuming Multer stores the path in req.file.path
    }

    // Pass admin role to service for feature toggle enforcement
    const adminRole = req.admin?.role || req.adminContext?.role || 'admin';
    const updatedGroup = await groupService.updateGroup(req.params.id, updateData, adminRole);
    res.json(updatedGroup);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete group - Admin specific
const deleteGroup = async (req, res) => {
  try {
    // First check if group exists and admin has access
    const group = await groupService.getGroupById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if admin has access to this group
    if (req.adminContext?.role !== 'superadmin' && 
        group.createdBy.toString() !== req.adminContext?.adminId.toString()) {
      return res.status(403).json({ message: 'Access denied to this group' });
    }

    const result = await groupService.deleteGroup(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Link group with Telegram
const linkTelegramGroup = async (req, res) => {
  try {
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ 
        message: 'Telegram chat ID is required' 
      });
    }

    const updatedGroup = await groupService.linkTelegramGroup(req.params.id, { chatId });
    res.json(updatedGroup);
  } catch (error) {
    console.error('Link Telegram group error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Test bot connection
const testBotConnection = async (req, res) => {
  try {
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ 
        message: 'Telegram chat ID is required' 
      });
    }

    const result = await groupService.testBotConnection(chatId);
    res.json(result);
  } catch (error) {
    console.error('Test bot connection error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get group statistics
const getGroupStats = async (req, res) => {
  try {
    const stats = await groupService.getGroupStats(req.params.id);
    res.json(stats);
  } catch (error) {
    console.error('Get group stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update group statistics
const updateGroupStats = async (req, res) => {
  try {
    const updatedGroup = await groupService.updateGroupStats(req.params.id, req.body);
    res.json(updatedGroup);
  } catch (error) {
    console.error('Update group stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Set group as default
const setDefaultGroup = async (req, res) => {
  try {
    const group = await groupService.setDefaultGroup(req.params.id);
    res.json(group);
  } catch (error) {
    console.error('Set default group error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get default group
const getDefaultGroup = async (req, res) => {
  try {
    const group = await groupService.getDefaultGroup();
    if (!group) {
      return res.status(404).json({ message: 'No default group found' });
    }
    res.json(group);
  } catch (error) {
    console.error('Get default group error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get active groups for Telegram bot (Public endpoint)
const getActiveGroups = async (req, res) => {
  try {
    // Use the new service method that handles both legacy and multi-channel groups
    const activeChannels = await groupService.getActiveChannelsForBot();
    
    res.json({
      success: true,
      active_channels: activeChannels,
      count: activeChannels.length
    });
  } catch (error) {
    console.error('Get active groups error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Search groups
const searchGroups = async (req, res) => {
  try {
    const { query, status, type } = req.query;
    
    let searchCriteria = {};
    
    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { telegramChatTitle: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (status) {
      searchCriteria.status = status;
    }
    
    if (type) {
      searchCriteria.telegramChatType = type;
    }

    const groups = await groupService.searchGroups(searchCriteria);
    res.json(groups);
  } catch (error) {
    console.error('Search groups error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Check route availability
const checkRouteAvailability = async (req, res) => {
  try {
    const { customRoute } = req.body;
    const { groupId } = req.query; // Optional, for updates
    
    const result = await groupService.checkRouteAvailability(customRoute, groupId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Check route availability error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get group by custom route (public endpoint for landing pages)
const getGroupByRoute = async (req, res) => {
  try {
    const { route } = req.params;
    
    const group = await groupService.getGroupByRoute(route);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or inactive'
      });
    }
    
    // Return group data with plans for landing page
    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        image: group.image,
        customRoute: group.customRoute,
        subscriptionPlans: group.subscriptionPlans,
        faqs: group.faqs,
        addGST: group.addGST,
        stats: group.stats,
        telegramChatTitle: group.telegramChatTitle,
        channels: group.channels
      }
    });
  } catch (error) {
    console.error('Get group by route error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Add channel to group
const addChannelToGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { chatId, chatType, chatTitle } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    // Check if admin has access to this group
    const group = await groupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Debug logging for access control
    const groupCreatedByID = group.createdBy?._id ? group.createdBy._id.toString() : group.createdBy?.toString();
    const currentAdminID = req.adminContext?.adminId?.toString();
    
    console.log('🔍 Admin access check for addChannelToGroup:');
    console.log('   Group ID:', groupId);
    console.log('   Group createdBy (raw):', group.createdBy);
    console.log('   Group createdBy ID:', groupCreatedByID);
    console.log('   Current admin ID:', currentAdminID);
    console.log('   Admin role:', req.adminContext?.role);
    console.log('   Is superadmin?', req.adminContext?.role === 'superadmin');
    console.log('   IDs match?', groupCreatedByID === currentAdminID);
    
    if (req.adminContext?.role !== 'superadmin' && 
        groupCreatedByID !== currentAdminID) {
      console.log('❌ Access denied - admin does not own this group');
      return res.status(403).json({ message: 'Access denied to this group' });
    }
    
    console.log('✅ Access granted for channel addition');

    // Check if channel already exists in this bundle
    const existingChannel = group.channels.find(channel => channel.chatId === chatId);
    if (existingChannel) {
      return res.status(400).json({
        success: false,
        message: 'Channel already exists in this bundle'
      });
    }

    const updatedGroup = await groupService.addChannelToGroup(groupId, {
      chatId,
      chatTitle
    });

    res.json({
      success: true,
      group: updatedGroup,
      message: 'Channel added successfully'
    });
  } catch (error) {
    console.error('Add channel error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Remove channel from group
const removeChannelFromGroup = async (req, res) => {
  try {
    const { id: groupId, channelId } = req.params;

    // Check if admin has access to this group
    const group = await groupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    if (req.adminContext?.role !== 'superadmin' && 
        group.createdBy.toString() !== req.adminContext?.adminId.toString()) {
      return res.status(403).json({ message: 'Access denied to this group' });
    }

    const updatedGroup = await groupService.removeChannelFromGroup(groupId, channelId);
    
    res.json({
      success: true,
      group: updatedGroup,
      message: 'Channel removed successfully'
    });
  } catch (error) {
    console.error('Remove channel error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Generate join request link for channel
const generateChannelJoinLink = async (req, res) => {
  try {
    const { id: groupId, channelId } = req.params;

    // Check if admin has access to this group
    const group = await groupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    if (req.adminContext?.role !== 'superadmin' && 
        group.createdBy.toString() !== req.adminContext?.adminId.toString()) {
      return res.status(403).json({ message: 'Access denied to this group' });
    }

    const joinLink = await groupService.generateChannelJoinLink(groupId, channelId);
    
    res.json({
      success: true,
      joinLink,
      message: 'Join link generated successfully'
    });
  } catch (error) {
    console.error('Generate join link error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all channels for a group
const getGroupChannels = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    
    const group = await groupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Debug logging for access control
    const groupCreatedByID = group.createdBy?._id ? group.createdBy._id.toString() : group.createdBy?.toString();
    const currentAdminID = req.adminContext?.adminId?.toString();
    
    console.log('🔍 Admin access check for getGroupChannels:');
    console.log('   Group ID:', groupId);
    console.log('   Group createdBy (raw):', group.createdBy);
    console.log('   Group createdBy ID:', groupCreatedByID);
    console.log('   Current admin ID:', currentAdminID);
    console.log('   Admin role:', req.adminContext?.role);
    console.log('   Is superadmin?', req.adminContext?.role === 'superadmin');
    console.log('   IDs match?', groupCreatedByID === currentAdminID);
    
    // Check if admin has access to this group
    if (req.adminContext?.role !== 'superadmin' && 
        groupCreatedByID !== currentAdminID) {
      console.log('❌ Access denied - admin does not own this group');
      return res.status(403).json({ message: 'Access denied to this group' });
    }
    
    console.log('✅ Access granted for channel fetch');

    const channels = group.channels || [];
    console.log('📋 Channels found in group:');
    console.log('   Group channels array:', channels);
    console.log('   Channels count:', channels.length);
    if (channels.length > 0) {
      console.log('   Sample channel:', channels[0]);
    }

    res.json({
      success: true,
      channels: channels,
      count: channels.length
    });
  } catch (error) {
    console.error('Get group channels error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get plans for a specific group
const getGroupPlans = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    
    const group = await groupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Debug logging for access control
    const groupCreatedByID = group.createdBy?._id ? group.createdBy._id.toString() : group.createdBy?.toString();
    const currentAdminID = req.adminContext?.adminId?.toString();
    
    console.log('🔍 Admin access check for getGroupPlans:');
    console.log('   Group ID:', groupId);
    console.log('   Group createdBy (raw):', group.createdBy);
    console.log('   Group createdBy ID:', groupCreatedByID);
    console.log('   Current admin ID:', currentAdminID);
    console.log('   Admin role:', req.adminContext?.role);
    console.log('   Is superadmin?', req.adminContext?.role === 'superadmin');
    console.log('   IDs match?', groupCreatedByID === currentAdminID);
    
    // Check if admin has access to this group
    if (req.adminContext?.role !== 'superadmin' && 
        groupCreatedByID !== currentAdminID) {
      console.log('❌ Access denied - admin does not own this group');
      return res.status(403).json({ message: 'Access denied to this group' });
    }
    
    console.log('✅ Access granted for plans fetch');

    const plans = group.subscriptionPlans || [];
    console.log('📋 Plans found in group:');
    console.log('   Group subscriptionPlans array:', plans);
    console.log('   Plans count:', plans.length);
    if (plans.length > 0) {
      console.log('   Sample plan:', plans[0]);
    }

    res.json({
      success: true,
      plans: plans,
      count: plans.length
    });
  } catch (error) {
    console.error('Get group plans error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add plan to group
const addPlanToGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const planData = {
      ...req.body,
      adminId: req.adminContext?.adminId,
      groupId: groupId
    };

    // Check if admin has access to this group
    const group = await groupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Debug logging for access control
    const groupCreatedByID = group.createdBy?._id ? group.createdBy._id.toString() : group.createdBy?.toString();
    const currentAdminID = req.adminContext?.adminId?.toString();
    
    console.log('🔍 Admin access check for addPlanToGroup:');
    console.log('   Group ID:', groupId);
    console.log('   Group createdBy (raw):', group.createdBy);
    console.log('   Group createdBy ID:', groupCreatedByID);
    console.log('   Current admin ID:', currentAdminID);
    console.log('   Admin role:', req.adminContext?.role);
    console.log('   Is superadmin?', req.adminContext?.role === 'superadmin');
    console.log('   IDs match?', groupCreatedByID === currentAdminID);
    
    if (req.adminContext?.role !== 'superadmin' && 
        groupCreatedByID !== currentAdminID) {
      console.log('❌ Access denied - admin does not own this group');
      return res.status(403).json({ message: 'Access denied to this group' });
    }
    
    console.log('✅ Access granted for plan addition');

    const updatedGroup = await groupService.addPlanToGroup(groupId, planData);
    
    res.status(201).json({
      success: true,
      group: updatedGroup,
      message: 'Plan added to group successfully'
    });
  } catch (error) {
    console.error('Add plan to group error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reorder plans in group
const reorderGroupPlans = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { plans } = req.body;

    // Validate request data
    if (!plans || !Array.isArray(plans)) {
      return res.status(400).json({ 
        success: false,
        message: 'Plans array is required' 
      });
    }

    // Check if admin has access to this group
    const group = await groupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Debug logging for access control
    const groupCreatedByID = group.createdBy?._id ? group.createdBy._id.toString() : group.createdBy?.toString();
    const currentAdminID = req.adminContext?.adminId?.toString();
    
    console.log('🔍 Admin access check for reorderGroupPlans:');
    console.log('   Group ID:', groupId);
    console.log('   Group createdBy ID:', groupCreatedByID);
    console.log('   Current admin ID:', currentAdminID);
    console.log('   Admin role:', req.adminContext?.role);
    console.log('   Plans to reorder:', plans.length);
    
    if (req.adminContext?.role !== 'superadmin' && 
        groupCreatedByID !== currentAdminID) {
      console.log('❌ Access denied - admin does not own this group');
      return res.status(403).json({ message: 'Access denied to this group' });
    }
    
    console.log('✅ Access granted for plan reordering');

    // Update the order field for each plan and save
    const reorderedPlans = plans.map((plan, index) => ({
      ...plan,
      order: index,
      updatedAt: new Date()
    }));

    console.log('📝 Reordering plans with new order:', reorderedPlans.map((p, i) => ({ id: p._id, order: i })));

    // Update the group with the new plan order
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { 
        $set: { 
          subscriptionPlans: reorderedPlans,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'email username');

    if (!updatedGroup) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update group with reordered plans'
      });
    }

    console.log('✅ Plans reordered successfully');
    
    res.json({
      success: true,
      message: 'Plans reordered successfully',
      group: updatedGroup,
      plans: updatedGroup.subscriptionPlans
    });
  } catch (error) {
    console.error('Reorder group plans error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update plan in group
const updateGroupPlan = async (req, res) => {
  try {
    const { id: groupId, planId } = req.params;

    // Check if admin has access to this group
    const group = await groupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Debug logging for access control
    const groupCreatedByID = group.createdBy?._id ? group.createdBy._id.toString() : group.createdBy?.toString();
    const currentAdminID = req.adminContext?.adminId?.toString();
    
    console.log('🔍 Admin access check for updateGroupPlan:');
    console.log('   Group ID:', groupId);
    console.log('   Plan ID:', planId);
    console.log('   Group createdBy (raw):', group.createdBy);
    console.log('   Group createdBy ID:', groupCreatedByID);
    console.log('   Current admin ID:', currentAdminID);
    console.log('   Admin role:', req.adminContext?.role);
    console.log('   Is superadmin?', req.adminContext?.role === 'superadmin');
    console.log('   IDs match?', groupCreatedByID === currentAdminID);
    
    if (req.adminContext?.role !== 'superadmin' && 
        groupCreatedByID !== currentAdminID) {
      console.log('❌ Access denied - admin does not own this group');
      return res.status(403).json({ message: 'Access denied to this group' });
    }
    
    console.log('✅ Access granted for plan update');

    const updatedGroup = await groupService.updatePlanInGroup(groupId, planId, req.body);
    
    res.json({
      success: true,
      group: updatedGroup,
      message: 'Plan updated successfully'
    });
  } catch (error) {
    console.error('Update group plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Remove plan from group
const removePlanFromGroup = async (req, res) => {
  try {
    const { id: groupId, planId } = req.params;

    // Check if admin has access to this group
    const group = await groupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    if (req.adminContext?.role !== 'superadmin' && 
        group.createdBy.toString() !== req.adminContext?.adminId.toString()) {
      return res.status(403).json({ message: 'Access denied to this group' });
    }

    const updatedGroup = await groupService.removePlanFromGroup(groupId, planId);
    
    res.json({
      success: true,
      group: updatedGroup,
      message: 'Plan removed from group successfully'
    });
  } catch (error) {
    console.error('Remove plan from group error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update group page content
const updateGroupPageContent = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const contentData = req.body;

    // First check if group exists and admin has access
    const group = await groupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Debug logging for access control
    const groupCreatedByID = group.createdBy?._id ? group.createdBy._id.toString() : group.createdBy?.toString();
    const currentAdminID = req.adminContext?.adminId?.toString();
    
    console.log('🔍 Admin access check for updateGroupPageContent:');
    console.log('   Group ID:', groupId);
    console.log('   Group createdBy ID:', groupCreatedByID);
    console.log('   Current admin ID:', currentAdminID);
    console.log('   Admin role:', req.adminContext?.role);
    console.log('   IDs match?', groupCreatedByID === currentAdminID);
    
    // Check if admin has access to this group
    if (req.adminContext?.role !== 'superadmin' && 
        groupCreatedByID !== currentAdminID) {
      return res.status(403).json({ message: 'Access denied to this group' });
    }
    
    console.log('✅ Access granted for page content update');

    // Build the update object for page content fields
    const updateData = {};
    
    // How It Works section
    if (contentData.howItWorksTitle) {
      updateData['howItWorks.title'] = contentData.howItWorksTitle;
    }
    if (contentData.howItWorksDescription) {
      updateData['howItWorks.description'] = contentData.howItWorksDescription;
    }
    
    // Content Section
    if (contentData.contentSectionEnabled !== undefined) {
      updateData['contentSection.hidden'] = !contentData.contentSectionEnabled;
    }
    if (contentData.contentSectionTitle) {
      updateData['contentSection.title'] = contentData.contentSectionTitle;
    }
    if (contentData.contentSectionSubtitle) {
      updateData['contentSection.subtitle'] = contentData.contentSectionSubtitle;
    }
    if (contentData.contentSectionDescription) {
      updateData['contentSection.description'] = contentData.contentSectionDescription;
    }
    if (contentData.contentSectionExpandedText) {
      updateData['contentSection.expandedText'] = contentData.contentSectionExpandedText;
    }
    
    // Disclaimer section
    if (contentData.disclaimerEnabled !== undefined) {
      updateData['disclaimer.hidden'] = !contentData.disclaimerEnabled;
    }
    if (contentData.disclaimerTitle) {
      updateData['disclaimer.title'] = contentData.disclaimerTitle;
    }
    if (contentData.disclaimerContent) {
      updateData['disclaimer.content'] = contentData.disclaimerContent;
    }
    if (contentData.disclaimerLearnMoreText) {
      updateData['disclaimer.learnMoreText'] = contentData.disclaimerLearnMoreText;
    }
    if (contentData.disclaimerLearnMoreLink) {
      updateData['disclaimer.learnMoreLink'] = contentData.disclaimerLearnMoreLink;
    }

    console.log('📝 Updating page content with data:', updateData);

    // Update the group with page content changes
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy', 'email username');

    res.json({
      success: true,
      message: 'Page content updated successfully',
      group: updatedGroup
    });

  } catch (error) {
    console.error('Update group page content error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get group by custom route for public pages (API endpoint)
const getPublicGroupByRoute = async (req, res) => {
  try {
    const { route } = req.params;
    console.log(`[PUBLIC API] Getting group by route: ${route}`);
    
    const group = await groupService.getGroupByRoute(route);
    console.log(`[PUBLIC API] Group service returned:`, group ? 'Found' : 'Not found');
    
    if (!group) {
      console.log(`Group not found for route: ${route}`);
      return res.status(404).json({
        success: false,
        message: 'Channel bundle not found or inactive',
        route: route
      });
    }
    
    console.log(`Group found: ${group.name} for route: ${route}`);
    
    // Return formatted group data for frontend
    res.json({
      success: true,
      route: route,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        image: group.image,
        customRoute: group.customRoute,
        subscriptionPlans: group.subscriptionPlans,
        faqs: group.faqs || [],
        addGST: group.addGST,
        featureToggles: group.featureToggles || {
          enableESign: true,
          enableKYC: true
        },
        stats: group.stats,
        telegramChatTitle: group.telegramChatTitle,
        telegramChatId: group.telegramChatId,
        channels: group.channels || [],
        createdBy: group.createdBy
      }
    });
    
  } catch (error) {
    console.error('Get public group by route error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
};

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  linkTelegramGroup,
  testBotConnection,
  getGroupStats,
  updateGroupStats,
  setDefaultGroup,
  getDefaultGroup,
  getActiveGroups,
  searchGroups,
  checkRouteAvailability,
  getGroupByRoute,
  addChannelToGroup,
  removeChannelFromGroup,
  generateChannelJoinLink,
  getGroupChannels,
  getGroupPlans,
  addPlanToGroup,
  reorderGroupPlans,
  updateGroupPlan,
  removePlanFromGroup,
  updateGroupPageContent,
  getPublicGroupByRoute
};
