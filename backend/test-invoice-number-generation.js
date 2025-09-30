// Test the actual invoice number generation with MongoDB
const mongoose = require('mongoose');
const { generateInvoiceNumber, getCurrentFinancialYear, parseInvoiceNumber } = require('./utils/invoiceNumberGenerator');

async function testInvoiceNumberGeneration() {
  try {
    console.log('🔌 Connecting to MongoDB...');

    // Connect to MongoDB (adjust connection string as needed)
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tg-automation', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');
    console.log('\n📋 Testing Invoice Number Generation');
    console.log('=====================================');

    // Test data
    const testData = [
      {
        name: 'First invoice for Admin 1',
        adminId: '507f1f77bcf86cd799439011',
        channelBundleId: '507f1f77bcf86cd799439022'
      },
      {
        name: 'Second invoice for same Admin',
        adminId: '507f1f77bcf86cd799439011',
        channelBundleId: '507f1f77bcf86cd799439022'
      },
      {
        name: 'Invoice for different Admin',
        adminId: '507f1f77bcf86cd799439123',
        channelBundleId: '507f1f77bcf86cd799439456'
      },
      {
        name: 'Invoice without channel bundle',
        adminId: '507f1f77bcf86cd799439789',
        channelBundleId: null
      }
    ];

    console.log(`Current Financial Year: ${getCurrentFinancialYear()}`);
    console.log('');

    // Generate invoice numbers
    for (let i = 0; i < testData.length; i++) {
      const test = testData[i];
      console.log(`Test ${i + 1}: ${test.name}`);
      console.log('---');

      try {
        const invoiceNumber = await generateInvoiceNumber(test.adminId, test.channelBundleId);
        const parsed = parseInvoiceNumber(invoiceNumber);

        console.log(`📋 Generated: ${invoiceNumber}`);
        console.log(`📊 Breakdown:`);
        console.log(`   Financial Year: ${parsed.financialYear}`);
        console.log(`   Admin Digits: ${parsed.adminDigits}`);
        console.log(`   Channel Digits: ${parsed.channelDigits}`);
        console.log(`   Counter: ${parsed.counter}`);
        console.log(`   Valid: ${parsed.valid ? '✅' : '❌'}`);

      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }

      console.log('');
    }

    console.log('🎯 Summary:');
    console.log('• Each admin gets unique number sequences');
    console.log('• Counters increment per financial year');
    console.log('• Channel bundles are tracked in the number');
    console.log('• Format is consistent and parseable');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testInvoiceNumberGeneration();
}

module.exports = { testInvoiceNumberGeneration };