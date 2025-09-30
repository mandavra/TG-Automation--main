const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');

mongoose.connect('mongodb://localhost:27017/tg_automation');

async function createTestInvoicesForAdmin() {
  try {
    console.log('=== Creating Test Invoices for Admin ===\n');
    
    const adminId = '68b18640332382f6ec9df28b'; // Current logged-in admin ID
    
    // Create test invoices for the current admin
    const testInvoices = [
      {
        invoiceNo: 'INV-TEST-001',
        billDate: new Date(),
        billedTo: {
          name: 'Test Customer 1',
          phone: '9876543210',
          email: 'test1@example.com',
          address: 'Test Address 1',
          stateCode: '24'
        },
        creator: {
          name: 'VYOM RESEARCH LLP',
          pan: 'AAYFV4090K',
          gstin: '24AAYFV4090K1ZE',
          address: 'Shop no. 238 Services, Gujarat',
          stateCode: '24'
        },
        description: 'Test Invoice 1',
        price: 1000,
        igst: 18,
        igstAmt: 180,
        total: 1180,
        transactionId: 'TEST-TXN-001',
        adminId: adminId,
        localPdfPath: 'test/path/invoice1.pdf'
      },
      {
        invoiceNo: 'INV-TEST-002',
        billDate: new Date(),
        billedTo: {
          name: 'Test Customer 2',
          phone: '9876543211',
          email: 'test2@example.com',
          address: 'Test Address 2',
          stateCode: '24'
        },
        creator: {
          name: 'VYOM RESEARCH LLP',
          pan: 'AAYFV4090K',
          gstin: '24AAYFV4090K1ZE',
          address: 'Shop no. 238 Services, Gujarat',
          stateCode: '24'
        },
        description: 'Test Invoice 2',
        price: 2000,
        igst: 18,
        igstAmt: 360,
        total: 2360,
        transactionId: 'TEST-TXN-002',
        adminId: adminId,
        localPdfPath: 'test/path/invoice2.pdf'
      }
    ];
    
    // Insert test invoices
    for (const invoice of testInvoices) {
      await Invoice.create(invoice);
      console.log(`✅ Created test invoice: ${invoice.invoiceNo} for admin ${adminId}`);
    }
    
    console.log('\n=== Test Invoices Created Successfully ===');
    console.log(`Created ${testInvoices.length} invoices for admin: ${adminId}`);
    
    // Verify the invoices were created
    const count = await Invoice.countDocuments({ adminId });
    console.log(`Total invoices for admin ${adminId}: ${count}`);
    
  } catch (error) {
    console.error('❌ Error creating test invoices:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

createTestInvoicesForAdmin();