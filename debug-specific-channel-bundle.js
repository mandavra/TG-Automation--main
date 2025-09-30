// Debug Specific Channel Bundle ID
console.log('🔍 Channel Bundle ID Analysis');
console.log('=============================\n');

const channelBundleId = '68d2601a8d8d02d90ab40f51';
console.log(`Channel Bundle ID: ${channelBundleId}`);
console.log(`Length: ${channelBundleId.length} characters`);

// Test the getLastThreeDigits function
function getLastThreeDigits(id) {
  if (!id) return '000';
  const idStr = id.toString();
  const last3 = idStr.slice(-3);
  return last3.padStart(3, '0');
}

const result = getLastThreeDigits(channelBundleId);
console.log(`\nLast 3 characters: "${channelBundleId.slice(-3)}"`);
console.log(`Expected in invoice: "${result}"`);

console.log('\n🔍 Step-by-step breakdown:');
console.log('==========================');
console.log(`Original ID: ${channelBundleId}`);
console.log(`Convert to string: ${channelBundleId.toString()}`);
console.log(`Take last 3 chars: ${channelBundleId.slice(-3)}`);
console.log(`Pad with zeros: ${channelBundleId.slice(-3).padStart(3, '0')}`);

console.log('\n📊 Your Expected Invoice Number:');
console.log('================================');
console.log('If your Channel Bundle ID is: 68d2601a8d8d02d90ab40f51');
console.log('Then the last 3 digits are: f51');
console.log('Your invoice should look like: INV-25267d3f5100001');
console.log('                                      ^^^-- Channel digits');

console.log('\n❓ Your Actual Invoice vs Expected:');
console.log('===================================');
console.log('Your actual invoice: INV-25267d300000001');
console.log('Expected invoice:    INV-25267d3f5100001');
console.log('                                ^^^-- Should be "f51", not "000"');

console.log('\n🚨 ISSUE DETECTED:');
console.log('==================');
console.log('❌ The channel bundle ID was NOT properly included in your invoice number');
console.log('❌ Expected "f51" but got "000"');
console.log('');
console.log('🔍 Possible causes:');
console.log('1. channelBundleId parameter was not passed to generateInvoiceNumber()');
console.log('2. channelBundleId was null/undefined in the request');
console.log('3. There\'s an issue in the invoice generation code');
console.log('4. The channelBundleId was not properly extracted from the request body');

console.log('\n🔧 Debug Steps:');
console.log('===============');
console.log('1. Check the request body for channelBundleId parameter');
console.log('2. Verify generateInvoiceNumber() is receiving the channelBundleId');
console.log('3. Check console logs for invoice generation debug output');
console.log('4. Ensure the API call includes channelBundleId in the payload');

console.log('\n📝 What the API call should look like:');
console.log('======================================');
console.log('{');
console.log('  "billDate": "2025-09-27",');
console.log('  "userid": "...",');
console.log('  "description": "...",');
console.log(`  "channelBundleId": "${channelBundleId}"`);
console.log('}');

console.log('\n✅ Expected result with this channelBundleId:');
console.log('==============================================');
console.log('Invoice Number: INV-25267d3f5100001');
console.log('Breakdown:');
console.log('  • Financial Year: 2526');
console.log('  • Admin Digits: 7d3');
console.log('  • Channel Digits: f51 ← From your Channel Bundle ID');
console.log('  • Counter: 00001');

// Test different scenarios
console.log('\n🧪 Testing edge cases:');
console.log('======================');

const testCases = [
  null,
  undefined,
  '',
  '68d2601a8d8d02d90ab40f51',
  'channel123',
  '000'
];

testCases.forEach((testId, index) => {
  const result = getLastThreeDigits(testId);
  console.log(`${index + 1}. Input: ${testId} → Output: "${result}"`);
});