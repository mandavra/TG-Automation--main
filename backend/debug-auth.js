const jwt = require('jsonwebtoken');

// Test JWT token generation and verification
const testJWT = () => {
  const secret = process.env.ADMIN_JWT_SECRET || 'admin_jwt_secret';
  console.log('Using JWT secret:', secret);
  
  // Test data
  const testData = { id: 'test123', email: 'test@example.com', role: 'admin' };
  
  try {
    // Generate token
    const token = jwt.sign(testData, secret, { expiresIn: '7d' });
    console.log('Generated token:', token.substring(0, 50) + '...');
    
    // Verify token
    const decoded = jwt.verify(token, secret);
    console.log('Decoded token:', decoded);
    
    console.log('✅ JWT test passed!');
  } catch (error) {
    console.error('❌ JWT test failed:', error.message);
  }
};

// Test adminAuth middleware logic
const testAdminAuth = () => {
  const mockReq = {
    header: (name) => {
      if (name === 'Authorization') {
        return 'Bearer test_token_here';
      }
      return null;
    }
  };
  
  console.log('Mock request headers:', {
    Authorization: mockReq.header('Authorization'),
    hasAuthHeader: !!mockReq.header('Authorization')
  });
};

console.log('🔍 Testing JWT and Admin Auth...\n');
testJWT();
console.log('\n🔍 Testing Admin Auth logic...\n');
testAdminAuth();
console.log('\n✅ Debug complete!');
