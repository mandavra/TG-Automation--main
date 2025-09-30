const axios = require('axios');
const mongoose = require('mongoose');
const Admin = require('../models/admin.model');
const PaymentLink = require('../models/paymentLinkModel');
const { calculateAdminBalance } = require('../controllers/withdrawalController');

mongoose.connect('mongodb://localhost:27017/tg_automation');

async function testDirectly() {
  try {
    console.log('=== Direct Balance Test ===\n');
    
    // Get admin directly from DB
    const admin = await Admin.findOne({ email: 'abc@abc.com' });
    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }
    
    console.log('Admin found:', admin.email, 'ID:', admin._id.toString());
    
    // Check payments in DB
    const payments = await PaymentLink.find({ adminId: admin._id, status: 'SUCCESS' });
    console.log('Direct DB query - Successful payments:', payments.length);
    
    if (payments.length > 0) {
      const totalCommission = payments.reduce((sum, p) => sum + p.adminCommission, 0);
      console.log('Total commission from DB:', totalCommission);
    }
    
    // Test the controller function directly
    console.log('\n--- Testing Controller Function ---');
    try {
      const balance = await calculateAdminBalance(admin._id);
      console.log('Controller result:', balance);
    } catch (error) {
      console.log('Controller error:', error.message);
    }
    
    // Test API call
    console.log('\n--- Testing API Call ---');
    try {
      const loginResponse = await axios.post('http://localhost:4000/api/admin/login', {
        email: 'abc@abc.com',
        password: 'testpassword123'
      });
      
      const token = loginResponse.data.token;
      const balanceResponse = await axios.get('http://localhost:4000/api/withdrawal/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('API result:', balanceResponse.data);
      console.log('Admin from token:', loginResponse.data.admin);
      
      // Check if token admin ID matches DB admin ID
      if (loginResponse.data.admin.id !== admin._id.toString()) {
        console.log('⚠️  Token admin ID mismatch!');
        console.log('DB admin ID:', admin._id.toString());
        console.log('Token admin ID:', loginResponse.data.admin.id);
        
        // Check if there are payments for the token admin ID
        const tokenAdminPayments = await PaymentLink.find({ 
          adminId: new mongoose.Types.ObjectId(loginResponse.data.admin.id), 
          status: 'SUCCESS' 
        });
        console.log('Payments for token admin:', tokenAdminPayments.length);
        
      }
    } catch (error) {
      console.log('API error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

testDirectly();