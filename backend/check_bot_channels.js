const axios = require('axios');

async function checkBotChannels() {
  try {
    console.log('🔍 Checking what channel data the bot should be loading...');
    console.log('');
    
    // This is the exact API call the bot makes
    const response = await axios.get('http://localhost:4000/api/groups/active');
    const channelsData = response.data.active_channels;
    
    console.log('📋 Raw API response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    
    console.log('🤖 Bot should load these channels:');
    console.log('');
    
    // Simulate what the bot does (lines 58-69 in bot script)
    const botActiveChannels = {};
    
    for (const channelData of channelsData) {
      const channelId = channelData.channel_id;
      if (channelId) {
        botActiveChannels[parseInt(channelId)] = {
          'admin_id': String(channelData.admin_id || ''),
          'name': channelData.name || 'Unknown Channel',
          'group_id': String(channelData.group_id || ''),
          'chat_title': channelData.chat_title || 'Unknown Channel',
          'is_legacy': channelData.is_legacy || false,
          'channel_db_id': channelData.channel_db_id || '',
          'join_link': channelData.join_link || ''
        };
      }
    }
    
    console.log('📊 Channels that bot should recognize:');
    for (const [channelId, info] of Object.entries(botActiveChannels)) {
      console.log(`   Channel ID: ${channelId} (${typeof parseInt(channelId)})`);
      console.log(`   Title: ${info.chat_title}`);
      console.log(`   Bundle: ${info.name}`);
      console.log(`   Legacy: ${info.is_legacy}`);
      console.log('   ---');
    }
    
    console.log('');
    console.log('🎯 Target Channel Analysis:');
    const targetChannelId = -1002842114460;
    const isTargetConfigured = botActiveChannels.hasOwnProperty(targetChannelId);
    
    console.log(`   Target Channel ID: ${targetChannelId}`);
    console.log(`   Is Configured: ${isTargetConfigured}`);
    
    if (isTargetConfigured) {
      console.log('   Configuration:', botActiveChannels[targetChannelId]);
      console.log('');
      console.log('✅ Channel is properly configured - bot should accept join requests');
      console.log('💡 If bot still rejects, it needs to reload its configuration');
    } else {
      console.log('');
      console.log('❌ Channel is NOT configured in bot data');
      console.log('💡 Bot configuration needs to be updated');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   Response:', error.response.data);
    }
  }
}

checkBotChannels();
