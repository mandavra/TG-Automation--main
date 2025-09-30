// Payment utility functions

export const calculateGSTBreakdown = (totalAmount) => {
  const gstRate = 0.18; // 18% GST
  const baseAmount = Math.round(totalAmount / (1 + gstRate));
  const gstAmount = totalAmount - baseAmount;
  return {
    baseAmount,
    gstAmount,
    gstRate,
    totalAmount
  };
};

export const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return '';
  // Remove any non-digit characters and ensure proper format
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateOnly = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getPaymentStatusConfig = (status) => {
  const configs = {
    SUCCESS: { 
      color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
      bgColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      label: 'Payment Successful',
      dotColor: 'bg-green-500'
    },
    FAILED: { 
      color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
      bgColor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      label: 'Payment Failed',
      dotColor: 'bg-red-500'
    },
    PENDING: { 
      color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      label: 'Payment Pending',
      dotColor: 'bg-yellow-500'
    },
    EXPIRED: { 
      color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400',
      bgColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      label: 'Payment Expired',
      dotColor: 'bg-gray-400'
    }
  };
  return configs[status] || configs.PENDING;
};

export const getTimelineStatusColor = (status) => {
  const colors = {
    'success': 'bg-green-500',
    'processing': 'bg-yellow-500',
    'info': 'bg-blue-500',
    'error': 'bg-red-500',
    'warning': 'bg-orange-500'
  };
  return colors[status] || 'bg-gray-400';
};

export const generateMockTimeline = (paymentData) => {
  const events = [];
  const createdAt = new Date(paymentData.createdAt);
  
  events.push({
    timestamp: paymentData.createdAt,
    event: 'Payment Link Generated',
    status: 'info',
    description: `Payment link created for ₹${paymentData.amount}`
  });

  if (paymentData.status !== 'PENDING') {
    events.push({
      timestamp: new Date(createdAt.getTime() + 1 * 60 * 1000).toISOString(),
      event: 'Payment Started',
      status: 'info',
      description: `Customer initiated payment via ${paymentData.paymentMethod || 'UPI'}`
    });

    events.push({
      timestamp: new Date(createdAt.getTime() + 2 * 60 * 1000).toISOString(),
      event: 'Payment Gateway Processing',
      status: 'processing',
      description: 'Payment being processed by payment gateway'
    });

    if (paymentData.status === 'SUCCESS') {
      events.push({
        timestamp: new Date(createdAt.getTime() + 3 * 60 * 1000).toISOString(),
        event: 'Payment Confirmed',
        status: 'success',
        description: 'Payment successfully completed and verified'
      });

      events.push({
        timestamp: new Date(createdAt.getTime() + 4 * 60 * 1000).toISOString(),
        event: 'Access Granted',
        status: 'success',
        description: 'User granted access to subscribed services'
      });
    } else if (paymentData.status === 'FAILED') {
      events.push({
        timestamp: new Date(createdAt.getTime() + 3 * 60 * 1000).toISOString(),
        event: 'Payment Failed',
        status: 'error',
        description: paymentData.failure_reason || 'Payment could not be processed'
      });
    }
  }

  return events;
};

export const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

// Standardize customer data format across components
export const standardizeCustomerData = (customerData, paymentData) => {
  if (!customerData && !paymentData) return null;
  
  // Merge customer data from different sources
  const customer = customerData || {};
  const payment = paymentData || {};
  
  return {
    // Basic Information
    firstName: customer.firstName || extractFirstName(customer.fullName || payment.customerName),
    middleName: customer.middleName || '',
    lastName: customer.lastName || extractLastName(customer.fullName || payment.customerName),
    fullName: customer.fullName || payment.customerName || `${customer.firstName || ''} ${customer.middleName || ''} ${customer.lastName || ''}`.trim(),
    email: customer.email || payment.customerEmail,
    phone: customer.phone || payment.phone,
    dob: customer.dob,
    
    // Address Information
    address: customer.address,
    city: customer.city || customer.City,
    state: customer.state || customer.State,
    pincode: customer.pincode,
    stateCode: customer.stateCode,
    
    // Identity Documents
    panNumber: customer.panNumber,
    aadharNumber: customer.aadharNumber,
    
    // KYC Information
    kycStatus: customer.kycStatus || 'Not Verified',
    kycCompletedAt: customer.kycCompletedAt,
    kycDocuments: customer.kycDocuments || [],
    
    // Telegram Information
    telegramUserId: customer.telegramUserId,
    telegramJoinStatus: customer.telegramJoinStatus,
    telegramJoinedAt: customer.telegramJoinedAt,
    
    // Additional Information
    age: customer.age || calculateAge(customer.dob),
    occupation: customer.occupation,
    income: customer.income,
    registrationSource: customer.registrationSource || 'Website',
    ipAddress: customer.ipAddress,
    deviceInfo: customer.deviceInfo,
    isEligible: customer.isEligible !== undefined ? customer.isEligible : true
  };
};

// Helper function to extract first name from full name
const extractFirstName = (fullName) => {
  if (!fullName) return '';
  return fullName.split(' ')[0] || '';
};

// Helper function to extract last name from full name
const extractLastName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

// Calculate age from date of birth
const calculateAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Standardize payment data format
export const standardizePaymentData = (paymentData) => {
  if (!paymentData) return null;
  
  const gst = calculateGSTBreakdown(paymentData.amount || 0);
  
  return {
    ...paymentData,
    // Ensure GST calculations are present
    baseAmount: paymentData.baseAmount || gst.baseAmount,
    gstAmount: paymentData.gstAmount || gst.gstAmount,
    gstRate: paymentData.gstRate || gst.gstRate,
    
    // Standardize status
    status: paymentData.status || 'PENDING',
    
    // Ensure payment method is present
    paymentMethod: paymentData.paymentMethod || 'UPI',
    
    // Standardize bundle information
    paymentBundle: paymentData.paymentBundle || paymentData.plan_name || 'Standard Package'
  };
};

// Validate required KYC fields
export const validateKYCCompleteness = (customerData) => {
  const required = ['firstName', 'lastName', 'email', 'phone', 'panNumber', 'dob', 'city', 'state'];
  const missing = [];
  
  required.forEach(field => {
    if (!customerData[field] || customerData[field].toString().trim() === '') {
      missing.push(field);
    }
  });
  
  return {
    isComplete: missing.length === 0,
    missingFields: missing,
    completionPercentage: Math.round(((required.length - missing.length) / required.length) * 100)
  };
};

// Format display names consistently
export const formatDisplayName = (firstName, middleName, lastName) => {
  const parts = [firstName, middleName, lastName].filter(Boolean);
  return parts.join(' ');
};

// Format phone number for display
export const formatPhoneDisplay = (phone) => {
  if (!phone) return 'N/A';
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    return `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
  }
  return phone;
};

// Format address for display
export const formatAddressDisplay = (address, city, state, pincode) => {
  const parts = [address, city, state, pincode].filter(Boolean);
  if (parts.length === 0) return 'N/A';
  return parts.join(', ');
};