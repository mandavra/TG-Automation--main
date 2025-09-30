#!/usr/bin/env node

const axios = require('axios');

async function testPublicAPI() {
  const testRoute = 'abcpremium'; // From the screenshot
  
  console.log('🧪 Testing Public API Endpoints');
  console.log('================================\n');
  
  try {
    // Test 1: New API endpoint
    console.log(`1. Testing: GET /api/groups/by-route/${testRoute}`);
    try {
      const response = await axios.get(`http://localhost:4000/api/groups/by-route/${testRoute}`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
          // No auth headers
        }
      });
      
      console.log('✅ Status:', response.status);
      console.log('✅ Response:', response.data.success ? 'Success' : 'Failed');
      if (response.data.group) {
        console.log('✅ Group Name:', response.data.group.name);
        console.log('✅ Custom Route:', response.data.group.customRoute);
        console.log('✅ Feature Toggles:', response.data.group.featureToggles);
      }
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    console.log('\n');
    
    // Test 2: Alternative API endpoint  
    console.log(`2. Testing: GET /api/groups/route/${testRoute}`);
    try {
      const response = await axios.get(`http://localhost:4000/api/groups/route/${testRoute}`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Status:', response.status);
      console.log('✅ Group found:', response.data?.name || 'No name');
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    console.log('\n');
    
    // Test 3: List all active groups
    console.log(`3. Testing: GET /api/groups/active`);
    try {
      const response = await axios.get(`http://localhost:4000/api/groups/active`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Status:', response.status);
      console.log('✅ Groups found:', Array.isArray(response.data) ? response.data.length : 'Not array');
      
      if (Array.isArray(response.data)) {
        response.data.forEach((group, index) => {
          console.log(`   ${index + 1}. ${group.name} → /pc/${group.customRoute}`);
        });
      }
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('🚨 Test script error:', error.message);
  }
}

if (require.main === module) {
  testPublicAPI();
}