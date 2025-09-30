const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Admin = require('../models/admin.model');

mongoose.connect('mongodb://localhost:27017/tg_automation');

async function createTestInvoice() {
  try {
    console.log('=== Creating Test Invoice ===\n');
    
    // Get an admin first
    const admin = await Admin.findOne({ email: 'abc@abc.com' });
    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }
    
    console.log('Found admin:', admin.email);
    
    // Create a test invoice
    const testInvoice = new Invoice({
      invoiceNo: 'INV-TEST-001',
      billDate: new Date(),
      userid: new mongoose.Types.ObjectId(),
      adminId: admin._id,
      billedTo: {
        name: 'John Doe',
        phone: '9999999999',
        email: 'john.doe@test.com',
        address: 'Mumbai',
        stateCode: '27'
      },
      creator: {
        name: 'VYOM RESEARCH LLP',
        pan: 'AAYFV4090K',
        gstin: '24AAYFV4090K1ZE',
        address: 'Shop no. 238 Services, Gujarat',
        stateCode: '24'
      },
      description: 'Test Service',
      price: 1000,
      igst: 18,
      igstAmt: 180,
      total: 1180,
      transactionId: 'TEST_TXN_001',
      status: 'generated',
      localPdfPath: '/test/path/invoice.pdf'
    });
    
    await testInvoice.save();
    console.log('✅ Test invoice created:', testInvoice.invoiceNo);
    console.log('Invoice ID:', testInvoice._id);
    
    // Create another test invoice
    const testInvoice2 = new Invoice({
      invoiceNo: 'INV-TEST-002',
      billDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      userid: new mongoose.Types.ObjectId(),
      adminId: admin._id,
      billedTo: {
        name: 'Jane Smith',
        phone: '8888888888',
        email: 'jane.smith@test.com',
        address: 'Delhi',
        stateCode: '07'
      },
      creator: {
        name: 'VYOM RESEARCH LLP',
        pan: 'AAYFV4090K',
        gstin: '24AAYFV4090K1ZE',
        address: 'Shop no. 238 Services, Gujarat',
        stateCode: '24'
      },
      description: 'Premium Service',
      price: 2000,
      igst: 18,
      igstAmt: 360,
      total: 2360,
      transactionId: 'TEST_TXN_002',
      status: 'sent',
      localPdfPath: '/test/path/invoice2.pdf'
    });
    
    await testInvoice2.save();
    console.log('✅ Test invoice 2 created:', testInvoice2.invoiceNo);
    
    console.log('\n=== Test Invoices Created Successfully ===');
    console.log('You should now see invoices in the admin panel');
    
  } catch (error) {
    console.error('❌ Error creating test invoice:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

createTestInvoice();