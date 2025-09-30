#!/usr/bin/env node
/**
 * Test script to verify group creation fix
 * This script tests the group creation API endpoint to ensure createdBy field is properly set
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api';

// Test data
const testGroupData = {
  name: "Test Group",
  description: "Test group description",
  customRoute: "test-group-" + Date.now(),
  addGST: false,
  faqs: [
    {
      question: "What is this group?",
      answer: "This is a test group"
    }
  ],
  featureToggles: {
    enableESign: true,
    enableKYC: true
  }
};

async function testGroupCreation() {
  try {
    console.log('🧪 Testing Group Creation API...');
    console.log('📝 Test Data:', JSON.stringify(testGroupData, null, 2));
    
    // Note: This test requires a valid admin token
    // You'll need to replace this with a real token from your admin login
    const adminToken = 'YOUR_ADMIN_TOKEN_HERE';
    
    if (adminToken === 'YOUR_ADMIN_TOKEN_HERE') {
      console.log('⚠  Please replace YOUR_ADMIN_TOKEN_HERE with a real admin token');
      console.log('   You can get this by logging in as an admin and checking localStorage');
      return;
    }
    
    const response = await axios.post(`${API_BASE_URL}/groups/create`, testGroupData,{
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Group creation successful!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
    // Verify createdBy field is present
    if (response.data.createdBy) {
      console.log('✅ createdBy field is present:', response.data.createdBy);
    } else {
      console.log('❌ createdBy field is missing!');
    }
    
  } catch (error) {
    console.error('❌ Group creation failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testGroupCreation();