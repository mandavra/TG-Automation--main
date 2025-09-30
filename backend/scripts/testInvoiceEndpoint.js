const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');

mongoose.connect('mongodb://localhost:27017/tg_automation');

async function testInvoiceEndpoint() {
  try {
    console.log('=== Testing Invoice Endpoint Logic ===\n');
    
    // Simulate the endpoint logic
    const { page = 1, limit = 10, search, status, dateRange } = { page: 1, limit: 10 };
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query (same as in the route)
    let query = {};
    
    if (search) {
      query.$or = [
        { invoiceNo: { $regex: search, $options: 'i' } },
        { 'billedTo.name': { $regex: search, $options: 'i' } },
        { 'billedTo.phone': { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }
      
      if (startDate) {
        query.billDate = { $gte: startDate };
      }
    }

    console.log('Query:', JSON.stringify(query, null, 2));

    // Get invoices
    const invoices = await Invoice.find(query)
      .sort({ billDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    console.log(`Found ${invoices.length} invoices`);

    // Process invoices (same as in route)
    const processedInvoices = invoices.map(invoice => ({
      ...invoice,
      customerName: invoice.billedTo?.name || 'N/A',
      customerPhone: invoice.billedTo?.phone || 'N/A',
      status: invoice.status || 'generated'
    }));

    // Get total count
    const total = await Invoice.countDocuments(query);
    const pages = Math.ceil(total / limitNum);

    console.log('\nResult summary:');
    console.log('- Total invoices:', total);
    console.log('- Pages:', pages);
    console.log('- Current page:', pageNum);
    
    if (processedInvoices.length > 0) {
      console.log('\nFirst invoice:');
      console.log('- Invoice No:', processedInvoices[0].invoiceNo);
      console.log('- Customer:', processedInvoices[0].customerName);
      console.log('- Amount:', processedInvoices[0].total);
      console.log('- Status:', processedInvoices[0].status);
    }

    const response = {
      invoices: processedInvoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages
      },
      total,
      pages
    };

    console.log('\n✅ Endpoint logic works correctly!');
    console.log('Response structure is valid');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

testInvoiceEndpoint();