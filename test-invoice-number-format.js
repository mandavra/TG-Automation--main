// Test Invoice Number Generation Format
console.log('📋 Invoice Number Format Testing');
console.log('===============================\n');

// Import the utility functions (simulated for testing)
function getCurrentFinancialYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let startYear, endYear;
  if (currentMonth >= 4) {
    startYear = currentYear;
    endYear = currentYear + 1;
  } else {
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  const startYearShort = startYear.toString().slice(-2);
  const endYearShort = endYear.toString().slice(-2);
  return startYearShort + endYearShort;
}

function getLastThreeDigits(id) {
  if (!id) return '000';
  const idStr = id.toString();
  const last3 = idStr.slice(-3);
  return last3.padStart(3, '0');
}

function generateTestInvoiceNumber(adminId, channelBundleId, counter) {
  const financialYear = getCurrentFinancialYear();
  const adminDigits = getLastThreeDigits(adminId);
  const channelDigits = getLastThreeDigits(channelBundleId);
  const counterStr = counter.toString().padStart(5, '0');

  return `INV-${financialYear}${adminDigits}${channelDigits}${counterStr}`;
}

function parseInvoiceNumber(invoiceNumber) {
  const match = invoiceNumber.match(/^INV-(\d{4})(\d{3})(\d{3})(\d{5})$/);

  if (!match) {
    return { valid: false, error: 'Invalid invoice number format' };
  }

  return {
    valid: true,
    fullNumber: invoiceNumber,
    financialYear: match[1],
    adminDigits: match[2],
    channelDigits: match[3],
    counter: parseInt(match[4], 10)
  };
}

// Test scenarios
console.log('🎯 Current Financial Year:', getCurrentFinancialYear());
console.log('');

console.log('📊 Test Invoice Number Generation:');
console.log('==================================');

const testCases = [
  {
    name: 'Admin 1, Channel Bundle 1, First Invoice',
    adminId: '507f1f77bcf86cd799439011',
    channelBundleId: '507f1f77bcf86cd799439022',
    counter: 1
  },
  {
    name: 'Admin 2, Channel Bundle 2, 10th Invoice',
    adminId: '507f1f77bcf86cd799439123',
    channelBundleId: '507f1f77bcf86cd799439456',
    counter: 10
  },
  {
    name: 'Admin 3, No Channel Bundle, 1000th Invoice',
    adminId: '507f1f77bcf86cd799439789',
    channelBundleId: null,
    counter: 1000
  },
  {
    name: 'Admin 4, Channel Bundle 3, 99999th Invoice (Max)',
    adminId: '507f1f77bcf86cd799439999',
    channelBundleId: '507f1f77bcf86cd799439888',
    counter: 99999
  }
];

testCases.forEach((test, index) => {
  console.log(`\nTest Case ${index + 1}: ${test.name}`);
  console.log('---');

  const invoiceNumber = generateTestInvoiceNumber(test.adminId, test.channelBundleId, test.counter);
  const parsed = parseInvoiceNumber(invoiceNumber);

  console.log('Input Data:');
  console.log(`  Admin ID: ${test.adminId}`);
  console.log(`  Admin Last 3: ${getLastThreeDigits(test.adminId)}`);
  console.log(`  Channel Bundle ID: ${test.channelBundleId || 'None'}`);
  console.log(`  Channel Last 3: ${getLastThreeDigits(test.channelBundleId)}`);
  console.log(`  Counter: ${test.counter}`);

  console.log('Generated Invoice Number:');
  console.log(`  📋 ${invoiceNumber}`);

  console.log('Parsed Components:');
  console.log(`  Financial Year: ${parsed.financialYear}`);
  console.log(`  Admin Digits: ${parsed.adminDigits}`);
  console.log(`  Channel Digits: ${parsed.channelDigits}`);
  console.log(`  Counter: ${parsed.counter}`);
  console.log(`  Valid: ${parsed.valid ? '✅' : '❌'}`);
});

console.log('\n📋 Invoice Number Format Breakdown:');
console.log('===================================');
console.log('Format: INV-XXXXYYYZZZWWWWW');
console.log('');
console.log('Where:');
console.log('  INV-     = Fixed prefix');
console.log('  XXXX     = Financial Year (e.g., 2526 for 2025-26)');
console.log('  YYY      = Last 3 digits of Admin ID');
console.log('  ZZZ      = Last 3 digits of Channel Bundle ID (000 if none)');
console.log('  WWWWW    = Sequential counter (00001-99999, resets each FY)');
console.log('');

console.log('📅 Financial Year Logic:');
console.log('========================');
const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

console.log(`Current Date: ${currentDate.toDateString()}`);
console.log(`Current Month: ${currentMonth}`);
console.log(`Financial Year: ${getCurrentFinancialYear()}`);

if (currentMonth >= 4) {
  console.log(`  → April-March cycle: ${currentYear}-${currentYear + 1}`);
} else {
  console.log(`  → April-March cycle: ${currentYear - 1}-${currentYear}`);
}

console.log('\n✅ Implementation Benefits:');
console.log('===========================');
console.log('• Unique sequential numbering per financial year');
console.log('• Admin-specific identification for multi-tenant system');
console.log('• Channel bundle tracking for business analytics');
console.log('• Automatic reset every financial year');
console.log('• Easy parsing and validation');
console.log('• Compliant with Indian accounting standards');

console.log('\n🔄 Database Schema Required:');
console.log('============================');
console.log('Collection: InvoiceCounter');
console.log('{');
console.log('  financialYear: "2526",     // String format XXYY');
console.log('  counter: 1,                // Incremental number');
console.log('  createdAt: Date,');
console.log('  updatedAt: Date');
console.log('}');