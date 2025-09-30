const axios = require('axios');

// Script to recalculate fees for existing transaction
async function recalculateFees() {
  try {
    const paymentId = '68c5559cbcca71526eff7bf1'; // Your transaction ID
    const backendUrl = 'http://localhost:4000';
    
    console.log('🔄 Recalculating fees for payment:', paymentId);
    
    // You'll need to get an admin token first
    // For now, let's just show what the API call would look like
    console.log('API Call would be:');
    console.log(`POST ${backendUrl}/api/payment/${paymentId}/recalculate-fees`);
    console.log('Headers: { Authorization: "Bearer <admin-token>" }');
    
    // If you have an admin token, uncomment this:
    /*
    const response = await axios.post(
      `${backendUrl}/api/payment/${paymentId}/recalculate-fees`,
      {},
      {
        headers: {
          'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Fee recalculation result:', response.data);
    */
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

recalculateFees();
