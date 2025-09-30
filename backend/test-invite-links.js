const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000';

// Test configuration
const TEST_USER_ID = '123456789';
const TEST_DURATION = 3600; // 1 hour

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${color}${message}${colors.reset}`);
};

// Test invite link generation
const testGenerateInviteLink = async () => {
  log(colors.blue, '\n🔗 Testing Invite Link Generation...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/invite/invite-link`, {
      params: {
        telegramUserId: TEST_USER_ID,
        duration: TEST_DURATION
      }
    });
    
    if (response.data.success) {
      log(colors.green, '✅ Invite link generated successfully');
      log(colors.yellow, `   Link: ${response.data.link}`);
      log(colors.yellow, `   Link ID: ${response.data.linkId}`);
      log(colors.yellow, `   Expires: ${response.data.expiresAt}`);
      log(colors.yellow, `   Duration: ${response.data.duration}s`);
      return response.data.linkId;
    } else {
      log(colors.red, '❌ Failed to generate invite link');
      return null;
    }
  } catch (error) {
    log(colors.red, `❌ Error generating invite link: ${error.response?.data?.message || error.message}`);
    return null;
  }
};

// Test getting invite links for user
const testGetUserInviteLinks = async () => {
  log(colors.blue, '\n📋 Testing Get User Invite Links...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/invite/invite-links/${TEST_USER_ID}`);
    
    if (response.data.success) {
      log(colors.green, `✅ Found ${response.data.count} invite links for user`);
      response.data.links.forEach((link, index) => {
        log(colors.yellow, `   ${index + 1}. ${link.link} (${link.is_used ? 'Used' : 'Unused'})`);
      });
    } else {
      log(colors.red, '❌ Failed to get user invite links');
    }
  } catch (error) {
    log(colors.red, `❌ Error getting user invite links: ${error.response?.data?.message || error.message}`);
  }
};

// Test getting all invite links
const testGetAllInviteLinks = async () => {
  log(colors.blue, '\n📊 Testing Get All Invite Links...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/invite/invite-links`, {
      params: {
        page: 1,
        limit: 5,
        status: 'unused'
      }
    });
    
    if (response.data.success) {
      log(colors.green, `✅ Found ${response.data.links.length} invite links`);
      log(colors.yellow, `   Total: ${response.data.pagination.total}`);
      log(colors.yellow, `   Page: ${response.data.pagination.page}/${response.data.pagination.pages}`);
    } else {
      log(colors.red, '❌ Failed to get all invite links');
    }
  } catch (error) {
    log(colors.red, `❌ Error getting all invite links: ${error.response?.data?.message || error.message}`);
  }
};

// Test marking invite link as used
const testMarkInviteLinkAsUsed = async (linkId) => {
  if (!linkId) {
    log(colors.red, '❌ No link ID provided for marking as used');
    return;
  }
  
  log(colors.blue, '\n✅ Testing Mark Invite Link as Used...');
  
  try {
    const response = await axios.patch(`${BASE_URL}/api/invite/invite-link/use/${linkId}`, {
      telegramUserId: TEST_USER_ID
    });
    
    if (response.data.success) {
      log(colors.green, '✅ Invite link marked as used successfully');
      log(colors.yellow, `   Used by: ${response.data.link.used_by}`);
      log(colors.yellow, `   Used at: ${response.data.link.used_at}`);
    } else {
      log(colors.red, '❌ Failed to mark invite link as used');
    }
  } catch (error) {
    log(colors.red, `❌ Error marking invite link as used: ${error.response?.data?.message || error.message}`);
  }
};

// Test cleanup expired invite links
const testCleanupExpiredLinks = async () => {
  log(colors.blue, '\n🧹 Testing Cleanup Expired Invite Links...');
  
  try {
    const response = await axios.delete(`${BASE_URL}/api/invite/invite-links/cleanup`);
    
    if (response.data.success) {
      log(colors.green, `✅ Cleaned up ${response.data.deletedCount} expired invite links`);
    } else {
      log(colors.red, '❌ Failed to cleanup expired invite links');
    }
  } catch (error) {
    log(colors.red, `❌ Error cleaning up expired invite links: ${error.response?.data?.message || error.message}`);
  }
};

// Main test function
const runInviteLinkTests = async () => {
  log(colors.blue, '🚀 Starting Invite Link Tests...\n');
  
  try {
    // Test 1: Generate invite link
    const linkId = await testGenerateInviteLink();
    
    // Test 2: Get user invite links
    await testGetUserInviteLinks();
    
    // Test 3: Get all invite links
    await testGetAllInviteLinks();
    
    // Test 4: Mark invite link as used
    await testMarkInviteLinkAsUsed(linkId);
    
    // Test 5: Cleanup expired links
    await testCleanupExpiredLinks();
    
    log(colors.green, '\n🎉 All invite link tests completed!');
    
  } catch (error) {
    log(colors.red, `❌ Test runner failed: ${error.message}`);
  }
};

// Run tests
runInviteLinkTests().catch(error => {
  log(colors.red, `❌ Test runner failed: ${error.message}`);
  process.exit(1);
}); 