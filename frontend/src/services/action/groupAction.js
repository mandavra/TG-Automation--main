import api from '../api';
import { toast } from 'react-toastify';


// Debug function to check authentication status
const debugAuth = () => {
  const token = localStorage.getItem('token');
  const auth = localStorage.getItem('auth');
  const adminRole = localStorage.getItem('adminRole');
  
  console.log('🔍 Auth Debug Info:', {
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'None',
    auth: auth,
    adminRole: adminRole,
    isLoggedIn: !!(token && auth === 'true')
  });
  
  return { hasToken: !!token, isLoggedIn: !!(token && auth === 'true') };
};

// Group Actions
export const groupActions = {
  // Create a new group
  createGroup: async (groupData) => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.post('/groups/create', groupData);
      toast.success('Group created successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create group';
      toast.error(message);
      throw error;
    }
  },

  // Get all groups
  getAllGroups: async () => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.get('/groups/all');
      return response.data.groups || response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch groups';
      toast.error(message);
      throw error;
    }
  },

  // Get group by ID
  getGroupById: async (groupId) => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.get(`/groups/${groupId}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch group';
      toast.error(message);
      throw error;
    }
  },

  // Update group
  updateGroup: async (groupId, updateData) => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.put(`/groups/${groupId}`, updateData);
      toast.success('Group updated successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update group';
      toast.error(message);
      throw error;
    }
  },

  // Delete group
  deleteGroup: async (groupId) => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.delete(`/groups/${groupId}`);
      toast.success('Group deleted successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete group';
      toast.error(message);
      throw error;
    }
  },

  // Link group with Telegram
  linkTelegramGroup: async (groupId, chatId) => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.post(`/groups/${groupId}/link-telegram`, { chatId });
      toast.success('Group linked with Telegram successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to link group with Telegram';
      toast.error(message);
      throw error;
    }
  },

  // Test bot connection
  testBotConnection: async (groupId, chatId) => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.post(`/groups/${groupId}/test-connection`, { chatId });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to test bot connection';
      toast.error(message);
      throw error;
    }
  },

  // Get group statistics
  getGroupStats: async (groupId) => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.get(`/groups/${groupId}/stats`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch group statistics';
      toast.error(message);
      throw error;
    }
  },

  // Update group statistics
  updateGroupStats: async (groupId, statsData) => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.put(`/groups/${groupId}/stats`, statsData);
      toast.success('Group statistics updated successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update group statistics';
      toast.error(message);
      throw error;
    }
  },

  // Set group as default
  setDefaultGroup: async (groupId) => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.post(`/groups/${groupId}/set-default`);
      toast.success('Default group updated successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to set default group';
      toast.error(message);
      throw error;
    }
  },

  // Get default group
  getDefaultGroup: async () => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.get('/groups/default');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch default group';
      toast.error(message);
      throw error;
    }
  },

  // Search groups
  searchGroups: async (searchParams) => {
    try {
      debugAuth(); // Debug authentication
      const response = await api.get('/groups/search', { params: searchParams });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to search groups';
      toast.error(message);
      throw error;
    }
  }
};

export default groupActions;
