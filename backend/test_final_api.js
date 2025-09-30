const http = require('http');

// Test the API endpoint
const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/user/check-purchase/+917020025010/68c2eb598a16ab4d15e8bc27',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('🧪 Testing the fixed API endpoint...');
console.log(`📡 URL: http://localhost:4000${options.path}`);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n✅ API Response:');
    console.log(JSON.stringify(JSON.parse(data), null, 2));
    
    const result = JSON.parse(data);
    if (result.success && result.hasPurchased) {
      console.log('\n🎉 SUCCESS: API correctly detected the user\'s existing payment!');
      console.log(`💰 Payment Amount: ₹${result.paymentDetails.amount}`);
      console.log(`📅 Purchase Date: ${new Date(result.paymentDetails.createdAt).toLocaleDateString()}`);
    } else {
      console.log('\n❌ ISSUE: API still not detecting payment correctly');
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Error connecting to server:', error.message);
  console.log('Make sure the backend server is running on port 4000');
});

req.setTimeout(5000, () => {
  console.log('\n⏰ Request timed out');
  req.destroy();
});

req.end();
