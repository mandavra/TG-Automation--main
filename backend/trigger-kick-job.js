require('dotenv').config();
const axios = require('axios');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';

async function triggerKickJob() {
  try {
    console.log(`Triggering kick job on server: ${SERVER_URL}`);
    
    // Make a request to trigger the kick job
    const response = await axios.post(`${SERVER_URL}/api/admin/trigger-kick-job`, {}, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });
    
    console.log('✅ Kick job triggered successfully');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error triggering kick job:', error.message);
    
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
  }
}

// Run the function
triggerKickJob(); 