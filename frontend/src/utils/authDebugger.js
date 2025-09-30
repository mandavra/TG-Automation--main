// Simple auth debugger for the frontend
export const debugAuth = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  const adminId = localStorage.getItem('adminId');
  
  console.log('🔍 Auth Debug:', {
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    tokenPreview: token ? `${token.substring(0, 10)}...` : 'None',
    tenantId,
    adminId,
    allStorageKeys: Object.keys(localStorage)
  });
  
  return { token, tenantId, adminId };
};

// Test payment API endpoint with current auth
export const testPaymentAPI = async () => {
  const { token, tenantId } = debugAuth();
  
  if (!token) {
    console.error('❌ No auth token found');
    return false;
  }
  
  try {
    const response = await fetch('http://localhost:4000/api/payments/admin?page=1&limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId || '',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🧪 Payment API test:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API test successful:', data);
      return true;
    } else {
      const errorData = await response.text();
      console.error('❌ API test failed:', errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ API test error:', error);
    return false;
  }
};

// Run debug automatically
if (typeof window !== 'undefined') {
  // Make functions available in console
  window.debugAuth = debugAuth;
  window.testPaymentAPI = testPaymentAPI;
}