
// Frontend helper for multi-tenant admin context
// Add this to your frontend utils

// Get current admin context from localStorage or URL
export const getCurrentAdminContext = () => {
  // Method 1: From localStorage (after admin login)
  const adminData = localStorage.getItem('adminData');
  if (adminData) {
    try {
      const parsed = JSON.parse(adminData);
      return {
        adminId: parsed.id || parsed._id,
        adminEmail: parsed.email,
        role: parsed.role
      };
    } catch (e) {
      console.warn('Invalid admin data in localStorage');
    }
  }
  
  // Method 2: From URL parameters (for public registration)
  const urlParams = new URLSearchParams(window.location.search);
  const adminId = urlParams.get('adminId');
  if (adminId) {
    return { adminId };
  }
  
  return null;
};

// Add admin context to API calls
export const addAdminContextToRequest = (requestData = {}) => {
  const adminContext = getCurrentAdminContext();
  if (adminContext) {
    return {
      ...requestData,
      adminId: adminContext.adminId
    };
  }
  return requestData;
};

// Enhanced OTP send function with admin context
export const sendOtpWithAdminContext = async (phone) => {
  const requestBody = addAdminContextToRequest({ phone });
  
  const response = await fetch('/api/otp/send-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add admin context to headers as well
      ...(requestBody.adminId && { 'X-Admin-Id': requestBody.adminId })
    },
    body: JSON.stringify(requestBody)
  });
  
  return response.json();
};
