const axios = require('axios');

async function testBundleLinkGeneration() {
  console.log('🧪 Testing Bundle-Specific Link Generation...\n');
  
  try {
    // Test bundle link generation with different plans
    const testCases = [
      {
        name: 'first-group bundle with year plan',
        userId: 'test_user_123',
        groupId: '68b18784332382f6ec9df2e4', // first-group bundle ID
        duration: 'year',
        paymentLinkId: 'test_payment_123',
        planId: 'test_plan_year'
      },
      {
        name: 'first-group bundle with month plan',
        userId: 'test_user_456',
        groupId: '68b18784332382f6ec9df2e4', // first-group bundle ID
        duration: 'month',
        paymentLinkId: 'test_payment_456',
        planId: 'test_plan_month'
      },
      {
        name: 'abcpremium bundle with week plan',
        userId: 'test_user_789',
        groupId: '68b234a2d65225563f5f6958', // abcpremium bundle ID
        duration: 'week',
        paymentLinkId: 'test_payment_789',
        planId: 'test_plan_week'
      }
    ];

    for (const testCase of testCases) {
      console.log(`🔸 Testing: ${testCase.name}`);
      console.log(`   User ID: ${testCase.userId}`);
      console.log(`   Group ID: ${testCase.groupId}`);
      console.log(`   Duration: ${testCase.duration}`);
      
      try {
        const response = await axios.post('http://localhost:4000/api/invite/channel-bundle-links', {
          userId: testCase.userId,
          groupId: testCase.groupId,
          duration: testCase.duration,
          paymentLinkId: testCase.paymentLinkId,
          planId: testCase.planId
        });
        
        if (response.data.success) {
          console.log('   ✅ Success!');
          console.log('   Primary link:', response.data.link ? 'Generated' : 'Not found');
          console.log('   Bundle info:', response.data.bundleInfo?.name);
          console.log('   Channels with links:', response.data.summary?.successCount);
          console.log('   Errors:', response.data.summary?.errorCount);
          
          if (response.data.links && response.data.links.length > 0) {
            console.log('   Sample invite link:', response.data.links[0].inviteLink?.substring(0, 50) + '...');
          }
        } else {
          console.log('   ❌ Failed:', response.data.message);
        }
        
      } catch (error) {
        console.log('   ❌ Request failed:', error.response?.data?.message || error.message);
        if (error.response?.data?.error) {
          console.log('   Error details:', error.response.data.error);
        }
      }
      
      console.log(''); // Empty line between tests
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  }
}

// Test duration conversion function separately
async function testDurationConversion() {
  console.log('🧪 Testing Duration Conversion...\n');
  
  const durations = ['5min', 'week', 'month', 'year', '30', 86400];
  
  durations.forEach(duration => {
    try {
      const { convertDurationToSeconds } = require('./services/generateOneTimeInviteLink');
      const seconds = convertDurationToSeconds(duration);
      console.log(`   ${duration} → ${seconds} seconds (${Math.round(seconds/60)} minutes, ${Math.round(seconds/3600)} hours, ${Math.round(seconds/86400)} days)`);
    } catch (error) {
      console.log(`   ${duration} → Error: ${error.message}`);
    }
  });
}

// Run tests
console.log('='.repeat(50));
console.log('BUNDLE LINK GENERATION TESTS');
console.log('='.repeat(50));

testDurationConversion()
  .then(() => testBundleLinkGeneration())
  .then(() => {
    console.log('🎉 All tests completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
