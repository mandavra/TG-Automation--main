// Debug Invoice Number Breakdown
console.log('🔍 Invoice Number Analysis');
console.log('=========================\n');

function parseInvoiceNumber(invoiceNumber) {
  const match = invoiceNumber.match(/^INV-(\d{4})([a-zA-Z0-9]{3})([a-zA-Z0-9]{3})(\d{5})$/);

  if (!match) {
    return { valid: false, error: 'Invalid format' };
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

function getLastThreeDigits(id) {
  if (!id) return '000';
  const idStr = id.toString();
  const last3 = idStr.slice(-3);
  return last3.padStart(3, '0');
}

// Analyze your specific invoice number
const yourInvoice = 'INV-25267d300000001';
console.log(`📋 Analyzing Invoice: ${yourInvoice}`);
console.log('=====================================');

const parsed = parseInvoiceNumber(yourInvoice);

if (parsed.valid) {
  console.log('✅ Valid Invoice Number Format');
  console.log('');
  console.log('📊 Breakdown:');
  console.log(`   Financial Year: ${parsed.financialYear} (2025-26)`);
  console.log(`   Admin Digits: ${parsed.adminDigits}`);
  console.log(`   Channel Digits: ${parsed.channelDigits} ← This is your Channel Bundle ID part`);
  console.log(`   Counter: ${parsed.counter.toString().padStart(5, '0')}`);
  console.log('');

  // Analyze the channel digits
  if (parsed.channelDigits === '000') {
    console.log('🎯 Channel Bundle Analysis:');
    console.log('   Channel Digits: 000');
    console.log('   ✅ This means either:');
    console.log('      • No channelBundleId was provided (null/undefined)');
    console.log('      • channelBundleId ended with 000');
    console.log('      • channelBundleId was "000", "1000", "2000", etc.');
  } else {
    console.log('🎯 Channel Bundle Analysis:');
    console.log(`   Channel Digits: ${parsed.channelDigits}`);
    console.log('   ✅ This represents the last 3 digits of a Channel Bundle ID');
  }

} else {
  console.log('❌ Invalid Invoice Number Format');
  console.log(`Error: ${parsed.error}`);
}

console.log('\n🧪 Testing Channel Bundle Logic:');
console.log('================================');

const testCases = [
  { channelBundleId: null, expected: '000', scenario: 'No Channel Bundle' },
  { channelBundleId: undefined, expected: '000', scenario: 'Undefined Channel Bundle' },
  { channelBundleId: '', expected: '000', scenario: 'Empty String' },
  { channelBundleId: '507f1f77bcf86cd799439123', expected: '123', scenario: 'Normal ObjectId' },
  { channelBundleId: '507f1f77bcf86cd799439000', expected: '000', scenario: 'ObjectId ending in 000' },
  { channelBundleId: 'channel123', expected: '123', scenario: 'String ID' },
  { channelBundleId: '42', expected: '042', scenario: 'Short ID (padded)' }
];

testCases.forEach((test, index) => {
  const result = getLastThreeDigits(test.channelBundleId);
  const match = result === test.expected ? '✅' : '❌';

  console.log(`${index + 1}. ${test.scenario}:`);
  console.log(`   Input: ${test.channelBundleId}`);
  console.log(`   Expected: ${test.expected}`);
  console.log(`   Got: ${result} ${match}`);
  console.log('');
});

console.log('🔍 Your Invoice Number Explanation:');
console.log('===================================');
console.log(`Invoice: ${yourInvoice}`);
console.log('');
console.log('Position Analysis:');
console.log('INV-25267d300000001');
console.log('    ||||||||||||||||');
console.log('    |||||| |||+++++-- Counter: 00001 (1st invoice)');
console.log('    |||||| +++------- Channel: 000 (No channel bundle OR ends in 000)');
console.log('    ||||||----------- Admin: 7d3 (Admin ID ends in 7d3)');
console.log('    ||++------------- Financial Year: 2526 (2025-26)');
console.log('    ++--------------- Prefix: INV-');
console.log('');

console.log('🎯 Conclusion for your invoice:');
console.log('==============================');
console.log('✅ The "000" in position ZZZ (Channel digits) confirms:');
console.log('   • Either no channelBundleId was passed to the function');
console.log('   • Or the channelBundleId ended with digits "000"');
console.log('   • This is working correctly according to the specification');
console.log('');
console.log('📝 To get a different channel value:');
console.log('   • Pass a channelBundleId parameter when creating the invoice');
console.log('   • Example: channelBundleId = "507f1f77bcf86cd799439123"');
console.log('   • Result would be: INV-25267d312300001 (with "123" instead of "000")');