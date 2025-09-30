const axios = require('axios');
const fs = require('fs');

// Test admin authentication and invoice fetching
async function testAdminAuth() {
    const baseURL = 'http://localhost:4000/api';
    
    try {
        console.log('=== Testing Admin Authentication ===');
        
        // Test 1: Try to login with default credentials
        console.log('1. Testing login with default super admin credentials...');
        
        try {
            const loginResponse = await axios.post(`${baseURL}/admin/login`, {
                email: 'superadmin@tg.local',
                password: 'SuperAdmin@12345'
            });
            
            console.log('✅ Login successful!');
            const token = loginResponse.data.token;
            const admin = loginResponse.data.admin;
            console.log('Admin:', admin);
            
            // Test 2: Test invoices endpoint with token
            console.log('\n2. Testing invoices endpoint with token...');
            
            const invoicesResponse = await axios.get(`${baseURL}/invoices/admin`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('✅ Invoices endpoint working!');
            console.log('Response:', invoicesResponse.data);
            
        } catch (loginError) {
            console.log('❌ Login failed:', loginError.response?.data?.message || loginError.message);
            
            // Test if admin exists in database
            console.log('\n3. Checking if MongoDB is accessible and admins exist...');
            
            // Test health endpoint
            const healthResponse = await axios.get(`${baseURL.replace('/api', '')}/health`);
            console.log('Health check:', healthResponse.data);
            
            return;
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testAdminAuth();
