// Frontend Configuration
const config = {
  // API Configuration
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 10000,
  },

  // App Configuration
  app: {
    name: 'Telegram Bot',
    version: '1.0.0',
    description: 'Telegram Bot with OTP verification',
  },

  // OTP Configuration
  otp: {
    length: 4,
    resendCooldown: 60, // seconds
    validity: 600, // 10 minutes in seconds
  },

  // Theme Configuration
  theme: {
    defaultMode: 'light', // 'light' or 'dark'
    enableSystemPreference: true,
  },

  // Toast Configuration
  toast: {
    position: 'top-right',
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  },

  // Local Storage Keys
  storage: {
    user: 'user',
    token: 'token',
    isAuthenticated: 'isAuthenticated',
    userPhone: 'userPhone',
    auth: 'auth',
    kycCompleted: 'kycCompleted',
    paymentCompleted: 'paymentCompleted',
  },

  // Routes
  routes: {
    home: '/',
    login: '/login',
    otp: '/otp',
    kycForm: '/kycForm',
    payment: '/payment',
    paymentSuccess: '/payment-success',
    paymentFailed: '/payment-failed',
    digio: '/digio',
    admin: {
      login: '/loginAdmin',
      dashboard: '/admin/dashboard',
      users: '/admin/users',
      addPlans: '/admin/addplans',
      viewPlans: '/admin/viewplans',
      digioErrors: '/admin/digio-errors',
    },
  },

  // Validation Rules
  validation: {
    phone: {
      minLength: 10,
      maxLength: 10,
      pattern: /^\d{10}$/,
    },
    otp: {
      length: 4,
      pattern: /^\d{4}$/,
    },
  },

  // Error Messages
  messages: {
    phone: {
      required: 'Phone number is required',
      invalid: 'Please enter a valid 10-digit mobile number',
      format: 'Phone number must be 10 digits',
    },
    otp: {
      required: 'OTP is required',
      invalid: 'Please enter a valid 4-digit OTP',
      expired: 'OTP has expired. Please request a new one',
      incorrect: 'Incorrect OTP. Please try again',
    },
    general: {
      networkError: 'Network error. Please check your connection',
      serverError: 'Server error. Please try again later',
      unknownError: 'Something went wrong. Please try again',
    },
  },
};

export default config; 